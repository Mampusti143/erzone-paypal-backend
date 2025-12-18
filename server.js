const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// PayPal credentials (from environment variables for security)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7';
const PAYPAL_BASE_URL = 'https://api-m.paypal.com'; // Live environment

// Mobile return URL (deep link back to Android app)
// Dapat tumugma ito sa RETURN_URL sa Android app at sa intent-filter sa AndroidManifest.xml
const MOBILE_RETURN_URL =
  process.env.MOBILE_RETURN_URL ||
  'com.example.erzone_bicyclestore_mobileapp://paypal';

// Middleware
app.use(cors()); // Allow requests from Android app
app.use(express.json()); // Parse JSON bodies

// Health check endpoint (for Render cold start warm-up)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ERZone PayPal Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

// Get PayPal access token
async function getPayPalAccessToken() {
    try {
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post(
            `${PAYPAL_BASE_URL}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting PayPal access token:', error.response?.data || error.message);
        throw error;
    }
}

// Create PayPal order endpoint
app.post('/api/orders', async (req, res) => {
    try {
        const { amount, currency, description } = req.body;
        
        // Validate request body
        if (!amount || !currency) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'amount and currency are required'
            });
        }
        
        // Get access token
        const accessToken = await getPayPalAccessToken();
        
        // Create order
        const orderData = {
            intent: 'CAPTURE',
            application_context: {
                // Deep link pabalik sa Android app kapag success o cancel
                return_url: MOBILE_RETURN_URL,
                cancel_url: MOBILE_RETURN_URL,
                // Since alam na natin ang final amount, gamitin ang PAY_NOW flow
                user_action: 'PAY_NOW'
            },
            purchase_units: [{
                amount: {
                    currency_code: currency || 'PHP',
                    value: amount.toString()
                },
                description: description || 'ERZone Item'
            }]
        };
        
        const response = await axios.post(
            `${PAYPAL_BASE_URL}/v2/checkout/orders`,
            orderData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        
        // Return order ID
        res.json({
            orderId: response.data.id,
            status: response.data.status
        });
        
    } catch (error) {
        console.error('Error creating PayPal order:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to create PayPal order',
            message: error.response?.data?.message || error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ERZone PayPal Backend Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
    console.log(`💰 PayPal API endpoint: http://localhost:${PORT}/api/orders`);
});

