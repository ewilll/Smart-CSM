import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, MapPin, CheckCircle, Loader2 } from 'lucide-react';

// Fix for default Leaflet icon not working with bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
const MapEvents = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return null;
};

// Component to Auto-center on user's location initially (optional)
const LocationMarker = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} />
    );
}

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation }) {
    const [position, setPosition] = useState(null);
    const [address, setAddress] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Default to Malaybalay City center
    const defaultCenter = [8.1299, 125.1320];

    useEffect(() => {
        if (!isOpen) {
            setPosition(null);
            setAddress('');
        }
    }, [isOpen]);

    const handleLocationSelect = async (latlng) => {
        setPosition(latlng);
        setIsGeocoding(true);
        setAddress('Locating...');

        try {
            // Reverse Geocoding using OpenStreetMap Nominatim API
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data && data.address) {
                // Try to extract the most relevant localized name (village, suburb, town, city)
                const area = data.address.village || data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.town || data.address.city || 'Malaybalay';
                setAddress(area);
            } else {
                setAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
            }
        } catch (error) {
            console.error("Reverse geocoding failed", error);
            setAddress(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleConfirm = () => {
        if (address && address !== 'Locating...') {
            // Make sure to format it specifically mentioning Barangay if it's just a name
            const finalLocation = address.toLowerCase().includes('barangay') ? address : `Barangay ${address}`;
            onSelectLocation(finalLocation);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] p-6 max-w-2xl w-full shadow-2xl animate-scale-up flex flex-col h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <MapPin className="text-blue-600" /> Select Location
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tap anywhere on the map to pin your permanent residence</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400" /></button>
                </div>

                <div className="flex-1 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner relative z-0">
                    <MapContainer
                        center={defaultCenter}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapEvents onLocationSelect={handleLocationSelect} />
                        <LocationMarker position={position} />
                    </MapContainer>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Detected Area</p>
                        {isGeocoding ? (
                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> Analyzing coordinates...
                            </div>
                        ) : (
                            <p className="font-black text-lg text-slate-700 truncate">
                                {address || 'No location selected yet'}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!position || isGeocoding}
                        className="py-4 px-8 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <CheckCircle size={20} /> Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
