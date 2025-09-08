import React, { useState, useEffect } from 'react';
import { missionsAPI } from '../services/api';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Button,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Security as SecurityIcon,
  NetworkCheck as NetworkIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';

const MissionDetail = () => {
  const { id } = useParams();
  const [tabValue, setTabValue] = React.useState(0);

  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger les vraies données de mission depuis l'API
  useEffect(() => {
    const fetchMission = async () => {
      try {
        const response = await missionsAPI.getMission(id);
        setMission(response.data);
      } catch (error) {
        console.error('Erreur chargement mission:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMission();
    }
  }, [id]);

  const phases = [
    { id: 1, name: 'Inventaire et collecte initiale', duration: '3 jours', status: 'completed' },
    { id: 2, name: 'Entretiens avec les directions', duration: '6 jours', status: 'completed' },
    { id: 3, name: 'Tests et analyses techniques', duration: '5 jours', status: 'current' },
    { id: 4, name: 'Analyse et recommandations', duration: '4 jours', status: 'pending' },
    { id: 5, name: 'Validation et présentation', duration: '2 jours', status: 'pending' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'current': return 'primary';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'current': return 'En cours';
      case 'pending': return 'À venir';
      default: return status;
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
            <AssignmentIcon sx={{ fontSize: 60, color: '#667eea', mr: 3, mt: 1 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {mission.name}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {mission.client_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {mission.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`${new Date(mission.start_date).toLocaleDateString('fr-FR')} - ${new Date(mission.end_date).toLocaleDateString('fr-FR')}`}
                  variant="outlined"
                />
                <Chip 
                  label={`Phase ${mission.current_phase}/5`}
                  color="primary"
                />
                <Chip 
                  label={`${mission.progress_percentage}% complété`}
                  color="success"
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Progression globale
            </Typography>
            <LinearProgress
              variant="determinate"
              value={mission.progress_percentage}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable">
          <Tab label="Vue d'ensemble" />
          <Tab label="Sites" />
          <Tab label="Planning" />
          <Tab label="Équipe" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Stats */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  📊 Statistiques de la mission
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ComputerIcon sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {mission.stats.totalDevices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Équipements
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <NetworkIcon sx={{ fontSize: 40, color: '#2ecc71', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {mission.stats.networkDevices}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Réseau
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <SecurityIcon sx={{ fontSize: 40, color: '#e74c3c', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {mission.stats.vulnerabilities}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vulnérabilités
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <PeopleIcon sx={{ fontSize: 40, color: '#f39c12', mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {mission.stats.completedInterviews}/{mission.stats.totalInterviews}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Entretiens
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Mission Info */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  ℹ️ Informations mission
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Chef de mission"
                      secondary={mission.creator.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Durée"
                      secondary="30 jours"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Sites"
                      secondary={`${mission.sites.length} site(s)`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {mission.sites.map((site) => (
            <Grid item xs={12} md={6} key={site.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {site.name}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <LocationIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Ville"
                        secondary={site.city}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Point focal"
                        secondary={`${site.focal_point} - ${site.function}`}
                      />
                    </ListItem>
                  </List>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Voir détails du site
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              📅 Planning des phases
            </Typography>
            <List>
              {phases.map((phase, index) => (
                <React.Fragment key={phase.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Avatar 
                        sx={{ 
                          bgcolor: getStatusColor(phase.status) === 'success' ? '#2ecc71' : 
                                  getStatusColor(phase.status) === 'primary' ? '#667eea' : '#95a5a6',
                          width: 40,
                          height: 40
                        }}
                      >
                        {phase.id}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={phase.name}
                      secondary={phase.duration}
                    />
                    <Chip 
                      label={getStatusLabel(phase.status)}
                      color={getStatusColor(phase.status)}
                      size="small"
                    />
                  </ListItem>
                  {index < phases.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              👥 Équipe de mission
            </Typography>
            <Grid container spacing={2}>
              {[
                { name: 'Lassané NACOULMA', role: 'Chef de Mission', email: 'l.nacoulma@e-defence.bf' },
                { name: 'Abdoul Razak TASSEMBEDO', role: 'Consultant Senior', email: 'a.tassembedo@e-defence.bf' },
                { name: 'Ismaël OUEDRAOGO', role: 'Consultant', email: 'i.ouedraogo@e-defence.bf' }
              ].map((member, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar 
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          mx: 'auto', 
                          mb: 2,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {member.role}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.email}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MissionDetail;
