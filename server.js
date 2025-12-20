const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   PAYPAL CONFIG
================================ */

// PayPal credentials (ENV FIRST, fallback for safety)
const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

// LIVE PayPal
const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

/* ================================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ================================
   BASIC ROUTES
================================ */

// Health check (important for Render)
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
   PAYPAL FUNCTIONS
================================ */

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

/* ================================
   CREATE ORDER (NO REDIRECT)
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
   CAPTURE PAYMENT
================================ */

app.post('/api/capture/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      'Capture error:',
      error.response?.data || error.message
    );
    res.status(500).json({
      error: 'Payment capture failed'
    });
  }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 ERZone PayPal Backend running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`💰 Create Order: POST /api/orders`);
  console.log(`✅ Capture Order: POST /api/capture/:orderId`);
});
