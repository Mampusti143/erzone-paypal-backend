const axios = require('axios');
const qs = require('querystring');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

const clientId = "ATfaFHHpphrshZ9XzFB4hb587QmJW6GQEM7IVji4JvGgCmANJUCeQQM9fThEoWQP-hESd91rjMjq7SJ3";
const clientSecret = "EBdT0JoMF9btQfTrIjyWYl2-u2NXXBYCK1Neobq5L-P95GsFQvT5La1Q2VO7m3_Z1ntD2b3f7DZ96kSv";

app.use(bodyParser.json());

async function getAccessToken(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token',
      qs.stringify({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error("Error fetching access token:", error.response?.data || error.message);
  }
}

async function createPaypalOrder(accessToken, totalAmount, customOrderId) {
  try {
    const response = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "PHP",
              value: totalAmount
            },
            custom_id: customOrderId
          }
        ],
        application_context: {
          return_url: "https://erzone-paypal-backend.onrender.com/paypal-success",
          cancel_url: "https://erzone-paypal-backend.onrender.com/paypal-cancel"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log("PayPal order created:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Error creating PayPal order:", error.response?.data || error.message);
  }
}

async function capturePaypalOrder(accessToken, orderId) {
  try {
    const response = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log("PayPal order captured:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Error capturing PayPal order:", error.response?.data || error.message);
  }
}

app.post('/create-paypal-order', async (req, res) => {
  const { totalAmount, customOrderId } = req.body;
  
  if (!totalAmount || !customOrderId) {
    return res.status(400).json({ error: 'Missing totalAmount or customOrderId' });
  }
  
  const accessToken = await getAccessToken(clientId, clientSecret);
  if (!accessToken) {
    return res.status(500).json({ error: 'Failed to generate access token' });
  }
  
  const paypalOrderData = await createPaypalOrder(accessToken, totalAmount, customOrderId);
  if (!paypalOrderData) {
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
  
  // Find the approval URL from PayPal response
  const approvalUrl = paypalOrderData.links.find(link => link.rel === 'approve');
  
  res.json({ 
    paypalOrderId: paypalOrderData.id,
    approvalUrl: approvalUrl ? approvalUrl.href : null
  });
});

app.post('/capture-paypal-order', async (req, res) => {
  const { orderId } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ error: 'Missing PayPal orderId' });
  }
  
  const accessToken = await getAccessToken(clientId, clientSecret);
  const result = await capturePaypalOrder(accessToken, orderId);
  
  res.json(result);
});

app.get('/paypal-success', (req, res) => {
  console.log('PayPal success endpoint hit with query params:', req.query);
  
  const token = req.query.token;
  const PayerID = req.query.PayerID;
  
  // Return a success page that uses meta refresh instead of JavaScript
  res.send(`
    <html>
      <head>
        <title>Payment Success</title>
        <meta http-equiv="refresh" content="2;url=com.example.erzone_bicyclestore_mobileapp://paypal/success?token=${token}&PayerID=${PayerID}">
      </head>
      <body>
        <h2>Payment Successful!</h2>
        <p>Redirecting back to app...</p>
        <p>If you are not redirected automatically, please close this window and return to the app.</p>
        <script>
          // Try multiple redirect methods
          setTimeout(() => {
            try {
              // Try to redirect using window.location
              window.location.href = 'com.example.erzone_bicyclestore_mobileapp://paypal/success?token=${token}&PayerID=${PayerID}';
            } catch(e) {
              console.log('Redirect failed:', e);
              // If redirect fails, try to close the window
              window.close();
            }
          }, 1000);
          
          // Also try immediate redirect
          try {
            window.location.replace('com.example.erzone_bicyclestore_mobileapp://paypal/success?token=${token}&PayerID=${PayerID}');
          } catch(e) {
            console.log('Immediate redirect failed:', e);
          }
        </script>
      </body>
    </html>
  `);
});

app.get('/paypal-cancel', (req, res) => {
  console.log('PayPal cancel endpoint hit');
  
  // Return a cancel page that redirects back to the app
  res.send(`
    <html>
      <head><title>Payment Cancelled</title></head>
      <body>
        <h2>Payment Cancelled</h2>
        <p>Redirecting back to app...</p>
        <script>
          setTimeout(() => {
            window.location.href = 'com.example.erzone_bicyclestore_mobileapp://paypal/cancel';
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
