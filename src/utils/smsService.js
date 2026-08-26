export const sendSmsToUser = async (user, messageTemplate) => {
    const apiKey = import.meta.env.VITE_SMS_API_KEY;

    if (!user || !user.phone) {
        console.warn("No valid phone number for user:", user?.email);
        return { success: false, message: 'No phone number provided.' };
    }

    if (!apiKey) {
        console.log(`[Mock SMS Sent to ${user.phone}] \n${messageTemplate}`);
        window.dispatchEvent(new CustomEvent('sms-sent', { detail: { to: user.phone, message: messageTemplate } }));
        return { success: true };
    }

    try {
        console.log(`[Semaphore API] Sending SMS to ${user.phone}...`);
        
        // Dispatch event for UI demonstration BEFORE fetch in case of CORS or API issues
        window.dispatchEvent(new CustomEvent('sms-sent', { detail: { to: user.phone, message: messageTemplate } }));

        const response = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 
                apikey: apiKey, 
                number: user.phone, 
                message: messageTemplate 
            })
        });
        
        const data = await response.json();
        console.log('[Semaphore API Response]', data);

        return { success: true, data };
    } catch (error) {
        console.error("SMS Send Failed:", error);
        return { success: false, message: error.message };
    }
};

export const broadcastSmsToResidents = async (announcement, users) => {
    console.log("Preparing SMS Broadcast via Semaphore...");

    // Filter to get only customer users who have phone numbers, and optionally match location
    let targetUsers = users.filter(u => u.role === 'customer' && u.phone);

    if (announcement.location) {
        targetUsers = targetUsers.filter(u => 
            u.barangay && u.barangay.toLowerCase() === announcement.location.toLowerCase()
        );
    }

    if (targetUsers.length === 0) {
        console.warn("No registered users with valid phone numbers in the target location.");
        return { success: false, message: 'No registered phone numbers found.' };
    }

    const messageTemplate = `PRIMEWATER ALERT\n[${announcement.type.toUpperCase()}]\nLocation: ${announcement.location || 'All Areas'}\n\n${announcement.title}\n\n${announcement.content}`;

    const sendPromises = targetUsers.map(user => sendSmsToUser(user, messageTemplate));

    try {
        await Promise.all(sendPromises);
        console.log(`[SMS Broadcast] Successfully sent to ${targetUsers.length} numbers.`);
        return { success: true, count: targetUsers.length };
    } catch (error) {
        console.error("SMS Broadcast Failed:", error);
        return { success: false, message: error.message };
    }
};
