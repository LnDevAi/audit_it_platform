import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Description,
  PictureAsPdf,
  TableChart,
  Email
} from '@mui/icons-material';

const Reports = () => {
  const reportTypes = [
    { name: 'Rapport d\'audit complet', format: 'PDF', status: 'Disponible' },
    { name: 'Synthèse exécutive', format: 'Word', status: 'En cours' },
    { name: 'Données d\'inventaire', format: 'Excel', status: 'Disponible' },
    { name: 'Analyse de vulnérabilités', format: 'PDF', status: 'Disponible' }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Rapports
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Description color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Génération</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Générer Rapport Complet
              </Button>
              <Button variant="outlined" fullWidth>
                Rapport Personnalisé
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Email color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Distribution</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Envoyer par Email
              </Button>
              <Typography variant="body2" color="text.secondary">
                Dernière distribution: Il y a 3 jours
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rapports Disponibles
            </Typography>
            <List>
              {reportTypes.map((report, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {report.format === 'PDF' ? <PictureAsPdf /> : <TableChart />}
                  </ListItemIcon>
                  <ListItemText 
                    primary={report.name}
                    secondary={`Format: ${report.format}`}
                  />
                  <Chip 
                    label={report.status} 
                    color={report.status === 'Disponible' ? 'success' : 'warning'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Reports;
