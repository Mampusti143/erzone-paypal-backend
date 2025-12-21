const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   CONFIG
================================ */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';

const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';

const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

const BACKEND_URL = 'https://erzone-paypal-backend.onrender.com';
const MOBILE_RETURN_URL = 'com.example.erzone_bicyclestore_mobileapp://paypal';

/* ================================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ================================
   BASIC ROUTES
================================ */

app.get('/health', (req, res) => res.send('OK'));

app.get('/', (req, res) => {
  res.json({ status: 'OK' });
});

/* ================================
   PAYPAL → ANDROID BRIDGE
================================ */

function redirectToApp(res) {
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${MOBILE_RETURN_URL}" />
      </head>
      <body>
        Redirecting...
        <script>
          window.location.href = "${MOBILE_RETURN_URL}";
        </script>
      </body>
    </html>
  `);
}

app.get('/paypal/return', (req, res) => redirectToApp(res));
app.get('/paypal/cancel', (req, res) => redirectToApp(res));

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
   CREATE ORDER
================================ */

app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency } = req.body;

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
            value: amount
          }
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
        }
      }
    );

    res.json({
      orderId: response.data.id,
      approveUrl: response.data.links.find(l => l.rel === 'approve').href
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Create order failed' });
  }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 Running on port ${PORT}`);
});
