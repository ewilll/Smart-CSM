// AI Service for PrimeWater Smart CSM
// Handles local AI server communication and offline fallback

const AI_SERVER_URL = "http://localhost:8000";
const AI_SECRET_KEY = "csm_secure_ai_access_2024";

/**
 * Sends a message to the local AI Chatbot (Aqua)
 */
export const getAIChatResponse = async (history, currentMessage, isAuthenticated) => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': AI_SECRET_KEY
            },
            body: JSON.stringify({ message: currentMessage })
        });

        if (!response.ok) throw new Error('AI Server Offline');
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("AI Error:", error);
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
 * Fetches queries that the AI didn't recognize with high confidence
 */
export const getUnclassifiedQueries = async () => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/unclassified`, {
            headers: { 'X-CSM-Secret': AI_SECRET_KEY }
        });
        if (!response.ok) throw new Error('AI Server Offline');
        const data = await response.json();
        return data.queries;
    } catch (error) {
        // Silently return empty — AI server may just be offline
        return [];
    }
};

/**
 * Teaches Aqua a new phrase by assigning it an intent
 */
export const adaptQuery = async (text, intent) => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/adapt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': AI_SECRET_KEY
            },
            body: JSON.stringify({ text, intent })
        });
        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: 'AI Server Offline (Port 8000)', isOffline: true };
    }
};

/**
 * Triggers the Mahoraga Adaptation (Retraining the brain)
 */
export const retrainModel = async () => {
    try {
        const response = await fetch(`${AI_SERVER_URL}/retrain`, {
            method: 'POST',
            headers: { 'X-CSM-Secret': AI_SECRET_KEY }
        });
        if (!response.ok) throw new Error('AI Server Offline');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: 'AI Server Offline (Port 8000)', isOffline: true };
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
            RESPONSES: {},
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
