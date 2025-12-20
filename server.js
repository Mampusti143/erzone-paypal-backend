const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================
   PAYPAL CONFIG (BEST PRACTICE)
========================= */

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

// LIVE PayPal
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL ||
  'https://api-m.paypal.com';

// Render backend URL
const BACKEND_URL =
  process.env.BACKEND_URL ||
  'https://erzone-paypal-backend.onrender.com';

// Android deep link
const MOBILE_RETURN_URL =
  process.env.MOBILE_RETURN_URL ||
  'com.example.erzone_bicyclestore_mobileapp://paypal';

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());

/* =========================
   HEALTH & ROOT
========================= */

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ERZone PayPal Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

/* =========================
   PAYPAL RETURN / CANCEL
========================= */

// IMPORTANT:
// HTML + JavaScript redirect (required for Android deep links)
app.get('/paypal/return', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store');

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${MOBILE_RETURN_URL}">
      </head>
      <body>
        <script>
          window.location.href = "${MOBILE_RETURN_URL}";
        </script>
      </body>
    </html>
  `);
});

app.get('/paypal/cancel', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store');

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${MOBILE_RETURN_URL}">
      </head>
      <body>
        <script>
          window.location.href = "${MOBILE_RETURN_URL}";
        </script>
      </body>
    </html>
  `);
});

/* =========================
   PAYPAL ACCESS TOKEN
========================= */

async function getPayPalAccessToken() {
  try {
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
  } catch (error) {
    console.error(
      'PayPal token error:',
      error.response?.data || error.message
    );
    throw error;
  }
}

/* =========================
   CREATE PAYPAL ORDER
========================= */

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
        brand_name: 'ERZone Bicycle Store',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${BACKEND_URL}/paypal/return`,
        cancel_url: `${BACKEND_URL}/paypal/cancel`
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
          'Content-Type': 'application/json',
          Accept: 'application/json'
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
      error: 'Failed to create PayPal order'
    });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`🚀 ERZone PayPal Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: ${BACKEND_URL}/health`);
  console.log(`💰 PayPal API endpoint: ${BACKEND_URL}/api/orders`);
});
