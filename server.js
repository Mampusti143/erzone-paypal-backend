const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

/* ================================
   CONFIG
================================ */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const PAYPAL_BASE_URL = 'https://api-m.paypal.com';

// Render public URL (HTTPS REQUIRED)
const BACKEND_URL = 'https://erzone-paypal-backend.onrender.com';

// Android deep link
const MOBILE_DEEPLINK = 'com.example.erzone_bicyclestore_mobileapp://paypal';

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
  res.json({ status: 'OK', message: 'PayPal backend running' });
});

/* ================================
   PAYPAL REDIRECT (REQUIRED)
================================ */

app.get('/paypal/return', (req, res) => {
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${MOBILE_DEEPLINK}" />
      </head>
      <body>
        Redirecting...
        <script>window.location.href="${MOBILE_DEEPLINK}"</script>
      </body>
    </html>
  `);
});

app.get('/paypal/cancel', (req, res) => {
  res.redirect(MOBILE_DEEPLINK);
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
   CREATE ORDER
================================ */

app.post('/api/orders', async (req, res) => {
  try {
    const { amount, currency } = req.body;

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
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount
          }
        }]
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const approvalUrl = order.data.links.find(
      l => l.rel === 'approve'
    ).href;

    res.json({
      orderId: order.data.id,
      approvalUrl
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'PayPal order failed' });
  }
});

/* ================================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 Running on ${PORT}`);
});
