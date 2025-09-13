import React, { useEffect, useState } from 'react';
import { servicesAPI } from '../services/api';
import { Box, Card, CardContent, Typography, Button, Grid, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';

const Services = () => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderDialog, setOrderDialog] = useState({ open: false, offering: null });

  useEffect(() => {
    (async () => {
      try {
        const data = await servicesAPI.getOfferings({ active: true });
        setOfferings(data.offerings || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createOrder = async (offeringId, details) => {
    await servicesAPI.createOrder({ offering_id: offeringId, details });
    setOrderDialog({ open: false, offering: null });
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Prestations en ligne</Typography>
      <Grid container spacing={2}>
        {offerings.map((off) => (
          <Grid item xs={12} md={6} lg={4} key={off.id}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 1 }}>{off.name}</Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>{off.description || '—'}</Typography>
                <Button variant="contained" onClick={() => setOrderDialog({ open: true, offering: off })}>
                  Commander
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={orderDialog.open} onClose={() => setOrderDialog({ open: false, offering: null })}>
        <DialogTitle>Commander: {orderDialog.offering?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Détails" multiline minRows={3} defaultValue="" id="order-details" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog({ open: false, offering: null })}>Annuler</Button>
          <Button onClick={() => createOrder(orderDialog.offering.id, { notes: document.getElementById('order-details').value })} variant="contained">Valider</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Services;

