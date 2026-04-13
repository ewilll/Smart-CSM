/**
 * Work-queue priority (1 = lowest, 10 = highest) aligned with capstone triage:
 * incident type, severity, critical keywords, and nearby same-type reports (24h feed).
 */

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lat1, lon1, lat2, lon2) {
    const a1 = (Number(lat1) * Math.PI) / 180;
    const a2 = (Number(lat2) * Math.PI) / 180;
    const d1 = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const d2 = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
    const x =
        Math.sin(d1 / 2) * Math.sin(d1 / 2) +
        Math.cos(a1) * Math.cos(a2) * Math.sin(d2 / 2) * Math.sin(d2 / 2);
    return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function normalizeTypeKey(type) {
    const s = String(type || '').toLowerCase();
    if (s.includes('contamin') || s.includes('quality') || s.includes('brown') || s.includes('dirty water')) return 'quality';
    if (s.includes('no water') || s.includes('supply') || s.includes('no supply')) return 'supply';
    if (s.includes('leak') || s.includes('burst') || s.includes('pipe')) return 'leak';
    if (s.includes('illegal') || s.includes('theft') || s.includes('tapping')) return 'theft';
    if (s.includes('meter')) return 'meter';
    if (s.includes('maintenance') || s.includes('other')) return 'other';
    return 'general';
}

function basePointsFromType(type) {
    const k = normalizeTypeKey(type);
    const map = {
        quality: 8,
        supply: 8,
        leak: 7,
        theft: 6,
        meter: 4,
        other: 3,
        general: 5,
    };
    return map[k] ?? 5;
}

function severityPoints(severity) {
    const s = String(severity || '').toLowerCase();
    if (s.startsWith('high')) return 2;
    if (s.startsWith('med')) return 1;
    return 0;
}

function keywordBoost(description) {
    const d = String(description || '').toLowerCase();
    let pts = 0;
    const critical = ['hospital', 'school', 'clinic', 'emergency', 'evacuation', 'fire station', 'dialysis'];
    const major = ['burst', 'flood', 'gushing', 'massive', 'main break', 'no water entire', 'brownout water'];
    if (critical.some((w) => d.includes(w))) pts += 2;
    else if (major.some((w) => d.includes(w))) pts += 1;
    return pts;
}

/**
 * Nearby same-category reports in the last 24h (client passes pre-filtered `existingIncidents`).
 * +1 if one other, +2 if two or more (this report would be 3rd+ in cluster).
 */
function recurrencePoints(lat, lng, type, existingIncidents) {
    if (lat == null || lng == null || !Array.isArray(existingIncidents) || existingIncidents.length === 0) return 0;
    const key = normalizeTypeKey(type);
    let n = 0;
    for (const inc of existingIncidents) {
        if (inc.latitude == null || inc.longitude == null) continue;
        if (normalizeTypeKey(inc.type) !== key) continue;
        if (haversineMeters(lat, lng, inc.latitude, inc.longitude) > 500) continue;
        n += 1;
    }
    if (n >= 2) return 2;
    if (n === 1) return 1;
    return 0;
}

/**
 * @param {{ type: string, severity: string, description?: string, latitude?: number|null, longitude?: number|null, existingIncidents?: object[] }} p
 * @returns {number} integer 1–10
 */
export function computeIncidentPriorityScore({
    type,
    severity,
    description = '',
    latitude = null,
    longitude = null,
    existingIncidents = [],
}) {
    let raw =
        basePointsFromType(type) +
        severityPoints(severity) +
        keywordBoost(description) +
        recurrencePoints(latitude, longitude, type, existingIncidents);
    return Math.min(10, Math.max(1, Math.round(raw)));
}

/** Sort: highest priority first, then oldest (FIFO within tier). */
export function compareIncidentsForWorkQueue(a, b) {
    const sa = Number(a.priority_score ?? 5);
    const sb = Number(b.priority_score ?? 5);
    if (sb !== sa) return sb - sa;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
