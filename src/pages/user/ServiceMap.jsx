import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../utils/supabaseClient';
import Sidebar from '../../components/Sidebar';
import DashboardHeader from '../../components/common/DashboardHeader';
import { Map as MapIcon, Navigation, MapPin, Droplets, Info, AlertCircle, ChevronRight } from 'lucide-react';
import L from 'leaflet';

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

// Custom Icons for Status
const incidentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to handle map centering on user
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 14, {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, map]);
    return null;
}

export default function ServiceMap() {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [barangays, setBarangays] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Center of Malaybalay City, Bukidnon
    const defaultCenter = [8.1299, 125.1320];

    useEffect(() => {
        fetchIncidents();
        fetchBarangays();
        detectLocation();
        const storedUser = localStorage.getItem('smart_csm_current_user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const fetchBarangays = async () => {
        try {
            const response = await fetch('/data/malaybalay-barangays.json');
            const data = await response.json();
            setBarangays(data);
        } catch (err) {
            console.error('Error loading geojson:', err);
        }
    };

    const fetchIncidents = async () => {
        try {
            setLoading(true);
            // Fetch only active/pending incidents for the service map
            const { data, error } = await supabase
                .from('incidents')
                .select('*')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .neq('status', 'Resolved');

            if (error) throw error;
            setIncidents(data || []);
        } catch (err) {
            console.error('Error fetching incidents:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const detectLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    // Suppress noisy console error for simple permission denial
                    if (error.code !== error.PERMISSION_DENIED) {
                        console.error("Error detecting location:", error);
                    }
                }
            );
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title="Service Map"
                    subtitle="Real-time water service and maintenance view"
                    icon={<MapIcon size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                <div className="max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden h-[600px] relative z-0">
                                <MapContainer
                                    center={userLocation || defaultCenter}
                                    zoom={12}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    {barangays && (
                                        <GeoJSON
                                            key={`geojson-${incidents.length}`}
                                            data={barangays}
                                            style={(feature) => {
                                                const hasOutage = incidents.some(i =>
                                                    i.location?.toLowerCase().includes(feature.properties.name.toLowerCase())
                                                );
                                                return {
                                                    fillColor: hasOutage ? '#ef4444' : '#3b82f6',
                                                    fillOpacity: hasOutage ? 0.2 : 0.05,
                                                    color: hasOutage ? '#ef4444' : '#3b82f6',
                                                    weight: 1,
                                                    dashArray: '3'
                                                };
                                            }}
                                        />
                                    )}

                                    {userLocation && (
                                        <Marker position={userLocation} icon={userIcon}>
                                            <Popup>
                                                <div className="text-center">
                                                    <p className="font-bold text-blue-600">Your Current Location</p>
                                                    <p className="text-xs text-slate-500">Service area: Malaybalay City</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )}

                                    {incidents.map((incident) => (
                                        <Marker
                                            key={incident.id}
                                            position={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
                                            icon={incidentIcon}
                                        >
                                            <Popup>
                                                <div className="min-w-[200px]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                                                            <AlertCircle size={14} />
                                                        </div>
                                                        <h4 className="font-bold text-slate-800">{incident.type}</h4>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-2">{incident.location}</p>
                                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                                        "{incident.description}"
                                                    </p>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                                                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wide">
                                                            {incident.status || 'Active'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {userLocation && <ChangeView center={userLocation} />}
                                </MapContainer>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div
                                className="floating-card p-6 shadow-2xl"
                                style={{ backgroundColor: '#2563eb', color: 'white' }}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-white/30 rounded-2xl">
                                        <Navigation size={24} />
                                    </div>
                                    <h3 className="font-black text-lg text-white">Nearby Issues</h3>
                                </div>
                                <p className="font-bold text-sm mb-6 leading-relaxed text-white">
                                    Showing {incidents.length} active maintenance or reported issues in your area.
                                </p>
                                <button
                                    onClick={detectLocation}
                                    className="w-full py-3 bg-white text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Recenter My Location
                                </button>
                            </div>

                            <div
                                onClick={() => navigate('/info-hub#territory')}
                                className="floating-card p-6 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 transition-all active:scale-[0.98] group"
                            >
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 border-b border-slate-100 pb-4 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Info size={16} className="text-blue-600" />
                                        Legend
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-none">Your Location</p>
                                            <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">GPS Detected</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                                            <Droplets size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 leading-none">Active Issues</p>
                                            <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">Maintenance / Leaks</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                                    "Stay informed about your local water network health. We update this map every 15 minutes."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
