import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Payment as PaymentIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  TrendingUp,
  AccountBalance,
  Security
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [orgDialog, setOrgDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    email: '',
    subscription_plan: 'trial'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrganizations(),
        loadSubscriptionPlans(),
        loadCurrentOrganization(),
        loadStats()
      ]);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    if (user?.role === 'super_admin') {
      try {
        const response = await api.get('/organizations');
        setOrganizations(response.data.organizations);
      } catch (error) {
        console.error('Erreur chargement organisations:', error);
      }
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const response = await api.get('/organizations/plans');
      setSubscriptionPlans(response.data);
    } catch (error) {
      console.error('Erreur chargement plans:', error);
    }
  };

  const loadCurrentOrganization = async () => {
    try {
      const response = await api.get('/organizations/current');
      setCurrentOrg(response.data.organization);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erreur chargement organisation courante:', error);
    }
  };

  const loadStats = async () => {
    if (user?.role === 'super_admin') {
      try {
        // Charger les statistiques globales pour super admin
        const globalStats = {
          totalOrganizations: organizations.length,
          activeSubscriptions: organizations.filter(org => org.subscription_status === 'active').length,
          totalRevenue: organizations.reduce((sum, org) => {
            const plan = subscriptionPlans.find(p => p.slug === org.subscription_plan);
            return sum + (plan ? plan.price_monthly : 0);
          }, 0)
        };
        setStats(prev => ({ ...prev, global: globalStats }));
      } catch (error) {
        console.error('Erreur chargement stats globales:', error);
      }
    }
  };

  const handleCreateOrganization = async () => {
    try {
      await api.post('/organizations', orgForm);
      toast.success('Organisation créée avec succès');
      setOrgDialog(false);
      setOrgForm({ name: '', slug: '', email: '', subscription_plan: 'trial' });
      loadOrganizations();
    } catch (error) {
      toast.error('Erreur lors de la création de l\'organisation');
    }
  };

  const handleUpdateSubscription = async (orgId, subscriptionData) => {
    try {
      await api.put(`/organizations/${orgId}/subscription`, subscriptionData);
      toast.success('Abonnement mis à jour');
      loadOrganizations();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour de l\'abonnement');
    }
  };

  const getSubscriptionColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'trial': return 'default';
      case 'basic': return 'primary';
      case 'professional': return 'secondary';
      case 'enterprise': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {user?.role === 'super_admin' ? 'Administration SaaS' : 'Administration Organisation'}
      </Typography>

      {/* Statistiques générales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {user?.role === 'super_admin' && stats.global && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.global.totalOrganizations}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Organisations
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.global.activeSubscriptions}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Abonnements actifs
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountBalance sx={{ mr: 2, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h4">{formatCurrency(stats.global.totalRevenue)}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Revenus mensuels
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
        
        {currentOrg && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon sx={{ mr: 2, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.users?.total || 0}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Utilisateurs
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AssessmentIcon sx={{ mr: 2, color: 'secondary.main' }} />
                    <Box>
                      <Typography variant="h4">{stats.missions?.total || 0}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Missions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          {user?.role === 'super_admin' && <Tab label="Organisations" />}
          <Tab label="Mon Organisation" />
          <Tab label="Plans d'abonnement" />
          {user?.role === 'super_admin' && <Tab label="Facturation" />}
        </Tabs>

        {/* Onglet Organisations (Super Admin uniquement) */}
        {user?.role === 'super_admin' && (
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Gestion des organisations</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOrgDialog(true)}
              >
                Nouvelle organisation
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Organisation</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Utilisateurs</TableCell>
                    <TableCell>Fin d'abonnement</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{org.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {org.slug}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{org.contact_person}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {org.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={org.subscription_plan}
                          color={getPlanColor(org.subscription_plan)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={org.subscription_status}
                          color={getSubscriptionColor(org.subscription_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {org.users?.length || 0} / {org.max_users}
                      </TableCell>
                      <TableCell>
                        {org.subscription_end_date ? 
                          new Date(org.subscription_end_date).toLocaleDateString('fr-FR') : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Voir détails">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modifier">
                          <IconButton size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        )}

        {/* Onglet Mon Organisation */}
        <TabPanel value={tabValue} index={user?.role === 'super_admin' ? 1 : 0}>
          {currentOrg && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Informations générales
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Nom</Typography>
                      <Typography variant="body2">{currentOrg.name}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Email</Typography>
                      <Typography variant="body2">{currentOrg.email}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Contact</Typography>
                      <Typography variant="body2">{currentOrg.contact_person}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Adresse</Typography>
                      <Typography variant="body2">{currentOrg.address}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Abonnement
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Plan actuel</Typography>
                      <Chip
                        label={currentOrg.subscription_plan}
                        color={getPlanColor(currentOrg.subscription_plan)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Statut</Typography>
                      <Chip
                        label={currentOrg.subscription_status}
                        color={getSubscriptionColor(currentOrg.subscription_status)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Fin d'abonnement</Typography>
                      <Typography variant="body2">
                        {currentOrg.subscription_end_date ? 
                          new Date(currentOrg.subscription_end_date).toLocaleDateString('fr-FR') : 
                          'Non définie'
                        }
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Limites</Typography>
                      <Typography variant="body2">
                        Utilisateurs: {stats.users?.total || 0} / {currentOrg.max_users}
                      </Typography>
                      <Typography variant="body2">
                        Missions: {stats.missions?.total || 0} / {currentOrg.max_missions}
                      </Typography>
                      <Typography variant="body2">
                        Stockage: {currentOrg.max_storage_gb} GB
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Onglet Plans d'abonnement */}
        <TabPanel value={tabValue} index={user?.role === 'super_admin' ? 2 : 1}>
          <Typography variant="h6" gutterBottom>
            Plans d'abonnement disponibles
          </Typography>
          <Grid container spacing={3}>
            {subscriptionPlans.map((plan) => (
              <Grid item xs={12} md={6} lg={3} key={plan.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="h4" color="primary" gutterBottom>
                      {formatCurrency(plan.price_monthly)}
                      <Typography variant="caption">/mois</Typography>
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {plan.description}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">• {plan.max_users} utilisateurs</Typography>
                      <Typography variant="body2">• {plan.max_missions} missions</Typography>
                      <Typography variant="body2">• {plan.max_storage_gb} GB stockage</Typography>
                    </Box>
                    {currentOrg?.subscription_plan === plan.slug && (
                      <Chip label="Plan actuel" color="success" size="small" />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Onglet Facturation (Super Admin uniquement) */}
        {user?.role === 'super_admin' && (
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Gestion de la facturation
            </Typography>
            <Alert severity="info">
              Module de facturation en développement. 
              Intégration prévue avec les systèmes de paiement locaux (Mobile Money, banques).
            </Alert>
          </TabPanel>
        )}
      </Paper>

      {/* Dialog Nouvelle Organisation */}
      <Dialog open={orgDialog} onClose={() => setOrgDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une nouvelle organisation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nom de l'organisation"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Slug (identifiant unique)"
            value={orgForm.slug}
            onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            sx={{ mb: 2 }}
            helperText="Utilisé dans l'URL, uniquement lettres minuscules, chiffres et tirets"
          />
          <TextField
            fullWidth
            label="Email de contact"
            type="email"
            value={orgForm.email}
            onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Plan d'abonnement</InputLabel>
            <Select
              value={orgForm.subscription_plan}
              onChange={(e) => setOrgForm({ ...orgForm, subscription_plan: e.target.value })}
              label="Plan d'abonnement"
            >
              {subscriptionPlans.map((plan) => (
                <MenuItem key={plan.slug} value={plan.slug}>
                  {plan.name} - {formatCurrency(plan.price_monthly)}/mois
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrgDialog(false)}>Annuler</Button>
          <Button
            onClick={handleCreateOrganization}
            variant="contained"
            disabled={!orgForm.name || !orgForm.slug || !orgForm.email}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
