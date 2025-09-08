import React, { useState, useEffect } from 'react';
import { missionsAPI } from '../services/api';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import {
  Computer,
  Security,
  NetworkCheck,
  People,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDevices: 0,
    networkDevices: 0,
    vulnerabilities: 0,
    completedInterviews: 0,
    totalInterviews: 0,
    progressPercentage: 0,
    currentPhase: 1,
  });
  const [loading, setLoading] = useState(true);

  // Charger les vraies données depuis l'API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await missionsAPI.getDashboardStats();
        setStats(response.data);
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const vulnerabilityData = [
    { name: 'Critiques', value: 2, color: '#e74c3c' },
    { name: 'Élevées', value: 3, color: '#f39c12' },
    { name: 'Moyennes', value: 2, color: '#f1c40f' },
    { name: 'Faibles', value: 1, color: '#2ecc71' },
  ];

  const progressData = [
    { phase: 'Phase 1', progress: 100 },
    { phase: 'Phase 2', progress: 85 },
    { phase: 'Phase 3', progress: 60 },
    { phase: 'Phase 4', progress: 20 },
    { phase: 'Phase 5', progress: 0 },
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Scan de vulnérabilités terminé',
      user: 'A. Tassembedo',
      time: 'Il y a 2h',
      type: 'scan',
    },
    {
      id: 2,
      action: 'Entretien avec le DSI complété',
      user: 'L. Nacoulma',
      time: 'Il y a 4h',
      type: 'interview',
    },
    {
      id: 3,
      action: 'Inventaire mis à jour',
      user: 'I. Ouedraogo',
      time: 'Il y a 6h',
      type: 'inventory',
    },
  ];

  const getPhaseStatus = (phase) => {
    if (phase < stats.currentPhase) return 'completed';
    if (phase === stats.currentPhase) return 'current';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'current': return 'primary';
      default: return 'default';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'scan': return <Security color="primary" />;
      case 'interview': return <People color="secondary" />;
      case 'inventory': return <Computer color="info" />;
      default: return <CheckCircle />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        📊 Dashboard - Mission ABI
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Computer sx={{ fontSize: 40, color: '#667eea', mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.totalDevices}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Équipements inventoriés
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkCheck sx={{ fontSize: 40, color: '#2ecc71', mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.networkDevices}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Équipements réseau
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={70} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ fontSize: 40, color: '#e74c3c', mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.vulnerabilities}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vulnérabilités trouvées
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={40} 
                color="error"
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People sx={{ fontSize: 40, color: '#f39c12', mr: 2 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.completedInterviews}/{stats.totalInterviews}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entretiens réalisés
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(stats.completedInterviews / stats.totalInterviews) * 100} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Progress Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📈 Progression par phase
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="progress" fill="#667eea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Vulnerabilities Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                🔍 Répartition des vulnérabilités
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vulnerabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vulnerabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {vulnerabilityData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: item.color, 
                        borderRadius: '50%', 
                        mr: 1 
                      }} 
                    />
                    <Typography variant="body2">
                      {item.name}: {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📅 Planning de mission
              </Typography>
              <List>
                {[
                  { phase: 1, title: 'Inventaire et collecte', status: 'completed' },
                  { phase: 2, title: 'Entretiens directions', status: 'completed' },
                  { phase: 3, title: 'Tests techniques', status: 'current' },
                  { phase: 4, title: 'Analyse et recommandations', status: 'pending' },
                  { phase: 5, title: 'Validation et présentation', status: 'pending' },
                ].map((item) => (
                  <ListItem key={item.phase}>
                    <ListItemIcon>
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: getStatusColor(item.status) === 'success' ? '#2ecc71' : 
                                  getStatusColor(item.status) === 'primary' ? '#667eea' : '#95a5a6',
                          fontSize: '0.8rem'
                        }}
                      >
                        {item.phase}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.title}
                      secondary={`Phase ${item.phase}`}
                    />
                    <Chip 
                      label={
                        item.status === 'completed' ? 'Terminé' :
                        item.status === 'current' ? 'En cours' : 'À venir'
                      }
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                🔔 Activités récentes
              </Typography>
              <List>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.action}
                      secondary={`${activity.user} • ${activity.time}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
