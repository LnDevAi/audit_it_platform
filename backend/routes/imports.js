const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const { DataImport, Organization, User } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Configuration multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/imports');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv', '.json'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Formats acceptés: Excel, CSV, JSON'));
    }
  }
});

/**
 * @route POST /api/imports/upload
 * @desc Upload et traitement d'un fichier d'import
 * @access Private
 */
router.post('/upload', authenticateToken, requirePermission('edit'), upload.single('file'), async (req, res) => {
  try {
    const { import_type, mapping_config } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    if (!import_type) {
      return res.status(400).json({ message: 'Type d\'import requis' });
    }

    // Déterminer le type de fichier
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let file_type;
    switch (fileExt) {
      case '.xlsx':
      case '.xls':
        file_type = 'excel';
        break;
      case '.csv':
        file_type = 'csv';
        break;
      case '.json':
        file_type = 'json';
        break;
      default:
        file_type = 'excel';
    }

    // Créer l'enregistrement d'import
    const dataImport = await DataImport.create({
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type,
      import_type,
      mapping_config: mapping_config ? JSON.parse(mapping_config) : null,
      status: 'pending'
    });

    // Traitement asynchrone du fichier via queue
    const queueService = require('../services/queueService');
    await queueService.addImportJob(dataImport.id, 'normal');

    res.status(201).json({
      message: 'Fichier uploadé avec succès, traitement en cours',
      import_id: dataImport.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erreur upload import:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload du fichier' });
  }
});

/**
 * @route GET /api/imports
 * @desc Liste des imports de l'organisation
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, import_type } = req.query;
    const offset = (page - 1) * limit;

    const where = { organization_id: req.user.organization_id };
    if (status) where.status = status;
    if (import_type) where.import_type = import_type;

    const imports = await DataImport.findAndCountAll({
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
      imports: imports.rows,
      total: imports.count,
      page: parseInt(page),
      totalPages: Math.ceil(imports.count / limit)
    });

  } catch (error) {
    console.error('Erreur récupération imports:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des imports' });
  }
});

/**
 * @route GET /api/imports/:id
 * @desc Détails d'un import
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dataImport = await DataImport.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!dataImport) {
      return res.status(404).json({ message: 'Import non trouvé' });
    }

    res.json(dataImport);

  } catch (error) {
    console.error('Erreur récupération import:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'import' });
  }
});

/**
 * @route DELETE /api/imports/:id
 * @desc Supprimer un import
 * @access Private
 */
router.delete('/:id', authenticateToken, requirePermission('admin'), async (req, res) => {
  try {
    const dataImport = await DataImport.findOne({
      where: {
        id: req.params.id,
        organization_id: req.user.organization_id
      }
    });

    if (!dataImport) {
      return res.status(404).json({ message: 'Import non trouvé' });
    }

    // Supprimer le fichier
    if (fs.existsSync(dataImport.file_path)) {
      fs.unlinkSync(dataImport.file_path);
    }

    await dataImport.destroy();

    res.json({ message: 'Import supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression import:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'import' });
  }
});

// Fonction de traitement asynchrone des fichiers
async function processImportFile(importId) {
  try {
    const dataImport = await DataImport.findByPk(importId);
    if (!dataImport) return;

    await dataImport.update({ status: 'processing' });

    let data = [];
    
    // Lecture du fichier selon son type
    switch (dataImport.file_type) {
      case 'excel':
        data = await readExcelFile(dataImport.file_path);
        break;
      case 'csv':
        data = await readCSVFile(dataImport.file_path);
        break;
      case 'json':
        data = await readJSONFile(dataImport.file_path);
        break;
    }

    await dataImport.update({ 
      total_records: data.length,
      processed_records: 0,
      success_records: 0,
      error_records: 0
    });

    // Traitement des données selon le type d'import
    const results = await processImportData(dataImport, data);

    await dataImport.update({
      status: 'completed',
      processed_records: results.processed,
      success_records: results.success,
      error_records: results.errors,
      error_log: results.errorLog
    });

  } catch (error) {
    console.error('Erreur traitement import:', error);
    await DataImport.findByPk(importId).then(imp => {
      if (imp) {
        imp.update({
          status: 'failed',
          error_log: error.message
        });
      }
    });
  }
}

// Fonctions de lecture de fichiers
async function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

async function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function readJSONFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

// Fonction de traitement des données
async function processImportData(dataImport, data) {
  const results = {
    processed: 0,
    success: 0,
    errors: 0,
    errorLog: []
  };

  for (const row of data) {
    try {
      results.processed++;
      
      // Traitement selon le type d'import
      switch (dataImport.import_type) {
        case 'inventory':
          await processInventoryRow(dataImport.organization_id, row);
          break;
        case 'network_devices':
          await processNetworkDeviceRow(dataImport.organization_id, row);
          break;
        case 'vulnerabilities':
          await processVulnerabilityRow(dataImport.organization_id, row);
          break;
        default:
          throw new Error(`Type d'import non supporté: ${dataImport.import_type}`);
      }
      
      results.success++;
      
    } catch (error) {
      results.errors++;
      results.errorLog.push(`Ligne ${results.processed}: ${error.message}`);
    }
  }

  return {
    ...results,
    errorLog: results.errorLog.join('\n')
  };
}

// Fonctions de traitement par type
async function processInventoryRow(organizationId, row) {
  const { InventoryItem } = require('../models');
  
  // Mapping des colonnes (à adapter selon le fichier)
  const inventoryData = {
    organization_id: organizationId,
    category: row.category || row.Category || 'other',
    brand: row.brand || row.Brand || row.Marque,
    model: row.model || row.Model || row.Modèle,
    serial_number: row.serial_number || row['Serial Number'] || row['Numéro de série'],
    asset_tag: row.asset_tag || row['Asset Tag'] || row['Tag Asset'],
    location: row.location || row.Location || row.Localisation,
    status: row.status || row.Status || row.Statut || 'active'
  };

  await InventoryItem.create(inventoryData);
}

async function processNetworkDeviceRow(organizationId, row) {
  const { NetworkDevice } = require('../models');
  
  const deviceData = {
    organization_id: organizationId,
    ip_address: row.ip_address || row.IP || row['Adresse IP'],
    hostname: row.hostname || row.Hostname || row['Nom d\'hôte'],
    device_type: row.device_type || row.Type || 'unknown',
    manufacturer: row.manufacturer || row.Manufacturer || row.Fabricant,
    status: row.status || row.Status || 'unknown'
  };

  await NetworkDevice.create(deviceData);
}

async function processVulnerabilityRow(organizationId, row) {
  const { Vulnerability } = require('../models');
  
  const vulnData = {
    organization_id: organizationId,
    title: row.title || row.Title || row.Titre,
    description: row.description || row.Description,
    severity: row.severity || row.Severity || row.Sévérité || 'medium',
    cvss_score: parseFloat(row.cvss_score || row.CVSS || 0),
    category: row.category || row.Category || row.Catégorie || 'other',
    status: row.status || row.Status || 'open'
  };

  await Vulnerability.create(vulnData);
}

module.exports = router;
