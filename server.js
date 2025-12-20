const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   CONFIG
================================ */

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

// PUBLIC backend URL (Render)
const BACKEND_URL =
  process.env.BACKEND_URL ||
  'https://erzone-paypal-backend.onrender.com';

// Android deep link
const MOBILE_RETURN_URL =
  process.env.MOBILE_RETURN_URL ||
  'com.example.erzone_bicyclestore_mobileapp://paypal';

/* ================================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ================================
   BASIC ROUTES
================================ */

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ERZone PayPal Backend is running',
    time: new Date().toISOString()
  });
});

/* ================================
   PAYPAL REDIRECT (REQUIRED)
================================ */

// IMPORTANT: PayPal requires HTTPS return URLs
// We redirect to Android deep link via HTML

app.get('/paypal/return', (req, res) => {
  const deepLink = MOBILE_RETURN_URL;
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <script>window.location.href="${deepLink}";</script>
      </body>
    </html>
  `);
});

app.get('/paypal/cancel', (req, res) => {
  const deepLink = MOBILE_RETURN_URL;
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <script>window.location.href="${deepLink}";</script>
      </body>
    </html>
  `);
});

/* ================================
   PAYPAL TOKEN
================================ */

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 15000
    }
  );

  return response.data.access_token;
}

/* ================================
   CREATE ORDER (FIXED)
================================ */

app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        error: 'amount and currency are required'
      });
    }

    const accessToken = await getPayPalAccessToken();

    const orderData = {
      intent: 'CAPTURE',
      application_context: {
        return_url: `${BACKEND_URL}/paypal/return`,
        cancel_url: `${BACKEND_URL}/paypal/cancel`,
        user_action: 'PAY_NOW'
      },
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: description || 'ERZone Item'
        }
      ]
    };

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    res.json({
      orderId: response.data.id,
      status: response.data.status
    });
  } catch (error) {
    console.error(
      'Create order error:',
      error.response?.data || error.message
    );
    res.status(500).json({
      error: 'Failed to create order'
    });
  }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 ERZone PayPal Backend running on port ${PORT}`);
  console.log(`🌐 ${BACKEND_URL}`);
  console.log(`💰 POST /api/orders`);
});
