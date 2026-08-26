// utils/sms.js
// SMS Service Integration

/**
 * Send an SMS to a specific phone number using the provided API key.
 * Currently uses a generic placeholder structure until the exact provider is confirmed.
 */
export const sendSMS = async (phoneNumber, message) => {
    const apiKey = import.meta.env.VITE_SMS_API_KEY;

    if (!apiKey) {
        console.warn('VITE_SMS_API_KEY is missing. Mock SMS logged to console:', { phoneNumber, message });
        return { success: false, message: 'SMS API key missing in environment variables.' };
    }

    if (!phoneNumber) {
        return { success: false, message: 'No phone number provided.' };
    }

    try {
        console.log(`[SMS Gateway] Sending SMS to ${phoneNumber}...`, message);
        
        // --- PROVIDER IMPLEMENTATION GOES HERE ---
        // For example, if it's Semaphore:
        // const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        //     body: new URLSearchParams({ apikey: apiKey, number: phoneNumber, message: message })
        // });
        // const data = await response.json();
        
        // Temporary mock delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log(`[SMS Gateway] Successfully sent SMS to ${phoneNumber}`);
        return { success: true };
    } catch (error) {
        console.error('SMS Send Error:', error);
        return { success: false, message: error.message };
    }
};
