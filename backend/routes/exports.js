const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { DataExport, Organization, User, AuditMission, InventoryItem, Vulnerability } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

/**
 * @route POST /api/exports/create
 * @desc Créer un export de données
 * @access Private
 */
router.post('/create', authenticateToken, requirePermission('export'), async (req, res) => {
  try {
    const { export_name, export_type, file_format, filters } = req.body;

    if (!export_name || !export_type || !file_format) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }

    // Créer l'enregistrement d'export
    const dataExport = await DataExport.create({
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      export_name,
      export_type,
      file_format,
      filters: filters || {},
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
    });

    // Traitement asynchrone de l'export via queue
    const queueService = require('../services/queueService');
    await queueService.addExportJob(dataExport.id, 'normal');

    res.status(201).json({
      message: 'Export créé avec succès, génération en cours',
      export_id: dataExport.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erreur création export:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'export' });
  }
});

/**
 * @route GET /api/exports
 * @desc Liste des exports de l'organisation
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, export_type } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.user.organization_id };
    if (status) where.status = status;
    if (export_type) where.export_type = export_type;

    const exports = await DataExport.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      exports: exports.rows,
      total: exports.count,
      page: parseInt(page),
      totalPages: Math.ceil(exports.count / limit)
    });

  } catch (error) {
    console.error('Erreur récupération exports:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des exports' });
  }
});

/**
 * @route GET /api/exports/:id/download
 * @desc Télécharger un fichier d'export
 * @access Private
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const dataExport = await DataExport.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      }
    });

    if (!dataExport) {
      return res.status(404).json({ message: 'Export non trouvé' });
    }

    if (!dataExport.canDownload()) {
      return res.status(400).json({ message: 'Export non disponible ou expiré' });
    }

    if (!fs.existsSync(dataExport.file_path)) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Incrémenter le compteur de téléchargements
    await dataExport.increment('download_count');

    // Définir les headers pour le téléchargement
    const filename = `${dataExport.export_name}.${getFileExtension(dataExport.file_format)}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', getContentType(dataExport.file_format));

    // Envoyer le fichier
    res.sendFile(path.resolve(dataExport.file_path));

  } catch (error) {
    console.error('Erreur téléchargement export:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement' });
  }
});

/**
 * @route DELETE /api/exports/:id
 * @desc Supprimer un export
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const dataExport = await DataExport.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      }
    });

    if (!dataExport) {
      return res.status(404).json({ message: 'Export non trouvé' });
    }

    // Supprimer le fichier
    if (dataExport.file_path && fs.existsSync(dataExport.file_path)) {
      fs.unlinkSync(dataExport.file_path);
    }

    await dataExport.destroy();

    res.json({ message: 'Export supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression export:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'export' });
  }
});

// Fonction de traitement asynchrone des exports
async function processExportFile(exportId) {
  try {
    const dataExport = await DataExport.findByPk(exportId);
    if (!dataExport) return;

    await dataExport.update({ status: 'processing' });

    // Récupérer les données selon le type d'export
    const data = await getExportData(dataExport);

    // Générer le fichier selon le format
    const filePath = await generateExportFile(dataExport, data);

    const fileStats = fs.statSync(filePath);

    await dataExport.update({
      status: 'completed',
      file_path: filePath,
      file_size: fileStats.size
    });

  } catch (error) {
    console.error('Erreur traitement export:', error);
    await DataExport.findByPk(exportId).then(exp => {
      if (exp) {
        exp.update({ status: 'failed' });
      }
    });
  }
}

// Récupération des données selon le type d'export
async function getExportData(dataExport) {
  const { organization_id, export_type, filters } = dataExport;

  switch (export_type) {
    case 'inventory':
      return await InventoryItem.findAll({
        where: { organization_id },
        include: ['site']
      });

    case 'missions':
      return await AuditMission.findAll({
        where: { organization_id },
        include: ['creator', 'sites']
      });

    case 'vulnerabilities':
      return await Vulnerability.findAll({
        where: { organization_id },
        include: ['site', 'device']
      });

    case 'full_audit':
      return {
        missions: await AuditMission.findAll({ where: { organization_id } }),
        inventory: await InventoryItem.findAll({ where: { organization_id } }),
        vulnerabilities: await Vulnerability.findAll({ where: { organization_id } })
      };

    default:
      throw new Error(`Type d'export non supporté: ${export_type}`);
  }
}

// Génération du fichier d'export
async function generateExportFile(dataExport, data) {
  const exportDir = path.join(__dirname, '../uploads/exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filename = `export-${dataExport.id}-${Date.now()}`;
  const filePath = path.join(exportDir, `${filename}.${getFileExtension(dataExport.file_format)}`);

  switch (dataExport.file_format) {
    case 'excel':
      await generateExcelFile(filePath, dataExport, data);
      break;
    case 'csv':
      await generateCSVFile(filePath, dataExport, data);
      break;
    case 'json':
      await generateJSONFile(filePath, dataExport, data);
      break;
    case 'pdf':
      await generatePDFFile(filePath, dataExport, data);
      break;
    default:
      throw new Error(`Format non supporté: ${dataExport.file_format}`);
  }

  return filePath;
}

// Génération Excel
async function generateExcelFile(filePath, dataExport, data) {
  const workbook = XLSX.utils.book_new();

  if (dataExport.export_type === 'full_audit') {
    // Export complet avec plusieurs feuilles
    Object.keys(data).forEach(key => {
      const worksheet = XLSX.utils.json_to_sheet(data[key]);
      XLSX.utils.book_append_sheet(workbook, worksheet, key);
    });
  } else {
    // Export simple avec une feuille
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, dataExport.export_type);
  }

  XLSX.writeFile(workbook, filePath);
}

// Génération CSV
async function generateCSVFile(filePath, dataExport, data) {
  if (dataExport.export_type === 'full_audit') {
    // Pour un export complet, on combine toutes les données
    const combinedData = Object.values(data).flat();
    const worksheet = XLSX.utils.json_to_sheet(combinedData);
    XLSX.writeFile({ Sheets: { data: worksheet }, SheetNames: ['data'] }, filePath.replace('.csv', '.xlsx'));
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.writeFile({ Sheets: { data: worksheet }, SheetNames: ['data'] }, filePath.replace('.csv', '.xlsx'));
  }
}

// Génération JSON
async function generateJSONFile(filePath, dataExport, data) {
  const jsonData = {
    export_info: {
      name: dataExport.export_name,
      type: dataExport.export_type,
      created_at: dataExport.created_at,
      organization_id: dataExport.organization_id
    },
    data: data
  };

  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
}

// Génération PDF
async function generatePDFFile(filePath, dataExport, data) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  // En-tête
  doc.fontSize(20).text(`Export: ${dataExport.export_name}`, 50, 50);
  doc.fontSize(12).text(`Type: ${dataExport.export_type}`, 50, 80);
  doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 100);

  let yPosition = 140;

  if (dataExport.export_type === 'full_audit') {
    Object.keys(data).forEach(key => {
      doc.fontSize(16).text(key.toUpperCase(), 50, yPosition);
      yPosition += 30;
      
      data[key].slice(0, 10).forEach(item => {
        doc.fontSize(10).text(JSON.stringify(item, null, 2), 50, yPosition);
        yPosition += 20;
      });
      
      yPosition += 20;
    });
  } else {
    data.slice(0, 20).forEach(item => {
      doc.fontSize(10).text(JSON.stringify(item, null, 2), 50, yPosition);
      yPosition += 30;
    });
  }

  doc.end();
}

// Fonctions utilitaires
function getFileExtension(format) {
  const extensions = {
    excel: 'xlsx',
    csv: 'csv',
    json: 'json',
    pdf: 'pdf',
    word: 'docx'
  };
  return extensions[format] || 'txt';
}

function getContentType(format) {
  const contentTypes = {
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    json: 'application/json',
    pdf: 'application/pdf',
    word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return contentTypes[format] || 'application/octet-stream';
}

module.exports = router;
