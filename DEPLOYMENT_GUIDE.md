# FinTrend Deployment Guide

This guide walks you through deploying FinTrend to **Render** using **GitHub**.

---

## Prerequisites

1. GitHub account (https://github.com)
2. Render account (https://render.com) - Sign up with GitHub for easy integration
3. Finnhub API key (https://finnhub.io/register) - Free tier available

---

## Step 1: Push Code to GitHub

### 1.1 Open Terminal in Project Folder

```bash
cd "/Users/dev/Downloads/Sir Usman Aamer FYP Studnets Work"
```

### 1.2 Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit - FinTrend stock prediction app"
```

### 1.3 Connect to GitHub

After creating a repository on GitHub (e.g., `fintrend`), run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/fintrend.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 2: Deploy Backend on Render

### 2.1 Create New Web Service

1. Go to **https://dashboard.render.com**
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Select your `fintrend` repository

### 2.2 Configure Backend Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `fintrend-backend` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

### 2.3 Set Environment Variables

Click **Advanced** → **Add Environment Variable**:

| Key | Value |
|-----|-------|
| `FINNHUB_API_KEY` | Your Finnhub API key |
| `PYTHON_VERSION` | `3.11.0` |

### 2.4 Select Plan

- Choose **Free** tier for testing (spins down after 15 min inactivity)
- Or **Starter** ($7/month) for always-on

### 2.5 Click "Create Web Service"

Wait 5-10 minutes for deployment. Copy your backend URL when ready:
```
https://fintrend-backend.onrender.com
```

---

## Step 3: Deploy Frontend on Render

### 3.1 Create New Static Site

1. Go to **https://dashboard.render.com**
2. Click **New +** → **Static Site**
3. Connect your GitHub repository
4. Select your `fintrend` repository

### 3.2 Configure Frontend Service

| Setting | Value |
|---------|-------|
| **Name** | `fintrend-frontend` |
| **Branch** | `main` |
| **Root Directory** | `FrontEnd` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `build` |

### 3.3 Set Environment Variable

Click **Advanced** → **Add Environment Variable**:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://fintrend-backend.onrender.com/api` |

⚠️ **Important**: Replace the URL with your actual backend URL from Step 2.5

### 3.4 Click "Create Static Site"

Wait 3-5 minutes for deployment. Your app URL will be:
```
https://fintrend-frontend.onrender.com
```

---

## Step 4: Test Your Deployment

1. Open your frontend URL in a browser
2. Sign in with demo credentials:
   - Email: `demo@stockpredict.ai`
   - Password: `demo123`
3. Test features: Dashboard, News, Predictions, etc.

---

## Troubleshooting

### Backend won't start?
- Check **Logs** in Render dashboard
- Verify `FINNHUB_API_KEY` is set
- Memory issues? TensorFlow needs ~1GB RAM. Upgrade to paid plan if needed.

### Frontend shows "Network Error"?
- Verify `REACT_APP_API_URL` points to your backend
- Check backend is running (visit backend URL directly)
- Ensure backend URL ends with `/api`

### News not loading?
- Verify Finnhub API key is valid
- Check Finnhub rate limits (60 calls/minute on free tier)

### Free tier spins down?
- First request after inactivity takes 30-60 seconds
- This is normal for Render free tier
- Upgrade to Starter for always-on

---

## Updating Your App

After making changes locally:

```bash
git add .
git commit -m "Your change description"
git push
```

Render automatically redeploys when you push to GitHub.

---

## Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click **Settings** → **Custom Domains**
3. Add your domain (e.g., `fintrend.com`)
4. Update DNS records as instructed

---

## Cost Summary

| Service | Free Tier | Paid (Starter) |
|---------|-----------|----------------|
| Backend | Yes (sleeps) | $7/month |
| Frontend | Yes (always on) | Free |
| **Total** | **$0** | **$7/month** |

---

## Need Help?

- Render Docs: https://render.com/docs
- GitHub Docs: https://docs.github.com
- Finnhub Docs: https://finnhub.io/docs/api

Good luck with your deployment! 🚀
