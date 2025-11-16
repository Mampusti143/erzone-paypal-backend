# Step-by-Step: Deploy sa Render.com via GitHub

## Part 1: I-upload ang Backend sa GitHub

### Step 1: Gumawa ng GitHub Repository

1. Pumunta sa [GitHub.com](https://github.com)
2. I-click ang **"+"** button sa taas (right side)
3. Piliin **"New repository"**
4. I-fill ang form:
   - **Repository name:** `erzone-paypal-backend` (o kahit anong name)
   - **Description:** (Optional) "PayPal Backend for ERZone App"
   - **Public** o **Private** (ikaw bahala)
   - **HUWAG i-check** ang "Add a README file", "Add .gitignore", etc. (kasi may files na tayo)
5. I-click **"Create repository"**

### Step 2: I-upload ang Backend Files

**Option A: Via GitHub Desktop (Mas madali)**

1. Download at install [GitHub Desktop](https://desktop.github.com/)
2. I-open ang GitHub Desktop
3. I-click **File > Clone repository**
4. Piliin ang repository mo
5. I-copy ang `backend` folder mo sa cloned repository folder
6. I-click **"Commit to main"** (lagay ng commit message, e.g., "Initial backend setup")
7. I-click **"Push origin"** para i-upload

**Option B: Via Command Line (Terminal/Git Bash)**

1. I-open ang Terminal o Git Bash
2. I-navigate sa folder ng `backend`:
   ```bash
   cd path/to/ERZone_BicycleStore_MobileApp/backend
   ```
3. I-initialize ang git (kung hindi pa):
   ```bash
   git init
   ```
4. I-add ang files:
   ```bash
   git add .
   ```
5. I-commit:
   ```bash
   git commit -m "Initial backend setup"
   ```
6. I-connect sa GitHub repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/erzone-paypal-backend.git
   ```
   (Palitan ang `YOUR_USERNAME` at `erzone-paypal-backend` ng actual username at repository name mo)
7. I-push:
   ```bash
   git branch -M main
   git push -u origin main
   ```

**Option C: Direct Upload sa GitHub Website (Pinakamadali)**

1. Pumunta sa GitHub repository page mo
2. I-click ang **"uploading an existing file"** link
3. I-drag at i-drop ang lahat ng files sa `backend` folder:
   - `server.js`
   - `package.json`
   - `.gitignore`
   - `README.md`
   - `DEPLOYMENT.md`
4. I-click **"Commit changes"**

---

## Part 2: I-deploy sa Render.com

### Step 1: Gumawa ng Render.com Account

1. Pumunta sa [Render.com](https://render.com)
2. I-click **"Get Started for Free"**
3. I-sign up gamit ang:
   - **GitHub account** (mas madali - i-click lang "Continue with GitHub")
   - O **Email** (kung ayaw mo mag-connect ng GitHub)

### Step 2: I-create ang Web Service

1. Sa Render dashboard, i-click **"New +"** button
2. Piliin **"Web Service"**
3. **Kung naka-connect ang GitHub:**
   - Piliin ang repository mo (`erzone-paypal-backend`)
   - I-click **"Connect"**
4. **Kung hindi naka-connect:**
   - I-click **"Configure account"**
   - I-authorize ang Render.com sa GitHub
   - Piliin ulit ang repository

### Step 3: I-configure ang Web Service

1. **Name:** `erzone-paypal-backend` (o kahit anong name)
2. **Region:** Piliin ang pinakamalapit sa iyo (e.g., Singapore)
3. **Branch:** `main` (o `master` kung yun ang default branch mo)
4. **Root Directory:** `backend` (kung ang backend folder ay nasa root ng repo)
   - O i-blank lang kung ang files ay nasa root mismo
5. **Runtime:** `Node`
6. **Build Command:** `npm install`
7. **Start Command:** `npm start`
8. **Plan:** `Free` (para sa free tier)

### Step 4: I-set ang Environment Variables

1. I-click ang **"Advanced"** section
2. Sa **"Environment Variables"**, i-click **"Add Environment Variable"**
3. I-add ang dalawang variables:

   **Variable 1:**
   - **Key:** `PAYPAL_CLIENT_ID`
   - **Value:** `AXTNZhFFSksHwus-uXRnc6eCPlIqfn5xrhFbySj-1dc2wVRhAeoTi09F06gqQ7Dbl0wiWDF9Muzjl6d4`

   **Variable 2:**
   - **Key:** `PAYPAL_CLIENT_SECRET`
   - **Value:** `ENJvmRliowdh4KsGDVoYiEPW-yx2i0mlXGlMZ0hex2vZeQbv5iSiUHajDTGUqwRGCyJFN2VstYJz2uO7`

4. I-click **"Save"** para sa bawat variable

### Step 5: I-create ang Web Service

1. I-scroll pababa
2. I-click ang **"Create Web Service"** button
3. **Hintayin ang deployment** (5-10 minutes para sa unang build)

### Step 6: Kunin ang Backend URL

1. Pagkatapos ng deployment, makikita mo ang:
   - **Status:** `Live` (green)
   - **URL:** `https://erzone-paypal-backend.onrender.com` (o similar)
2. **I-copy ang URL na ito** - ito ang `BACKEND_URL` na gagamitin sa Android app

### Step 7: I-test ang Backend

1. I-open ang URL sa browser: `https://YOUR-APP-NAME.onrender.com/`
2. Dapat may lumabas na:
   ```json
   {
     "status": "OK",
     "message": "ERZone PayPal Backend Server is running",
     "timestamp": "2024-..."
   }
   ```

---

## Part 3: I-update ang Android App

Pagkatapos ng deployment, i-update ang Android app para gamitin ang Render.com backend URL.

### I-update ang `ShopPartDetailActivity.java`:

Palitan ang:
```java
private static final String BACKEND_URL = "https://your-backend-url.onrender.com/api/orders";
```

Sa actual Render.com URL mo, halimbawa:
```java
private static final String BACKEND_URL = "https://erzone-paypal-backend.onrender.com/api/orders";
```

---

## Troubleshooting

### "Build failed"
- Check kung tama ang **Root Directory** (kung `backend` folder ang ginamit)
- Check kung may `package.json` sa tamang location

### "Service unavailable" o "Timeout"
- Render.com free tier ay may **cold start** (sleeps after 15 minutes of inactivity)
- Unang request ay maaaring matagal (30+ seconds) dahil kailangan i-wake up ang service
- Para sa production, consider ang paid tier

### "Cannot connect to backend"
- I-check kung ang URL ay tama
- I-test sa browser muna: `https://YOUR-APP.onrender.com/`
- I-check ang Render.com logs para sa errors

---

## Success! 🎉

Kung makikita mo ang health check response sa browser, success na ang deployment!

I-update na ang Android app para gamitin ang bagong backend URL.

