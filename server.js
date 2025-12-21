const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   PAYPAL CONFIG
================================ */

const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

// LIVE
const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

// Render public URL
const BACKEND_URL =
  process.env.BACKEND_URL ||
  'https://erzone-paypal-backend.onrender.com';

// Android deep link
const MOBILE_RETURN_URL =
  'com.example.erzone_bicyclestore_mobileapp://paypal';

/* ================================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ================================
   BASIC ROUTES
================================ */

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'ERZone PayPal Backend Running' });
});

app.get('/health', (req, res) => {
  res.send('OK');
});

/* ================================
   PAYPAL REDIRECT (ANDROID)
================================ */

app.get('/paypal/return', (req, res) => {
  res.send(`
    <html>
      <body>
        <script>
          window.location.href = "${MOBILE_RETURN_URL}?status=success";
        </script>
      </body>
    </html>
  `);
});

app.get('/paypal/cancel', (req, res) => {
  res.send(`
    <html>
      <body>
        <script>
          window.location.href = "${MOBILE_RETURN_URL}?status=cancel";
        </script>
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
      }
    }
  );

  return response.data.access_token;
}

/* ================================
   CREATE ORDER (IMPORTANT FIX)
================================ */

app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount & currency required' });
    }

    const accessToken = await getPayPalAccessToken();

    const order = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
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
            }
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 🔥 THIS IS THE FIX
    const approveLink = order.data.links.find(
      link => link.rel === 'approve'
    );

    res.json({
      orderId: order.data.id,
      approvalUrl: approveLink.href
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'PayPal order failed' });
  }
});

/* ================================
   CAPTURE PAYMENT
================================ */

app.post('/api/capture/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const accessToken = await getPayPalAccessToken();

    const capture = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(capture.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Capture failed' });
  }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 ERZone PayPal Backend running on port ${PORT}`);
  console.log(`🌐 ${BACKEND_URL}`);
});
