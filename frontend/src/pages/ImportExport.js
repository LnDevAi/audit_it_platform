import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudUpload,
  GetApp,
  CheckCircle,
  Error,
  Schedule
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import api from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ImportExport = () => {
  const [tabValue, setTabValue] = useState(0);
  const [imports, setImports] = useState([]);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('inventory');
  const [exportConfig, setExportConfig] = useState({
    name: '',
    type: 'inventory',
    format: 'excel'
  });

  useEffect(() => {
    loadImports();
    loadExports();
  }, []);

  const loadImports = async () => {
    try {
      const response = await api.get('/imports');
      setImports(response.data.imports);
    } catch (error) {
      toast.error('Erreur lors du chargement des imports');
    }
  };

  const loadExports = async () => {
    try {
      const response = await api.get('/exports');
      setExports(response.data.exports);
    } catch (error) {
      toast.error('Erreur lors du chargement des exports');
    }
  };

  // Configuration dropzone pour les imports
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    }
  });

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('import_type', importType);

    try {
      await api.post('/imports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Import lancé avec succès');
      setImportDialog(false);
      setSelectedFile(null);
      loadImports();
    } catch (error) {
      toast.error('Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportConfig.name) {
      toast.error('Veuillez saisir un nom pour l\'export');
      return;
    }

    setLoading(true);
    try {
      await api.post('/exports/create', exportConfig);
      toast.success('Export créé avec succès');
      setExportDialog(false);
      setExportConfig({ name: '', type: 'inventory', format: 'excel' });
      loadExports();
    } catch (error) {
      toast.error('Erreur lors de la création de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportId, filename) => {
    try {
      const response = await api.get(`/exports/${exportId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Téléchargement démarré');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (type, id) => {
    try {
      await api.delete(`/${type}s/${id}`);
      toast.success(`${type === 'import' ? 'Import' : 'Export'} supprimé`);
      
      if (type === 'import') {
        loadImports();
      } else {
        loadExports();
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'processing': return <Schedule />;
      default: return <Schedule />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Import / Export de données
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Imports" />
          <Tab label="Exports" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Gestion des imports</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadImports}
                sx={{ mr: 1 }}
              >
                Actualiser
              </Button>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setImportDialog(true)}
              >
                Nouvel import
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {imports.map((importItem) => (
              <Grid item xs={12} md={6} lg={4} key={importItem.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" noWrap>
                        {importItem.file_name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete('import', importItem.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Chip
                      label={importItem.import_type}
                      size="small"
                      sx={{ mb: 1, mr: 1 }}
                    />
                    <Chip
                      label={importItem.status}
                      color={getStatusColor(importItem.status)}
                      icon={getStatusIcon(importItem.status)}
                      size="small"
                      sx={{ mb: 2 }}
                    />

                    {importItem.status === 'processing' && (
                      <Box sx={{ mb: 2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={importItem.total_records > 0 ? (importItem.processed_records / importItem.total_records) * 100 : 0}
                        />
                        <Typography variant="caption" color="textSecondary">
                          {importItem.processed_records} / {importItem.total_records} enregistrements
                        </Typography>
                      </Box>
                    )}

                    {importItem.status === 'completed' && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="success.main">
                          ✓ {importItem.success_records} importés avec succès
                        </Typography>
                        {importItem.error_records > 0 && (
                          <Typography variant="body2" color="error.main">
                            ✗ {importItem.error_records} erreurs
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Typography variant="caption" color="textSecondary">
                      {new Date(importItem.created_at).toLocaleString('fr-FR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Gestion des exports</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadExports}
                sx={{ mr: 1 }}
              >
                Actualiser
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialog(true)}
              >
                Nouvel export
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Taille</TableCell>
                  <TableCell>Créé le</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exports.map((exportItem) => (
                  <TableRow key={exportItem.id}>
                    <TableCell>{exportItem.export_name}</TableCell>
                    <TableCell>
                      <Chip label={exportItem.export_type} size="small" />
                    </TableCell>
                    <TableCell>{exportItem.file_format.toUpperCase()}</TableCell>
                    <TableCell>
                      <Chip
                        label={exportItem.status}
                        color={getStatusColor(exportItem.status)}
                        icon={getStatusIcon(exportItem.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {exportItem.file_size ? `${(exportItem.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(exportItem.created_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {exportItem.status === 'completed' && (
                          <Tooltip title="Télécharger">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(exportItem.id, `${exportItem.export_name}.${exportItem.file_format}`)}
                            >
                              <GetApp />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete('export', exportItem.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Dialog Import */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Importer des données</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type de données</InputLabel>
              <Select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
                label="Type de données"
              >
                <MenuItem value="inventory">Inventaire</MenuItem>
                <MenuItem value="network_devices">Équipements réseau</MenuItem>
                <MenuItem value="vulnerabilities">Vulnérabilités</MenuItem>
                <MenuItem value="users">Utilisateurs</MenuItem>
                <MenuItem value="missions">Missions</MenuItem>
              </Select>
            </FormControl>

            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer'
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {selectedFile ? selectedFile.name : 'Glissez-déposez un fichier ici'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Formats supportés: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
              </Typography>
            </Paper>

            {selectedFile && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Annuler</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedFile || loading}
          >
            {loading ? 'Import en cours...' : 'Importer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Export */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter des données</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nom de l'export"
            value={exportConfig.name}
            onChange={(e) => setExportConfig({ ...exportConfig, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type de données</InputLabel>
            <Select
              value={exportConfig.type}
              onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              label="Type de données"
            >
              <MenuItem value="inventory">Inventaire</MenuItem>
              <MenuItem value="missions">Missions</MenuItem>
              <MenuItem value="vulnerabilities">Vulnérabilités</MenuItem>
              <MenuItem value="reports">Rapports</MenuItem>
              <MenuItem value="full_audit">Audit complet</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Format de fichier</InputLabel>
            <Select
              value={exportConfig.format}
              onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
              label="Format de fichier"
            >
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="csv">CSV (.csv)</MenuItem>
              <MenuItem value="json">JSON (.json)</MenuItem>
              <MenuItem value="pdf">PDF (.pdf)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Annuler</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer l\'export'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportExport;
