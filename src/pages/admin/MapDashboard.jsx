import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../utils/supabaseClient';
import Sidebar from '../../components/Sidebar';
import DashboardHeader from '../../components/common/DashboardHeader';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon, Navigation, Layers, AlertTriangle } from 'lucide-react';
import L from 'leaflet';
import { compareIncidentsForWorkQueue } from '../../utils/incidentPriority';

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
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


export default function MapDashboard() {
    const [user, setUser] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [barangays, setBarangays] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        setUser(getCurrentUser());
    }, [navigate]);
    // Center of Malaybalay City, Bukidnon
    const defaultCenter = [8.1299, 125.1320];

    const [filterPriority, setFilterPriority] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMapIncident, setSelectedMapIncident] = useState(null);

    useEffect(() => {
        fetchIncidents();
        fetchBarangays();

        const channel = supabase
            .channel('map_incidents')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'incidents' },
                () => {
                    console.log('Incident updated, refreshing map...');
                    fetchIncidents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
            const { data, error } = await supabase
                .from('incidents')
                .select('*')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error) throw error;
            const rows = data || [];
            rows.sort(compareIncidentsForWorkQueue);
            setIncidents(rows);
        } catch (err) {
            console.error('Error fetching incidents:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            fetchIncidents();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const filteredIncidents = incidents.filter(i => {
        const matchesPriority = filterPriority === 'All' || i.severity === filterPriority;
        const matchesSearch = i.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.type?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesPriority && matchesSearch && i.status !== 'Resolved';
    });

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={false} toggleSidebar={() => { }} />

            <main className="dashboard-main !p-0 flex flex-col h-screen overflow-hidden">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    title="Command Center"
                    subtitle="Live Incident Monitoring"
                    icon={<MapIcon size={28} />}
                    iconBgColor="bg-blue-600"
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Left Side: Map Container */}
                    <div className="flex-1 relative">
                        {/* Map Filter Overlay */}
                        <div className="absolute top-6 left-16 z-[1000] flex items-center gap-4">

                            {/* Priority Filters */}
                            <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-2xl border border-slate-100 flex gap-1">
                                {['All', 'High', 'Medium', 'Low'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setFilterPriority(p)}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterPriority === p
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <MapContainer
                            center={defaultCenter}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                            className="z-0"
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
                                        const hasActive = incidents.some(i =>
                                            i.status !== 'Resolved' &&
                                            i.location?.toLowerCase().includes(feature.properties.name.toLowerCase())
                                        );
                                        return {
                                            fillColor: hasActive ? '#ef4444' : '#10b981',
                                            fillOpacity: 0.05,
                                            color: hasActive ? '#ef4444' : '#10b981',
                                            weight: 1,
                                            dashArray: '3'
                                        };
                                    }}
                                />
                            )}

                            {incidents.map((incident) => (
                                <Marker
                                    key={incident.id}
                                    position={[parseFloat(incident.latitude), parseFloat(incident.longitude)]}
                                    icon={incident.status === 'Resolved' ? greenIcon : redIcon}
                                >
                                    <Popup>
                                        <div className="min-w-[240px] p-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-slate-800 text-base m-0 leading-tight">{incident.type}</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${incident.severity === 'High' ? 'bg-rose-100 text-rose-600' :
                                                    incident.severity === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {incident.severity}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold mb-3">{incident.location}</p>

                                            <div className="flex gap-2 mt-4">
                                                {incident.status !== 'Resolved' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(incident.id, 'Dispatched')}
                                                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors"
                                                        >
                                                            Dispatch
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(incident.id, 'Resolved')}
                                                            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                                                        >
                                                            Resolve
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Right Side: Incident List Side Panel */}
                    <div className="w-96 bg-white border-l border-slate-100 flex flex-col shadow-2xl z-10">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="text-xl font-black text-slate-800 mb-4">Active Queue</h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search location..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold placeholder:text-slate-400 focus:bg-white focus:border-blue-500 transition-all outline-none"
                                />
                                <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {filteredIncidents.length > 0 ? (
                                filteredIncidents.map(incident => (
                                    <div
                                        key={incident.id}
                                        className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer bg-white"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${incident.severity === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                {incident.severity} Priority
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <h5 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors mb-1">{incident.type}</h5>
                                        <p className="text-xs text-slate-500 font-medium mb-3 line-clamp-1">{incident.location}</p>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                <span className="text-[10px] font-black uppercase text-slate-400">{incident.status || 'Pending'}</span>
                                            </div>
                                            <button className="p-1 text-slate-300 hover:text-blue-600 transition-colors">
                                                <Navigation size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <AlertTriangle className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Incidents</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
