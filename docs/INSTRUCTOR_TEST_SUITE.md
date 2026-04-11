# PrimeWater Smart CSM: Comprehensive Instructor Test Suite
**Version:** 1.0 (Final Release Candidate)
**System Readiness:** 100% Complete
**Target Pass Rate:** 100%

### Overview
This document contains the official, rigorous testing protocols for the PrimeWater Smart Customer Service Management system. It is specifically designed for instructors, advisers, and quality assurance panelists to evaluate all 14 project modules.

---

## 🔐 1. Authentication & RBAC (Module M-01)
**Objective:** Verify that system access is strictly controlled based on user roles (Admin vs. Customer).

- [ ] **Test 1.1: Customer Login & Routing**
  - *Action:* Log in with a standard customer account.
  - *Expected:* System redirects to `/dashboard`. The sidebar exclusively exposes customer navigation options.
- [ ] **Test 1.2: Admin Login & Routing**
  - *Action:* Log in with the supreme admin account (`akazayasussy@gmail.com`).
  - *Expected:* System recognizes the admin role and auto-redirects to the Admin Command Center (`/admin`).
- [ ] **Test 1.3: Route Protection (Security)**
  - *Action:* While logged in as a customer, manually change the URL to `http://localhost:5173/admin` or `/admin/map`.
  - *Expected:* The system immediately blocks access and securely redirects the user back to `/dashboard`.

---

## 💧 2. Core Resident Services (Modules M-02, M-03, M-05)
**Objective:** Validate that residents can successfully report issues and track their interactions.

- [ ] **Test 2.1: Submit Incident Report**
  - *Action:* Navigate to "Report Incident". Fill out the form regarding a pipe leak in "Sumpong" and submit.
  - *Expected:* Form sanitization prevents malicious input. A success modal appears, and the incident is instantly saved to the database.
- [ ] **Test 2.2: Activity History Timeline**
  - *Action:* Navigate to "Action History".
  - *Expected:* The previously submitted incident appears in the beautiful UI timeline with a "Pending" status tag.

---

## 🤖 3. AI Knowledge Engine & Support (Module M-07) - *100% Excellence Milestone*
**Objective:** Test the core competency of the "Aqua" AI assistant, focusing on local dialect recognition and geographical intelligence.

- [ ] **Test 3.1: Core Utility Intent (Bisaya/Tagalog)**
  - *Action:* Chat with Aqua: "Nawad-an mig tubig diri sa Casisang" (We lost water here in Casisang).
  - *Expected:* Aqua accurately recognizes the `no_supply` intent. She replies empathetically in a localized tone and offers helpful "Suggested Next Steps".
- [ ] **Test 3.2: Geofencing Boundary Logic**
  - *Action:* Ask a question about an outside area: "Naay guba na tubo sa Valencia City".
  - *Expected:* Aqua politely apologizes, accurately states she is restricted to monitoring **Malaybalay City** territory, and provides human employee contact numbers.
- [ ] **Test 3.3: AI Confidence & Humility**
  - *Action:* Analyze the AI conversational tone.
  - *Expected:* Aqua behaves like a professional assistant, maintaining a "70% confidence" humility threshold, acknowledging her limitations rather than guessing wildly.

---

## 🌍 4. Admin Command Center (Modules M-04, M-08, M-10)
**Objective:** Evaluate the powerful tools provided to PrimeWater administrators.

- [ ] **Test 4.1: Module Pagination & Data Rendering**
  - *Action:* On the Admin Dashboard, navigate through Incidents, Users, and Bills tabs. Click through multiple pages of data.
  - *Expected:* Data paginates smoothly via React state logic. UI remains highly responsive without breaking table layouts.
- [ ] **Test 4.2: Real-time Analytics Dashboard**
  - *Action:* Click the "System Analytics" tab on the Admin panel.
  - *Expected:* The dashboard renders interactive Recharts displaying User Growth, Resolution Rates, and an Incident pie chart.
- [ ] **Test 4.3: Service Map (Geospatial Integration)**
  - *Action:* Navigate to the "Command Center" Map or User "Service Map".
  - *Expected:* The map accurately plots all **46 Malaybalay Barangays** as an interactive GeoJSON layer. Area boundaries where incidents are active highlight in red, while stable areas highlight in green.

---

## ⚡ 5. Extended Capabilities (Modules M-09, M-11, M-12, M-14)
**Objective:** Test the "wow-factor" features designed to elevate the capstone project to a professional production grade.

- [ ] **Test 5.1: PDF Receipt Generator**
  - *Action:* Admins navigate to the Bills tab and click "Download PDF" on any bill record.
  - *Expected:* A highly professional, smartly formatted PDF invoice is generated dynamically via `jsPDF` and downloaded.
- [ ] **Test 5.2: Emergency Advisory Ticker**
  - *Action:* Verify the top navigation bar across the application interface.
  - *Expected:* A globally visible marquee ticker seamlessly displays real-time PrimeWater maintenance announcements.
- [ ] **Test 5.3: PWA Mobile Installability**
  - *Action:* Observe the bottom of the screen on supported browsers, or check the browser menu for "Install App".
  - *Expected:* A beautiful "Install to Home Screen" prompt appears, verifying correct Vite PWA `manifest.json` and service worker integration.
- [ ] **Test 5.4: Malaybalay Information Hub**
  - *Action:* Navigate to the "Information Hub" via the sidebar.
  - *Expected:* The page displays local water conservation tips, PrimeWater emergency procedures, and visually lists out all 46 serviceable territories.

---
### ✔️ Final Verification Sign-off:
- [ ] Codebase is clean, modular, and performant.
- [ ] System passes all functional tests outlined above with a **100% Success Rate**.

**Evaluator Signature:** ___________________________ **Date:** _______________
