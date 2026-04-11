const fs = require('fs');

const barangays = [
    "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5",
    "Barangay 6", "Barangay 7", "Barangay 8", "Barangay 9", "Barangay 10", "Barangay 11",
    "Aglayan", "Apo Macote", "Bangcud", "Busdi", "Cabangahan", "Caburacanan",
    "Can-ayan", "Capitan Angel", "Casisang", "Dalwangan", "Imbayao", "Indalasa",
    "Kalaisan", "Kalasungay", "Kibalabag", "Kulaman", "Laguitas", "Linabo",
    "Magsaysay", "Maligaya", "Managok", "Manalog",
    "Mapayag", "Mapulo", "Patpat", "Saint Peter",
    "San Jose", "San Martin", "Santo Niño", "Silae",
    "Simaya", "Sinanglanan", "Sumpong", "Tigbasan", "Zamboanguita"
];

const centerLng = 125.1320;
const centerLat = 8.1299;
const spacing = 0.035; // ~3.5km spacing

const features = barangays.map((name, index) => {
    // 7x7 grid layout relative to center
    const row = Math.floor(index / 7) - 3;
    const col = (index % 7) - 3;

    // Add random jitter to make borders look natural and map-like
    const jitterX = (Math.random() - 0.5) * 0.015;
    const jitterY = (Math.random() - 0.5) * 0.015;

    const baseLng = centerLng + (col * spacing) + jitterX;
    const baseLat = centerLat + (row * spacing) + jitterY;

    // Create a polygon roughly 3km x 3km
    const halfWidth = 0.015;

    return {
        type: "Feature",
        properties: {
            name: name,
            id: name.toLowerCase().replace(/\s+/g, '-')
        },
        geometry: {
            type: "Polygon",
            coordinates: [[
                [baseLng - halfWidth, baseLat - halfWidth],
                [baseLng + halfWidth, baseLat - halfWidth + (Math.random() * 0.005)],
                [baseLng + halfWidth - (Math.random() * 0.005), baseLat + halfWidth],
                [baseLng - halfWidth, baseLat + halfWidth],
                [baseLng - halfWidth, baseLat - halfWidth]
            ]]
        }
    };
});

const geojson = {
    type: "FeatureCollection",
    features: features
};

fs.writeFileSync('malaybalay-barangays.json', JSON.stringify(geojson, null, 2));
console.log(`Successfully generated GeoJSON for ${features.length} barangays.`);
