/**
 * Broadcast advisory SMS via FastAPI + httpSMS (never ship API keys to the browser).
 */
import { formatFastApiDetail } from './formatApiError';

const NOTIFY_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000';
const NOTIFY_SECRET = import.meta.env.VITE_CSM_AI_SECRET || 'csm_secure_ai_access_2024';

/**
 * @param {object} announcement
 * @param {object[]} users
 * @param {{ batchId?: string, contextType?: string, contextId?: string, createdBy?: string }} [deliveryMeta]
 */
export const broadcastSmsToResidents = async (announcement, users, deliveryMeta = {}) => {
    const targetUsers = users.filter((u) => u.role === 'customer' && u.phone);

    if (targetUsers.length === 0) {
        console.warn('No registered users with valid phone numbers to send SMS to.');
        return { success: false, message: 'No registered phone numbers found.', count: 0, failedCount: 0 };
    }

    const messageTemplate = `PRIMEWATER ALERT\n[${announcement.type.toUpperCase()}]\n\n${announcement.title}\n\n${announcement.content}`;
    const phones = targetUsers.map((u) => u.phone);

    try {
        const res = await fetch(`${NOTIFY_BASE}/notify/sms-bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': NOTIFY_SECRET,
            },
            body: JSON.stringify({
                phones,
                content: messageTemplate,
                batch_id: deliveryMeta.batchId || null,
                context_type: deliveryMeta.contextType || null,
                context_id: deliveryMeta.contextId != null ? String(deliveryMeta.contextId) : null,
                created_by: deliveryMeta.createdBy || null,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error('[SMS broadcast] API error', res.status, data);
            const msg = formatFastApiDetail(
                data.detail,
                typeof data.message === 'string' ? data.message : res.statusText
            );
            return {
                success: false,
                message: msg,
                count: 0,
                failedCount: phones.length,
            };
        }

        const successCount = data.successCount ?? 0;
        const failedCount = data.failedCount ?? 0;

        return {
            success: Boolean(data.success),
            count: successCount,
            failedCount,
            results: data.results,
        };
    } catch (error) {
        console.error('SMS Broadcast Failed:', error);
        return { success: false, message: error.message, count: 0, failedCount: phones.length };
    }
};
