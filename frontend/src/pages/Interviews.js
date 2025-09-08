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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Schedule,
  Person,
  Assignment
} from '@mui/icons-material';

const Interviews = () => {
  const interviews = [
    { id: 1, direction: 'Direction IT', contact: 'Jean Dupont', date: '2024-02-15', status: 'Planifié' },
    { id: 2, direction: 'Direction Financière', contact: 'Marie Martin', date: '2024-02-16', status: 'Terminé' },
    { id: 3, direction: 'Direction RH', contact: 'Paul Durand', date: '2024-02-17', status: 'En cours' }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Entretiens
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Schedule color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Planning</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Nouveau Rendez-vous
              </Button>
              <Typography variant="body2" color="text.secondary">
                Prochains entretiens: 2
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Person color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Contacts</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Directions contactées: 8
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entretiens réalisés: 5
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assignment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Comptes-rendus</Typography>
              </Box>
              <Button variant="outlined" fullWidth>
                Générer Rapport
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Entretiens Programmés
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Direction</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interviews.map((interview) => (
                    <TableRow key={interview.id}>
                      <TableCell>{interview.direction}</TableCell>
                      <TableCell>{interview.contact}</TableCell>
                      <TableCell>{interview.date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={interview.status} 
                          color={interview.status === 'Terminé' ? 'success' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Interviews;
