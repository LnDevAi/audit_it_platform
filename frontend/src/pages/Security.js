import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Shield,
  Firewall,
  VpnKey,
  CheckCircle,
  Warning
} from '@mui/icons-material';

const Security = () => {
  const securityControls = [
    { name: 'Antivirus', status: 'Actif', score: 95 },
    { name: 'Firewall', status: 'Configuré', score: 88 },
    { name: 'Politique de mots de passe', status: 'Partiel', score: 65 },
    { name: 'Chiffrement des données', status: 'Actif', score: 92 }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gestion de Sécurité
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Shield color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Contrôles de Sécurité</Typography>
              </Box>
              <List>
                {securityControls.map((control, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {control.score > 80 ? 
                        <CheckCircle color="success" /> : 
                        <Warning color="warning" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary={control.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">{control.status}</Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={control.score} 
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <VpnKey color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Politiques</Typography>
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip label="Politique de sécurité" color="primary" size="small" />
                <Chip label="Charte utilisateur" color="secondary" size="small" />
                <Chip label="Procédures d'incident" color="info" size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Évaluation des politiques de sécurité et procédures en place.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Évaluation de la Sécurité
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cette section permet d'évaluer les contrôles de sécurité, 
              auditer les politiques et recommander des améliorations de sécurisation.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Security;
