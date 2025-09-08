import React, { useState, useEffect } from 'react';
import { missionsAPI } from '../services/api';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Missions = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning'
  });

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les vraies missions depuis l'API
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await missionsAPI.getMissions();
        setMissions(response.data);
      } catch (error) {
        console.error('Erreur chargement missions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'planning': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'planning': return 'Planifiée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const handleMenuClick = (event, mission) => {
    setAnchorEl(event.currentTarget);
    setSelectedMission(mission);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMission(null);
  };

  const handleView = () => {
    if (selectedMission) {
      navigate(`/missions/${selectedMission.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedMission) {
      setFormData({
        name: selectedMission.name,
        client_name: selectedMission.client_name,
        description: selectedMission.description,
        start_date: selectedMission.start_date,
        end_date: selectedMission.end_date,
        status: selectedMission.status
      });
      setDialogMode('edit');
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    // Logique de suppression
    console.log('Delete mission:', selectedMission.id);
    handleMenuClose();
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      client_name: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'planning'
    });
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedMission(null);
  };

  const handleSubmit = () => {
    // Logique de création/modification
    console.log('Submit:', dialogMode, formData);
    handleDialogClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          📋 Missions d'audit
        </Typography>
        {hasPermission('mission_management') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ borderRadius: 2 }}
          >
            Nouvelle mission
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {missions.map((mission) => (
          <Grid item xs={12} md={6} lg={4} key={mission.id}>
            <Card sx={{ height: '100%', position: 'relative' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <AssignmentIcon sx={{ fontSize: 40, color: '#667eea' }} />
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, mission)}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {mission.name}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {mission.client_name}
                </Typography>

                <Typography variant="body2" sx={{ mb: 3, height: 40, overflow: 'hidden' }}>
                  {mission.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progression
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {mission.progress_percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={mission.progress_percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={getStatusLabel(mission.status)}
                    color={getStatusColor(mission.status)}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Phase {mission.current_phase}/5
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {mission.sites_count} site(s)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(mission.start_date).toLocaleDateString('fr-FR')} - {new Date(mission.end_date).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} />
          Voir détails
        </MenuItem>
        {hasPermission('mission_management') && (
          <>
            <MenuItem onClick={handleEdit}>
              <EditIcon sx={{ mr: 1 }} />
              Modifier
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Supprimer
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer une nouvelle mission' : 'Modifier la mission'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom de la mission"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du client"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Date de fin"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.status}
                  label="Statut"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="planning">Planifiée</MenuItem>
                  <MenuItem value="in_progress">En cours</MenuItem>
                  <MenuItem value="completed">Terminée</MenuItem>
                  <MenuItem value="cancelled">Annulée</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogMode === 'create' ? 'Créer' : 'Modifier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Missions;
