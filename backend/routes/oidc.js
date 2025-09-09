const express = require('express');
const { Issuer, generators } = require('openid-client');
const { logger } = require('../config/logger');
const { User, Organization } = require('../models');

const router = express.Router();

function requiredEnv(vars) {
  for (const v of vars) {
    if (!process.env[v]) throw new Error(`Missing env: ${v}`);
  }
}

let clientPromise;
async function getClient() {
  if (clientPromise) return clientPromise;
  requiredEnv(['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_REDIRECT_URI']);
  clientPromise = (async () => {
    const issuer = await Issuer.discover(process.env.OIDC_ISSUER_URL);
    return new issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET,
      redirect_uris: [process.env.OIDC_REDIRECT_URI],
      response_types: ['code'],
    });
  })();
  return clientPromise;
}

// OIDC start
router.get('/start', async (req, res) => {
  try {
    const client = await getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    req.session = req.session || {};
    req.session.oidc = { state, nonce };
    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
    });
    res.redirect(authUrl);
  } catch (error) {
    logger.error('OIDC start error:', error);
    res.status(500).json({ error: 'OIDC start failed' });
  }
});

// OIDC callback
router.get('/callback', async (req, res) => {
  try {
    const client = await getClient();
    const params = client.callbackParams(req);
    const sessionData = (req.session && req.session.oidc) || {};
    const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI, params, sessionData);
    const claims = tokenSet.claims();

    // Map or create user
    const email = claims.email || claims.preferred_username;
    let user = await User.findActiveByEmail(email);
    if (!user) {
      // Create default org if needed
      const [org] = await Organization.findOrCreate({ where: { name: 'OIDC Users' }, defaults: { slug: 'oidc-users', email: email || 'oidc@example.com' } });
      user = await User.create({
        organization_id: org.id,
        name: claims.name || email,
        email,
        password_hash: 'placeholder',
        role: 'viewer',
        email_verified: !!claims.email_verified,
        status: 'active',
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    logger.error('OIDC callback error:', error);
    res.status(500).json({ error: 'OIDC callback failed' });
  }
});

module.exports = router;

