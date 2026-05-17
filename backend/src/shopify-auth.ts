/**
 * ONE-TIME SCRIPT: Run this to get your Shopify access token
 * Add these routes temporarily to server.ts, visit the URL, copy the token
 * Then remove these routes and put the token in .env
 */

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { logger } from './utils/logger';

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;
const SHOPIFY_STORE = 'f018dp-qk.myshopify.com';
const REDIRECT_URI = 'http://localhost:3000/auth/callback';
const SCOPES = 'read_customers,read_orders,read_products';
const API_VERSION = '2026-04';

export function addShopifyAuthRoutes(app: express.Application) {
  // Step 1: Visit http://localhost:3000/auth to start OAuth
  app.get('/auth', (req, res) => {
    logger.info('🔐 Shopify OAuth initiated');
    logger.debug('OAuth parameters', { 
      clientId: SHOPIFY_CLIENT_ID ? '***' : 'MISSING',
      store: SHOPIFY_STORE,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI
    });
    
    const state = crypto.randomBytes(16).toString('hex');
    const installUrl =
      `https://${SHOPIFY_STORE}/admin/oauth/authorize` +
      `?client_id=${SHOPIFY_CLIENT_ID}` +
      `&scope=${SCOPES}` +
      `&redirect_uri=${REDIRECT_URI}` +
      `&state=${state}`;

    logger.info('🔑 Starting Shopify OAuth flow');
    logger.debug('Redirecting to', { url: installUrl.substring(0, 100) + '...' });
    res.redirect(installUrl);
  });

  // Step 2: Shopify redirects here with the code
  app.get('/auth/callback', async (req, res) => {
    const { code, shop } = req.query;
    
    logger.info('🔄 OAuth callback received', { shop, codeLength: String(code).length });

    try {
      logger.debug('Exchanging code for access token');
      const tokenRes = await axios.post(
        `https://${SHOPIFY_STORE}/admin/oauth/access_token`,
        {
          client_id: SHOPIFY_CLIENT_ID,
          client_secret: SHOPIFY_CLIENT_SECRET,
          code,
        }
      );

      const accessToken = tokenRes.data.access_token;

      logger.success('✅ Shopify OAuth successful!');
      logger.info('Access token acquired', { 
        tokenLength: accessToken.length,
        shop: shop
      });
      logger.warn('ACTION REQUIRED: Copy token to .env as SHOPIFY_API_KEY', {
        token: accessToken.substring(0, 20) + '...'
      });

      res.send(`
        <h1>✅ Token Retrieved!</h1>
        <p>Check your terminal/console for the access token.</p>
        <p>Copy it to your .env as <code>SHOPIFY_API_KEY</code></p>
        <p><strong>Token:</strong> ${accessToken}</p>
      `);
    } catch (err: any) {
      const errorMsg = err.response?.data || err.message;
      logger.error('❌ Shopify OAuth failed', { 
        error: errorMsg,
        shop: shop,
        statusCode: err.response?.status
      });
      res.status(500).send(`
        <h1>❌ OAuth Failed</h1>
        <p>Error: ${errorMsg}</p>
        <p>Check the server logs for details.</p>
      `);
    }
  });

  logger.success('✅ Shopify OAuth routes initialized', {
    authUrl: 'http://localhost:3000/auth',
    callbackUrl: REDIRECT_URI,
    scopes: SCOPES,
    apiVersion: API_VERSION
  });
}