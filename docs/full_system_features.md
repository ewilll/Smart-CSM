# PrimeWater Smart CSM: Complete System Documentation

## System Overview
The **PrimeWater Smart Customer Service Management (CSM)** system is a comprehensive, progressive web application (PWA) designed to bridge the communication gap between the water utility provider (PrimeWater) and its residents. The system is split into two primary interfaces: a User Application for residents to manage their accounts and report issues, and an Admin Command Center for utility managers to track incidents geospatially and manage support requests.

---

## 🟢 Core User Features

### 1. Authentication & Security (M-01)
*   **Secure Implementation:** Utilizes modern authentication patterns with support for Email/Password and third-party setups (Google OAuth preparation).
*   **Role-Based Access:** Distinguishes between standard users, guest browsers, and administrators for tailored experiences.

### 2. User Dashboard & UX (M-02)
*   **Water-Themed UI:** Features a custom "Tabela theme" with fluid layouts, glassmorphism, and a floating navigation sidebar.
*   **Information Hub:** Real-time display of user stats, active reports, and utility announcements.

### 3. Smart Incident Reporting (M-03)
*   **Geospatial Tracking:** Users can automatically detect their phone's GPS location via the browser's Geolocation API to pinpoint leaks or broken pipes.
*   **Visual Evidence & AI Stub:** Allows users to upload or capture photos of the incident. Integrated with a local AI service that performs automated severity detection based on visual input.
*   **Automated Ticketing:** Instantly generates trackable tickets (`#INC-XXXX`) stored in the Supabase backend.

### 4. Activity Archiving & Multi-Stage Tracking (M-05 & M-13)
*   **History Timeline:** A dedicated view for users to look at their past actions, resolved incidents, and billing history.
*   **Status Indicators:** Users receive transparent updates if their reported issue is ‘Pending’ or ‘Resolved’.

### 5. Document Generation (M-12)
*   **PDF Receipts & Bills:** Users can automatically generate and download professional, formatted PDF versions of their water bills or payment receipts directly from the dashboard.

---

## 🔵 Admin Command Center

### 1. Main Dashboard (M-04)
*   **Centralized View:** Displays a master table of all reported incidents across the municipality, complete with urgency flags and user contact details.
*   **Rapid Status Updates:** Admins can effortlessly toggle the status of an incident (e.g., from Pending to Resolved) to keep residents informed.

### 2. Interactive Map & Geolocation (M-08)
*   **Live Incident Heatmap:** Integrates Leaflet and OpenStreetMap alongside a local GeoJSON of barangays (e.g., Malaybalay City).
*   **Visual Alerts:** Barangays with active outages or major leaks flash red. Individual incidents are plotted with custom colored markers (Red = Active, Green = Resolved) based on their exact GPS coordinates.

### 3. Analytics & Emergency Advisory (M-10 & M-11)
*   **Data Aggregation:** Provides real-time metrics on incident resolution times and common utility issues.
*   **Global Ticker:** Admins can push emergency advisories (e.g., "Water interruption in Brgy 1 at 3 PM") that appear universally across all user screens.

---

## 🤖 Aqua AI: Autonomous Support Hub (M-07)

The system features **Aqua**, an interactive Water Drop mascot that serves as the frontline support agent.

### 1. Intelligent Mascot Interface
*   **Draggable & Playful AI:** Aqua is a floating, draggable UI element with micro-animations that responds to user clicks and displays contextual tooltips encouraging interaction.
*   **Expandable Chat:** Users can use a standard chat window or expand it to near-fullscreen for readability.

### 2. API-Free Machine Learning Backend
*   **Local Python Processing:** Connects to a local Random Forest Classifier (RFC) to process natural language intents without relying on premium cloud APIs, ensuring data privacy.
*   **Dynamic Greeting:** Detects if a user is logged in or a guest, actively encouraging guests to create an account for personalized billing assistance.

### 3. Emergency SMS Fallback (Offline Mode)
*   **No-Internet Detection:** Recognizes keywords like "emergency" or "no internet" to detect connectivity issues.
*   **Native Pre-filled SMS:** Provides a "Send Emergency SMS" button that opens the phone's native messaging app, pre-loading it with the PrimeWater admin hotline and an incident template.

### 4. Human Handoff (Escalation Protocol)
*   **Automated Escrow:** If the AI reaches the limit of its knowledge base, it offers a "Talk to Human Agent" button.
*   **Ticket Generation:** Automatically creates a support ticket containing the entire chat transcript so human agents have full context immediately.

### 5. Rule-Based FAQ Library
*   Even offline, Aqua handles complex inquiries regarding billing, GCash/7-Eleven payments, service interruptions, connection requirements, and senior citizen discounts.

---

## 📱 Architecture & Deployment

*   **PWA Compatibility (M-09):** The web application includes a `manifest.json` and service worker setup, allowing residents to "Install" the system on their Android/iOS devices like a native app.
*   **Tech Stack:** Built on Vite + React for high-performance frontend rendering, with TailwindCSS for styling, and Supabase for real-time Postgres database functionality.
