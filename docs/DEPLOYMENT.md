# Deployment Guide: PrimeWater Smart CSM

This guide explains how to deploy your complete system, including the React Frontend and the Local Python AI backend.

## 1. Frontend Deployment (React + Vite)

The easiest way to deploy your React app is using **Vercel** or **Netlify**.

### Option A: Vercel (Recommended)
1.  **Push your code to GitHub.**
2.  Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3.  Click **"New Project"** and select your `Capstone-2_Smart_CSM` repository.
4.  **Environment Variables**: In the Vercel dashboard, add your Supabase credentials:
    - `VITE_SUPABASE_URL`: (Your Supabase URL)
    - `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
5.  Click **Deploy**.

---

## 2. AI Backend Deployment (Python + FastAPI)

Since this is a "Local AI" requirement, it is designed to run on the machine presenting it. However, if you want it online:

### Option A: Localhost Tunneling (For Presentations)
If you are presenting and want to show it on your phone or another laptop:
1.  Use **Localtunnel** or **Ngrok**.
2.  Run: `npx localtunnel --port 8000`
3.  Update `src/utils/aiService.js` to point to the generated URL instead of `localhost:8000`.

### Option B: Render or Railway (Cloud)
1.  Create a separate GitHub repo for the `server_ai/` folder only.
2.  Deploy to [Render.com](https://render.com) as a **Web Service**.
3.  **Build Command**: `pip install -r requirements.txt`
4.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 3. Database (Supabase)

Your database is already live on Supabase! Just ensure your frontend environment variables (URLs and Keys) match your production project in the Supabase settings.

## 4. PWA Verification

After deploying the frontend to an `https` URL, you will be able to install the app on any device:
1.  Open Chrome on Android or Safari on iOS.
2.  Visit your deployed URL.
3.  Look for the **"Install PrimeWater"** prompt!

---

> [!IMPORTANT]
> **Presentation Tip**: For your capstone defense, it's often safest to demo **locally** using `npm run dev` and `start_ai.bat` to ensure the "No API" local processing is clearly visible to the panelists.
