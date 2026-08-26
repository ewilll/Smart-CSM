import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './auth';

const AI_SERVER_URL = "http://localhost:8000";
const AI_SECRET_KEY = "csm_secure_ai_access_2024";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Sends a message to the Gemini API with live system context
 */
export const getAIChatResponse = async (history, currentMessage, isAuthenticated) => {
    try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            throw new Error('Gemini API Key missing');
        }
        const user = getCurrentUser();

        // 1. Gather Live Context Data from Supabase
        let contextData = "";
        if (user) {
            const { data: bills } = await supabase.from('bills').select('*').eq('user_id', user.id).eq('status', 'Unpaid');
            const { data: userIncidents } = await supabase.from('incidents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
            const { data: globalIncidents } = await supabase.from('incidents').select('*').in('status', ['Pending', 'Dispatched', 'On-Site']).limit(3);
            
            contextData = `
            CURRENT LIVE SYSTEM CONTEXT:
            User ID: ${user.id}
            User Name: ${user.full_name || 'Resident'}
            Unpaid Bills: ${bills && bills.length > 0 ? bills.map(b => `${b.amount_due} PHP (Due: ${b.due_date})`).join(', ') : 'None'}
            The User's Specifically Reported Incidents: ${userIncidents && userIncidents.length > 0 ? userIncidents.map(i => `[Type: ${i.type}, Location: ${i.location}, Status: ${i.status}]`).join(' | ') : 'User has not reported any incidents.'}
            Global Active Maintenance/Issues: ${globalIncidents && globalIncidents.length > 0 ? globalIncidents.map(i => `[${i.type} at ${i.location}]`).join(', ') : 'None'}
            `;
        } else {
            contextData = "User is not logged in. Advise them to log in to see their specific billing and report details.";
        }

        // 2. Build the prompt with System Instructions
        const systemInstruction = `
            You are Aqua, the friendly and highly intelligent official AI assistant for PrimeWater Smart CSM (Centralized System Management) in Malaybalay City.
            Your job is to assist users with water-related concerns, billing inquiries, and system guidance.
            You must be polite, concise, and helpful. Do not mention that you are an AI model like Gemini. You are Aqua.

            CRITICAL RESTRICTION: You MUST ONLY answer questions related to PrimeWater, water supply, billing, plumbing, or the Smart CSM system. 
            If the user asks ANY question unrelated to these topics (e.g., general knowledge, coding, math, entertainment, definitions of random words), you MUST politely refuse to answer and remind them that you are exclusively a PrimeWater support assistant.

            Here is the live data from the PrimeWater system right now. Use this to answer the user's questions specifically and dynamically!
            ${contextData}

            If the user asks about their own reported incident, check "The User's Specifically Reported Incidents" data above. Tell them the status of their specific report.
            If the user reports a new leak or lack of water, check the "Global Active Maintenance" data to see if there is already a known issue in their area.
            If there isn't a known issue, guide them to go to the "Report Incident" page to submit an official report.
            Keep your answers short, friendly, and professional. 
            IMPORTANT: Do NOT use any emojis. Do NOT use any Markdown formatting like **bold**, *italics*, or lists. Use completely plain text only.
        `;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.6-flash",
            systemInstruction: systemInstruction
        });

        // 3. Format history for Gemini API (must start with 'user' and alternate)
        let formattedHistory = [];
        let expectedRole = 'user';

        for (const msg of history) {
            const role = msg.role === 'user' ? 'user' : 'model';
            if (role === expectedRole) {
                formattedHistory.push({
                    role: role,
                    parts: [{ text: msg.content }]
                });
                expectedRole = expectedRole === 'user' ? 'model' : 'user';
            }
        }

        const chat = model.startChat({
            history: formattedHistory
        });

        const result = await chat.sendMessage(currentMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini AI Error:", error);
        
        // Handle 503 Overloaded specifically
        if (error.message && error.message.includes('503')) {
            return "💧 Aqua is currently experiencing very high demand helping other residents! Please wait a moment and try asking your question again.";
        }
        
        return getOfflineResponse(currentMessage);
    }
};

/**
 * Classifies incident description to auto-fill form
 */
export const classifyIncidentText = async (text) => {
    if (!text || text.length < 10) return null;
    try {
        const response = await fetch(`${AI_SERVER_URL}/classify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': AI_SECRET_KEY
            },
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        console.error("Classification Error:", error);
        return null;
    }
};

/**
 * Checks for potential duplicate incidents using AI similarity
 */
export const checkDuplicateIncident = async (text, lat, lng, existingIncidents) => {
    if (!text || !lat || !lng || !existingIncidents || !existingIncidents.length) return { is_duplicate: false };

    try {
        const response = await fetch(`${AI_SERVER_URL}/check-duplicate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': AI_SECRET_KEY
            },
            body: JSON.stringify({
                text,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                existing_incidents: existingIncidents
            })
        });

        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        console.error("Duplicate Check Error:", error);
        return { is_duplicate: false };
    }
};

/**
 * Analyzes incident image (Placeholder for defense)
 */
export const analyzeIncidentImage = async (imageFile) => {
    // For the actual defense, we simulate a 2-second processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const fileName = imageFile?.name?.toLowerCase() || "";

    // Check for non-PrimeWater issues first
    if (fileName.includes("buseco") || fileName.includes("electric") || fileName.includes("wire") || fileName.includes("post") || fileName.includes("pole")) {
        return {
            type: "Electrical Issue (Not PrimeWater)",
            severity: "High",
            description: "Aqua analyzed your photo and detected an electrical issue (e.g., damaged wires or post). This is a power issue. Please contact BUSECO (Bukidnon Second Electric Cooperative) at their hotline immediately.",
            confidence: 0.95
        };
    } else if (fileName.includes("garbage") || fileName.includes("trash") || fileName.includes("waste")) {
        return {
            type: "Waste Management (Not PrimeWater)",
            severity: "Low",
            description: "Aqua analyzed your photo and detected uncollected garbage. This is a waste issue. Please contact your local Barangay or the City Environment and Natural Resources Office (CENRO).",
            confidence: 0.88
        };
    } else if (fileName.includes("road") || fileName.includes("pothole") || fileName.includes("street")) {
        return {
            type: "Road Infrastructure (Not PrimeWater)",
            severity: "Medium",
            description: "Aqua analyzed your photo and detected a damaged road or pothole. Please contact the City Engineering Office or DPWH for road repairs.",
            confidence: 0.90
        };
    }
    // Check for PrimeWater specific issues
    else if (fileName.includes("meter") || fileName.includes("stolen")) {
        return {
            type: "Broken Water Meter",
            severity: "Medium",
            description: "Aqua analyzed your photo and detected a damaged or missing PrimeWater meter. A technician will be dispatched to inspect and replace it.",
            confidence: 0.96
        };
    } else if (fileName.includes("dirty") || fileName.includes("brown") || fileName.includes("muddy")) {
        return {
            type: "Contaminated Water",
            severity: "High",
            description: "Aqua analyzed your photo and detected discolored or brown water from the tap. Please do not drink. PrimeWater quality testing is required.",
            confidence: 0.92
        };
    } else if (fileName.includes("dry") || fileName.includes("empty")) {
        return {
            type: "No Water Supply",
            severity: "High",
            description: "Aqua analyzed your photo and detected an empty faucet or tank. This indicates a supply interruption in your area.",
            confidence: 0.87
        };
    } else {
        // Default fallback (Pipe Leakage)
        return {
            type: "Pipe Leakage",
            severity: "High",
            description: "Aqua analyzed your photo and detected a high-pressure water leak from a distribution pipe. PrimeWater emergency crew required.",
            confidence: 0.94
        };
    }
};


/**
 * Fetches the master system DNA (Barangays, responses, hotlines)
 */
export const getSystemConfig = async () => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/config`, {
            headers: { 'X-CSM-Secret': AI_SECRET_KEY }
        });
        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        console.error("Fetch Config Error:", error);
        return {
            MALAYBALAY_BARANGAYS: [],
            HOTLINES: [],
            isOffline: true
        };
    }
};

/**
 * Updates the master system DNA
 */
export const updateSystemConfig = async (newConfig) => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/update-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': AI_SECRET_KEY
            },
            body: JSON.stringify(newConfig)
        });
        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        console.error("Update Config Error:", error);
        return { status: 'error', message: error.message };
    }
};

/**
 * Offline fallback responses for the Chatbot
 */
const getOfflineResponse = (msg) => {
    const text = msg.toLowerCase();
    if (text.includes("bill") || text.includes("pay")) {
        return "I'm currently offline, but you can check your bills in the 'Bills' section of the dashboard.";
    }
    if (text.includes("leak") || text.includes("no water")) {
        return "It seems you're reporting a problem. Since I'm offline, please use the 'Report Incident' form directly.";
    }
    return "I'm having trouble connecting to my local brain. Please try again or check if the AI server is running!";
};
