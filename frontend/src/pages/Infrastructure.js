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
  Chip
} from '@mui/material';
import {
  PowerSettingsNew,
  Router,
  Security,
  Storage
} from '@mui/icons-material';

const Infrastructure = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Infrastructure
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PowerSettingsNew color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Alimentation Électrique</Typography>
              </Box>
              <LinearProgress variant="determinate" value={85} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Capacité utilisée: 85%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Router color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Équipements Réseau</Typography>
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip label="Switches: 12" size="small" />
                <Chip label="Routeurs: 3" size="small" />
                <Chip label="Firewalls: 2" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Évaluation de l'Infrastructure
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cette section permet d'évaluer l'infrastructure technique de l'organisation,
              incluant l'alimentation électrique, les équipements réseau et l'architecture générale.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Infrastructure;
