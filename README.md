# ERZone PayPal Backend Server

Backend server para sa PayPal integration ng ERZone Bicycle Store Mobile App.

## Features

- ✅ PayPal Orders V2 API integration
- ✅ Secure server-side API calls (Client Secret nasa backend lang)
- ✅ CORS enabled para sa Android app
- ✅ Environment variables support

## Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables (optional para sa local):**
   - Gumawa ng `.env` file (optional)
   - O i-setup sa Render.com dashboard

3. **Run server:**
   ```bash
   npm start
   ```
   
   Para sa development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Test:**
   - Health check: `http://localhost:10000/`
   - Create order: `POST http://localhost:10000/api/orders`

## Environment Variables

Sa Render.com dashboard, i-set ang:
- `PAYPAL_CLIENT_ID` - Your PayPal Live Client ID
- `PAYPAL_CLIENT_SECRET` - Your PayPal Live Client Secret (HINDI dapat i-commit sa GitHub!)

**Note:** Default values ay naka-hardcode para sa testing, pero sa production dapat nasa environment variables.

## API Endpoints

### `GET /`
Health check endpoint
- **Response:** `{ status: 'OK', message: '...', timestamp: '...' }`

### `POST /api/orders`
Create PayPal order
- **Request Body:**
  ```json
  {
    "amount": "100.00",
    "currency": "PHP",
    "description": "Product Name"
  }
  ```
- **Response:**
  ```json
  {
    "orderId": "5O190127TN364715T",
    "status": "CREATED"
  }
  ```

## Deploy sa Render.com

Tingnan ang `DEPLOYMENT.md` para sa step-by-step instructions.

