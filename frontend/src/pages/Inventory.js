import React, { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Computer as ComputerIcon,
  Laptop as LaptopIcon,
  Tablet as TabletIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Inventory = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    asset_tag: '',
    location: '',
    user_assigned: '',
    status: 'active',
    notes: ''
  });

  const { hasPermission } = useAuth();

  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les vraies données d'inventaire depuis l'API
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await inventoryAPI.getInventoryItems();
        setInventoryItems(response.data);
      } catch (error) {
        console.error('Erreur chargement inventaire:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const stats = {
    desktop: inventoryItems.filter(item => item.category === 'desktop').length,
    laptop: inventoryItems.filter(item => item.category === 'laptop').length,
    tablet: inventoryItems.filter(item => item.category === 'tablet').length,
    printer: inventoryItems.filter(item => item.category === 'printer').length,
    total: inventoryItems.length
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'desktop': return <ComputerIcon />;
      case 'laptop': return <LaptopIcon />;
      case 'tablet': return <TabletIcon />;
      case 'printer': return <PrintIcon />;
      default: return <ComputerIcon />;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'desktop': return 'Ordinateur de bureau';
      case 'laptop': return 'Ordinateur portable';
      case 'tablet': return 'Tablette';
      case 'printer': return 'Imprimante';
      case 'server': return 'Serveur';
      case 'network_device': return 'Équipement réseau';
      default: return 'Autre';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'maintenance': return 'warning';
      case 'retired': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'maintenance': return 'Maintenance';
      case 'retired': return 'Retiré';
      default: return status;
    }
  };

  const handleCreate = () => {
    setFormData({
      category: '',
      brand: '',
      model: '',
      serial_number: '',
      asset_tag: '',
      location: '',
      user_assigned: '',
      status: 'active',
      notes: ''
    });
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleEdit = (item) => {
    setFormData({
      category: item.category,
      brand: item.brand,
      model: item.model,
      serial_number: item.serial_number,
      asset_tag: item.asset_tag,
      location: item.location,
      user_assigned: item.user_assigned,
      status: item.status,
      notes: item.notes || ''
    });
    setSelectedItem(item);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleDelete = (item) => {
    console.log('Delete item:', item.id);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const handleSubmit = () => {
    console.log('Submit:', dialogMode, formData);
    handleDialogClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = () => {
    console.log('Export inventory');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          📋 Inventaire du parc informatique
        </Typography>
        {hasPermission('export') && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Exporter
          </Button>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ComputerIcon sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.desktop}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ordinateurs de bureau
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LaptopIcon sx={{ fontSize: 40, color: '#2ecc71', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.laptop}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ordinateurs portables
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TabletIcon sx={{ fontSize: 40, color: '#f39c12', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.tablet}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tablettes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PrintIcon sx={{ fontSize: 40, color: '#e74c3c', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.printer}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Imprimantes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total équipements
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inventory Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            📝 Liste des équipements
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Marque/Modèle</TableCell>
                  <TableCell>N° Série</TableCell>
                  <TableCell>Tag Asset</TableCell>
                  <TableCell>Localisation</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getCategoryIcon(item.category)}
                        {getCategoryLabel(item.category)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.brand} {item.model}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.serial_number}</TableCell>
                    <TableCell>{item.asset_tag}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.user_assigned || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(item.status)}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {hasPermission('edit') && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(item)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(item)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Button */}
      {hasPermission('edit') && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreate}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Ajouter un équipement' : 'Modifier l\'équipement'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={formData.category}
                  label="Catégorie"
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  <MenuItem value="desktop">Ordinateur de bureau</MenuItem>
                  <MenuItem value="laptop">Ordinateur portable</MenuItem>
                  <MenuItem value="tablet">Tablette</MenuItem>
                  <MenuItem value="printer">Imprimante</MenuItem>
                  <MenuItem value="server">Serveur</MenuItem>
                  <MenuItem value="network_device">Équipement réseau</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Marque"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Modèle"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Numéro de série"
                value={formData.serial_number}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tag Asset"
                value={formData.asset_tag}
                onChange={(e) => handleInputChange('asset_tag', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Localisation"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Utilisateur assigné"
                value={formData.user_assigned}
                onChange={(e) => handleInputChange('user_assigned', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.status}
                  label="Statut"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="active">Actif</MenuItem>
                  <MenuItem value="inactive">Inactif</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="retired">Retiré</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'create' ? 'Ajouter' : 'Modifier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
