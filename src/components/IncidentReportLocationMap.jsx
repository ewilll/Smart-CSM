import React, { useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { reverseGeocode } from '../utils/nominatim';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

try {
    const DefaultIcon = L.icon({
        iconUrl: icon,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;
} catch {
    /* ignore */
}

const DEFAULT_CENTER = [8.1299, 125.1320];

function MapClickLayer({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyTo({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (!center) return;
        map.flyTo(center, zoom ?? 16, { duration: 0.6 });
    }, [center, zoom, map]);
    return null;
}

function isValidCoord(lat, lng) {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );
}

/**
 * @param {{
 *   latitude: number | null,
 *   longitude: number | null,
 *   onLocationChange: (patch: { latitude: number, longitude: number, location?: string }) => void,
 *   labels: { title: string, hint: string, gps: string, locating: string },
 * }} props
 */
export default function IncidentReportLocationMap({ latitude, longitude, onLocationChange, labels }) {
    const hasPin = isValidCoord(latitude, longitude);
    const center = hasPin ? [latitude, longitude] : DEFAULT_CENTER;
    const zoom = hasPin ? 16 : 13;

    const applyCoords = useCallback(
        async (lat, lng) => {
            if (!isValidCoord(lat, lng)) return;
            onLocationChange({ latitude: lat, longitude: lng, location: labels.locating });
            try {
                const r = await reverseGeocode(lat, lng);
                onLocationChange({ latitude: lat, longitude: lng, location: r.locationForForm });
            } catch {
                onLocationChange({
                    latitude: lat,
                    longitude: lng,
                    location: `Near ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                });
            }
        },
        [onLocationChange, labels.locating]
    );

    const mapLabels = useMemo(
        () => ({
            title: labels.title,
            hint: labels.hint,
            gps: labels.gps,
        }),
        [labels.title, labels.hint, labels.gps]
    );

    const useGps = () => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                applyCoords(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                /* parent may show toast — silent here */
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 ml-2">
                <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="text-blue-600 shrink-0" size={16} />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">
                            {mapLabels.title}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{mapLabels.hint}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={useGps}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                >
                    <Navigation size={14} className="shrink-0" />
                    {mapLabels.gps}
                </button>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner h-[240px] sm:h-[280px] relative z-0">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickLayer onPick={applyCoords} />
                    {hasPin && (
                        <>
                            <FlyTo center={center} zoom={16} />
                            <Marker
                                position={[latitude, longitude]}
                                draggable
                                eventHandlers={{
                                    dragend: (e) => {
                                        const ll = e.target.getLatLng();
                                        applyCoords(ll.lat, ll.lng);
                                    },
                                }}
                            >
                                <Popup>
                                    <span className="text-xs font-bold text-slate-700">Incident location</span>
                                </Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
