const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================
   ENV / CONFIG
========================= */
const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

// IMPORTANT: DIRECT deep link (SDK handles this)
const MOBILE_RETURN_URL =
  process.env.MOBILE_RETURN_URL ||
  'com.example.erzone_bicyclestore_mobileapp://paypal';

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* =========================
   ROOT
========================= */
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ERZone PayPal Backend running',
    time: new Date().toISOString()
  });
});

/* =========================
   PAYPAL TOKEN
========================= */
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

/* =========================
   CREATE ORDER (ONLY JOB)
========================= */
app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        error: 'amount and currency required'
      });
    }

    const accessToken = await getPayPalAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      application_context: {
        return_url: MOBILE_RETURN_URL,
        cancel_url: MOBILE_RETURN_URL,
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
      orderPayload,
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
  } catch (err) {
    console.error('Create order error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to create PayPal order'
    });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 ERZone PayPal Backend running on port ${PORT}`);
});
