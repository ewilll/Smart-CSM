/**
 * OpenStreetMap Nominatim reverse geocoding.
 * https://nominatim.org/release-docs/develop/api/Reverse/
 * Use sparingly (≈1 req/s); suitable for single-user form flows.
 */

function buildShortAddress(address) {
    if (!address || typeof address !== 'object') return '';
    const line = [
        [address.house_number, address.road].filter(Boolean).join(' ').trim(),
        address.village || address.suburb || address.neighbourhood || address.quarter,
        address.city_district || address.town || address.city || address.municipality,
        address.state || address.region,
    ].filter(Boolean);
    return line.join(', ');
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ displayName: string, shortLine: string, locationForForm: string }>}
 */
export async function reverseGeocode(lat, lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        throw new RangeError('Invalid coordinates');
    }
    if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) {
        throw new RangeError('Coordinates out of range');
    }

    const url =
        `https://nominatim.openstreetmap.org/reverse?format=json` +
        `&lat=${encodeURIComponent(latNum)}&lon=${encodeURIComponent(lngNum)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const data = await res.json();
    const shortLine = buildShortAddress(data.address);
    const displayName =
        typeof data.display_name === 'string' && data.display_name.length > 0
            ? data.display_name
            : shortLine || `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`;
    const locationForForm = shortLine || displayName;

    return { displayName, shortLine, locationForForm, address: data.address || null };
}
