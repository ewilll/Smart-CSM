/**
 * Calls Smart CSM FastAPI (port 8000) /notify/* — keys stay on the server only.
 * Set VITE_AI_SERVER_URL if the API is not on localhost:8000.
 * Optional VITE_CSM_AI_SECRET must match server CSM_API_SECRET (default capstone value if unset).
 */
import { formatFastApiDetail } from './formatApiError';

const NOTIFY_BASE = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000';
const NOTIFY_SECRET = import.meta.env.VITE_CSM_AI_SECRET || 'csm_secure_ai_access_2024';

async function postNotify(path, jsonBody) {
    try {
        const res = await fetch(`${NOTIFY_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSM-Secret': NOTIFY_SECRET,
            },
            body: JSON.stringify(jsonBody),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error('[notify]', path, res.status, data);
            const detailStr = formatFastApiDetail(data?.detail, res.statusText);
            return { ok: false, status: res.status, ...data, detail: detailStr };
        }
        return { ok: true, ...data };
    } catch (e) {
        console.error('[notify]', path, e);
        return { ok: false, error: e?.message || String(e) };
    }
}

/**
 * @param {{ phone?: string|null, email?: string|null, smsBody: string, emailSubject: string, emailBody: string, batchId?: string|null, contextType?: string|null, contextId?: string|null, createdBy?: string|null }} params
 */
export async function sendIncidentStatusNotifications({
    phone,
    email,
    smsBody,
    emailSubject,
    emailBody,
    batchId,
    contextType,
    contextId,
    createdBy,
}) {
    const body = {
        phone: phone || null,
        email: email || null,
        sms_body: smsBody,
        email_subject: emailSubject,
        email_body: emailBody,
        send_sms: Boolean(phone),
        send_email: Boolean(email),
        batch_id: batchId || null,
        context_type: contextType || null,
        context_id: contextId != null ? String(contextId) : null,
        created_by: createdBy || null,
    };
    return postNotify('/notify/incident-update', body);
}

/**
 * After a resident submits a report — same transport as status updates, different copy.
 * @param {{ phone?: string|null, email?: string|null, incidentId?: string, type: string, location: string, batchId?: string|null, contextType?: string|null, contextId?: string|null, createdBy?: string|null }} params
 */
export async function sendIncidentAcknowledgment({
    phone,
    email,
    incidentId,
    type,
    location,
    batchId,
    contextType,
    contextId,
    createdBy,
}) {
    const shortId = String(incidentId || '').slice(0, 8);
    const smsBody =
        `PRIMEWATER: We received your report (ref ${shortId}). ` +
        `Type: ${type}. Location: ${location}. You will get updates as we process it.`;
    const emailSubject = `PrimeWater Smart CSM — Report received (${shortId})`;
    const emailBody =
        `${smsBody}\n\nThank you for helping keep Malaybalay's water service transparent.\n\n— PrimeWater Malaybalay (Smart CSM)`;
    return sendIncidentStatusNotifications({
        phone,
        email,
        smsBody,
        emailSubject,
        emailBody,
        batchId,
        contextType: contextType || 'incident_ack',
        contextId: contextId ?? incidentId,
        createdBy,
    });
}

/**
 * Broadcast same advisory to many emails (server paces sends for Gmail).
 * @param {{ emails: string[], subject: string, body: string, batchId?: string|null, contextType?: string|null, contextId?: string|null, createdBy?: string|null }} params
 */
export async function sendBroadcastEmails({ emails, subject, body, batchId, contextType, contextId, createdBy }) {
    const list = (emails || []).map((e) => String(e).trim()).filter((e) => e.includes('@'));
    if (list.length === 0) {
        return { ok: true, successCount: 0, failedCount: 0, total: 0, skipped: true };
    }
    return postNotify('/notify/email-bulk', {
        emails: list,
        subject,
        body,
        batch_id: batchId || null,
        context_type: contextType || null,
        context_id: contextId != null ? String(contextId) : null,
        created_by: createdBy || null,
    });
}

/** Re-send a failed row logged in delivery_logs (admin UI). */
export async function retryDeliveryLog(deliveryLogId) {
    return postNotify('/notify/retry-delivery', { delivery_log_id: deliveryLogId });
}

/**
 * Transactional signup mail via FastAPI + Gmail (same secret as other notify calls).
 * Use when Supabase does not send (e.g. duplicate-email response) or as a backup / welcome.
 * @param {{ to: string, kind: 'pending_confirmation' | 'welcome', displayName?: string, siteOrigin?: string }} params
 */
export async function sendSignupRelatedEmail({ to, kind, displayName, siteOrigin }) {
    const addr = String(to || '').trim();
    if (!addr.includes('@')) {
        return { ok: false, skipped: true };
    }
    const origin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    const name = String(displayName || '').trim() || 'there';
    if (kind === 'pending_confirmation') {
        const body =
            `Hi ${name},\n\n` +
            `We received your registration for PrimeWater Smart CSM.\n\n` +
            `You should also get a separate message from our sign-in provider with a link to confirm your email ` +
            `(the sender may look like a Supabase address). Check Spam or Promotions.\n\n` +
            `If nothing arrives within a few minutes, open ${origin}/signup, enter the same email, and tap ` +
            `"Resend confirmation email".\n\n` +
            `— PrimeWater Malaybalay (Smart CSM)`;
        return postNotify('/notify/email', {
            to: addr,
            subject: 'PrimeWater Smart CSM — Confirm your email',
            body,
            context_type: 'signup_pending_confirmation',
        });
    }
    if (kind === 'welcome') {
        const body =
            `Hi ${name},\n\n` +
            `Your PrimeWater Smart CSM account is ready. You can sign in anytime at ${origin}/login.\n\n` +
            `— PrimeWater Malaybalay (Smart CSM)`;
        return postNotify('/notify/email', {
            to: addr,
            subject: 'Welcome to PrimeWater Smart CSM',
            body,
            context_type: 'signup_welcome',
        });
    }
    return { ok: false, skipped: true };
}
