/**
 * Turn FastAPI / Starlette `detail` (string | object | array of { msg, type, loc, input }) into a plain string for UI.
 */
export function formatFastApiDetail(detail, fallback = 'Request failed') {
    if (detail == null || detail === '') return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const parts = detail.map((item) => {
            if (item == null) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item.msg != null) {
                const loc = Array.isArray(item.loc) ? item.loc.filter(Boolean).join(' → ') : '';
                return loc ? `${loc}: ${item.msg}` : String(item.msg);
            }
            try {
                return JSON.stringify(item);
            } catch {
                return String(item);
            }
        });
        const s = parts.filter(Boolean).join('; ');
        return s || fallback;
    }
    if (typeof detail === 'object') {
        if (detail.msg != null) return String(detail.msg);
        try {
            return JSON.stringify(detail);
        } catch {
            return fallback;
        }
    }
    return String(detail);
}
