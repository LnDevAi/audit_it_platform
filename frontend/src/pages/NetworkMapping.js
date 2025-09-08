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
  Chip
} from '@mui/material';
import {
  NetworkCheck,
  Scanner,
  AccountTree
} from '@mui/icons-material';

const NetworkMapping = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cartographie Réseau
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Scanner color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Scan Réseau</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Lancer Scan Nmap
              </Button>
              <Chip label="Dernière analyse: Il y a 2h" size="small" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NetworkCheck color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Découverte</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Équipements détectés: 45
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plages IP: 192.168.1.0/24
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountTree color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Topologie</Typography>
              </Box>
              <Button variant="outlined" fullWidth>
                Voir Diagramme
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cartographie et Analyse Réseau
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Outils de scan automatique des réseaux avec intégration Nmap,
              génération de topologies et documentation de l'architecture réseau.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default NetworkMapping;
