# PrimeWater Smart CSM - System Architecture & Module Guide

This document breaks down every phase and module listed in the project timeline, explaining **what it is for** and **where to find the code** in the system.

## Phase Two: Core System Development

### Authentication (Email/Google)
* **What it's for:** Securely logs users into the system using their email and password, or via Google OAuth. It ensures only registered residents and admins can access the platform, protecting sensitive data.
* **Where to find it:** 
  - Frontend UI: `src/pages/auth/Login.jsx`, `src/pages/auth/Signup.jsx`
  - Auth Logic: `src/utils/auth.js`
  - Database: `src/utils/supabaseClient.js` connecting to Supabase Auth.

### Main User Dashboard & UI Layout
* **What it's for:** The central starting screen for normal users after logging in. It gives a bird's-eye view of their current unread advisories, recent bills, and active water reports.
* **Where to find it:** 
  - Main Component: `src/pages/user/Dashboard.jsx`

### Sidebar & Navigation Logic
* **What it's for:** The unified side menu that allows users to smoothly navigate between the Dashboard, Maps, Support, and Settings without reloading the page. It includes strict Role-Based Access Control (RBAC) so regular users cannot see the Admin links.
* **Where to find it:** 
  - `src/components/Sidebar.jsx`
  - Routing Logic: `src/App.jsx` (where `<ProtectedRoute>` and `<AdminRoute>` are implemented).

### Database Setup (Supabase)
* **What it's for:** The fundamental cloud database that stores all user accounts, incident tickets, billing records, and system settings. It acts as the "backend" brain.
* **Where to find it:** 
  - Server Configuration files: `src/utils/supabaseClient.js`
  - (SQL schemas and tables are managed directly inside your Supabase Cloud Dashboard).

---

## Phase Three: Functional Modules

### Incident Reporting
* **What it's for:** The main form allowing residents to submit tickets regarding leaks, dirty water, or meter issues, complete with precise GPS tracking, severity classification, and image attachments.
* **Where to find it:** 
  - `src/pages/user/ReportIncident.jsx`

### Activity History & Archiving
* **What it's for:** A continuous log containing all previously submitted tickets and resolved issues. It provides users a clear historical track record of their interactions with PrimeWater.
* **Where to find it:** 
  - Found inherently inside `src/pages/user/Dashboard.jsx` under the Recent History tables.

### User Profile & Settings Management
* **What it's for:** The dedicated page where a user can update their full Account Name, primary contact number, Account/Reference ID, and check their current status.
* **Where to find it:** 
  - `src/pages/user/Profile.jsx` (or the Settings modal).

### Support Hub & AI Bot UI
* **What it's for:** The interactive "Aqua Mascot" and floating chat window. It uses a Python AI neural network to text users dynamically in Bisaya, Tagalog, and English to solve common queries, acting as the ultimate 24/7 digital assistant.
* **Where to find it:** 
  - React Chatbot Interface: `src/components/Chatbot.jsx`
  - Local AI Brain (Python): `server_ai/main.py`
  - AI Request Logic: `src/utils/aiService.js`

### Emergency Advisory System (Ticketing)
* **What it's for:** A digital broadcast system for PrimeWater to globally post system-wide notices like "Scheduled Maintenance", "Sudden Pipe Bursts", or "Low Pressure Alerts" out to thousands of users simultaneously.
* **Where to find it:** 
  - Broadcast controls inside `src/pages/admin/AdminDashboard.jsx`.

### Multi-Stage Service Tracking
* **What it's for:** Real-time status updates reflecting on user tickets (e.g. changing from "Pending" to "In Progress", then "Resolved"). Functions identically to tracking a package delivery but for water maintenance.
* **Where to find it:** 
  - Status progression states mapped structurally within Supabase and rendered in `AdminDashboard.jsx` and user dashboards.

---

## Phase Four: Admin & Advanced Features

### Admin Command Center Layout
* **What it's for:** The highly secured, overarching dashboard built exclusively for PrimeWater staff. It consolidates mapping, analytics, ticket resolution, pdf-invoice generation, and user management into one absolute Control Panel.
* **Where to find it:** 
  - `src/pages/admin/AdminDashboard.jsx`

### Map Integration (Heatmaps)
* **What it's for:** An interactive geographical map plotting live incidents based on GPS coordinates. Visualizing leaks logically across physical space allows the Admin to dispatch hardware efficiently to the most critical "Ground Zero" clusters across Malaybalay City.
* **Where to find it:** 
  - Interactive Component: `src/pages/user/ServiceMap.jsx`

### PWA Manifest & Installability
* **What it's for:** The underlying code infrastructure making the website installable as a native App (APK style) via the browser. This allows the system to cache assets and live on the user's home screen without being uploaded directly to the Google Play Store.
* **Where to find it:** 
  - Core build setup: `vite.config.js` (inside `VitePWA` configs).
  - Web definitions inside the compiler.

### Real-time Analytics Dashboard
* **What it's for:** Instantly processes complex data sets, turning thousands of database rows into beautiful, visual Bar Charts and Pie Graphs mapping "Types of Incidents" and "Resolution Status", completely removing the need for manual Excel calculation.
* **Where to find it:** 
  - The metrics logic and `<Recharts>` integration at the top of `src/pages/admin/AdminDashboard.jsx`.
