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
  
  // Return a better looking success page
  res.send(`
    <html>
      <head>
        <title>Payment Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out;
          }
          .success-title { 
            font-size: 32px; 
            font-weight: bold;
            margin-bottom: 15px;
            animation: fadeIn 1s ease-in-out 0.5s both;
          }
          .success-message { 
            font-size: 18px; 
            margin-bottom: 10px;
            animation: fadeIn 1s ease-in-out 1s both;
          }
          .processing { 
            font-size: 16px; 
            opacity: 0.8;
            animation: fadeIn 1s ease-in-out 1.5s both;
          }
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-20px); }
            60% { transform: translateY(-10px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <div class="success-title">Payment Successful!</div>
          <div class="success-message">Your payment has been processed successfully.</div>
          <div class="processing">Processing your order...</div>
          <div class="spinner"></div>
        </div>
        
        <!-- Hidden data for the app to read -->
        <div id="payment-data" style="display: none;">
          <span id="token">${token}</span>
          <span id="payerid">${PayerID}</span>
        </div>
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
