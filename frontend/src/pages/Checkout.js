import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { servicesAPI, API_BASE_URL } from '../services/api';
import { Box, Card, CardContent, Typography, Button, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const StripeCheckoutForm = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.origin + '/payment/success' } });
    if (error) console.error(error);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Payer'}
      </Button>
    </form>
  );
};

const CheckoutInner = () => {
  const [method, setMethod] = useState('stripe');
  const [loading, setLoading] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [paypalApproveUrl, setPaypalApproveUrl] = useState('');

  const startCheckout = async () => {
    setLoading(true);
    try {
      const offeringId = Number(new URLSearchParams(window.location.search).get('offering_id')) || 1;
      const amountCents = Number(new URLSearchParams(window.location.search).get('amount_cents')) || 100000;
      const res = await fetch(`${API_BASE_URL}/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method, offering_id: offeringId, amount_cents: amountCents, currency: 'XOF' })
      });
      const data = await res.json();
      if (data.provider === 'stripe') setStripeClientSecret(data.clientSecret);
      if (data.provider === 'paypal' && data.approveUrl) window.location.href = data.approveUrl;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startCheckout(); // eslint-disable-next-line
  }, [method]);

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 2 }}>Paiement</Typography>
      <ToggleButtonGroup value={method} exclusive onChange={(e, v) => v && setMethod(v)} sx={{ mb: 2 }}>
        <ToggleButton value="stripe">Carte (Stripe)</ToggleButton>
        <ToggleButton value="paypal">PayPal</ToggleButton>
      </ToggleButtonGroup>
      <Card>
        <CardContent>
          {loading && <div>Initialisation…</div>}
          {!loading && method === 'stripe' && stripeClientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripeCheckoutForm clientSecret={stripeClientSecret} />
            </Elements>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default function Checkout() {
  return (
    <Box sx={{ p: 3 }}>
      <CheckoutInner />
    </Box>
  );
}

