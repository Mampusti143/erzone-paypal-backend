const axios = require('axios');
const qs = require('querystring');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

app.use(bodyParser.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    environment: 'SANDBOX'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'SANDBOX'
  });
});

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
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    console.log("PayPal order created:", response.data.id);
    return response.data.id;
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
  console.log('=== /create-paypal-order endpoint called ===');
  console.log('Request body:', req.body);
  
  const { totalAmount, customOrderId } = req.body;
  
  if (!totalAmount || !customOrderId) {
    console.log('Missing required fields - totalAmount:', totalAmount, 'customOrderId:', customOrderId);
    return res.status(400).json({ error: 'Missing totalAmount or customOrderId' });
  }
  
  console.log('Getting access token...');
  const accessToken = await getAccessToken(clientId, clientSecret);
  if (!accessToken) {
    console.log('Failed to get access token');
    return res.status(500).json({ error: 'Failed to generate access token' });
  }
  
  console.log('Creating PayPal order with amount:', totalAmount, 'customOrderId:', customOrderId);
  const paypalOrderId = await createPaypalOrder(accessToken, totalAmount, customOrderId);
  if (!paypalOrderId) {
    console.log('Failed to create PayPal order');
    return res.status(500).json({ error: 'Failed to create PayPal order' });
  }
  
  console.log('Successfully created PayPal order:', paypalOrderId);
  res.json({ paypalOrderId });
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
