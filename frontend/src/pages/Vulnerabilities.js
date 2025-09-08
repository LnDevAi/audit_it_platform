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
  Security,
  BugReport,
  Warning
} from '@mui/icons-material';

const Vulnerabilities = () => {
  const vulnerabilities = [
    { id: 1, severity: 'Critique', type: 'SQL Injection', host: '192.168.1.10', status: 'Ouvert' },
    { id: 2, severity: 'Élevé', type: 'XSS', host: '192.168.1.15', status: 'En cours' },
    { id: 3, severity: 'Moyen', type: 'Weak Password', host: '192.168.1.20', status: 'Résolu' }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critique': return 'error';
      case 'Élevé': return 'warning';
      case 'Moyen': return 'info';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Analyse de Vulnérabilités
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Security color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Scan Nessus</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Lancer Scan
              </Button>
              <Chip label="Dernière analyse: Hier" size="small" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <BugReport color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">OWASP ZAP</Typography>
              </Box>
              <Button variant="contained" fullWidth sx={{ mb: 2 }}>
                Scan Web App
              </Button>
              <Chip label="Applications: 3" size="small" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Résumé</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Critiques: 1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Élevées: 3
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Moyennes: 8
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vulnérabilités Détectées
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sévérité</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Hôte</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vulnerabilities.map((vuln) => (
                    <TableRow key={vuln.id}>
                      <TableCell>
                        <Chip 
                          label={vuln.severity} 
                          color={getSeverityColor(vuln.severity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{vuln.type}</TableCell>
                      <TableCell>{vuln.host}</TableCell>
                      <TableCell>{vuln.status}</TableCell>
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

export default Vulnerabilities;
