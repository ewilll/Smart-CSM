# Aqua AI: Smart Customer Service Assistant

## 1. Interactive "Water Drop" Mascot Interface
*   **Draggable & Playful AI:** Aqua isn't just a static button; it appears as a floating, draggable water drop mascot with micro-animations (blinking eyes, moving arms) that reacts when hovered over or clicked.
*   **Contextual Tooltips:** When minimized, Aqua displays rotating text bubbles ("Need Help?", "Track your Bill?", "Report an Issue?") to proactively encourage user interaction.
*   **Flexible UI (Expand/Minimize):** Users can interact with Aqua through a draggable floating window or expand the chat into a near-fullscreen view for complex queries and readability.
*   **Real-Time Status Indicators:** The chat header displays a "Synchronized" (Green) or "Maintenance" (Red) pulse to inform the user of the AI's operational status instantly.

## 2. Intelligent Customer Support (Local AI Backend)
*   **API-Free Machine Learning:** Aqua connects to a local Python-based Random Forest Classifier (RFC) model to process user intents without relying on premium cloud APIs, keeping the system compliant and entirely local.
*   **Context-Aware Welcome:** Aqua detects if a user is logged in or browsing as a guest. Guests are given a tailored welcome message encouraging them to log in to access full features like bill tracking and history.
*   **Dynamic Configuration:** Administrators can change Aqua's welcome message, name, or put it into maintenance mode in real-time via the system settings in the database.

## 3. Offline Emergency Mode & Native SMS Integration
*   **No-Internet Detection:** If a user types keywords like "no internet", "emergency", or "offline", Aqua recognizes the connectivity limit.
*   **SMS Fallback Button:** Aqua immediately provides a red **"Send Emergency SMS"** button. Clicking this automatically opens the user's native phone messaging app, pre-filled with the Admin Hotline and a structured emergency report template. This ensures residents can report critical leaks even without data/Wi-Fi.

## 4. Seamless Human Handoff (Escalation)
*   **Recognizing AI Limits:** If the AI determines it cannot fully solve the user's problem, it triggers a "Talk to Human Agent" prompt.
*   **Automated Ticketing:** With one click, Aqua creates a new `support_tickets` entry in the database. It attaches the entire chat transcript to the ticket so human admins have full context without the user needing to repeat their issue.

## 5. Comprehensive FAQ & Incident Routing Library
Even in Offline/Mock mode, Aqua serves as a highly capable rule-based assistant that guides users on:
*   **Billing & Payments:** GCash/7-Eleven channels, balance inquiries, and penalty warnings.
*   **Service Interruptions:** Explaining reasons for low pressure, dirty water, and guiding them to the 'Report Incident' module.
*   **Account Management:** Requirements for new connections, senior citizen discounts, and disconnection policies.
*   **Visual Evidence (Stub):** Analyzes incoming images of broken meters or pipe leaks to categorize the severity of the incident.
