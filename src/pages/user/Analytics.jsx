import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    Search,
    Bell,
    ChevronDown,
    TrendingUp,
    BarChart,
    Calendar,
    Filter,
    Activity
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import DashboardHeader from '../../components/common/DashboardHeader';

export default function Analytics() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [consumptionData, setConsumptionData] = useState([]);
    const [stats, setStats] = useState({ uptime: 100, activeOutages: 0, maintenanceLogs: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        fetchAnalytics(currentUser.id);

        // Real-time synchronization
        const incidentChannel = supabase
            .channel('analytics_incidents')
            .on('postgres_changes', { event: '*', table: 'incidents' }, () => fetchAnalytics(currentUser.id))
            .subscribe();

        const billChannel = supabase
            .channel('analytics_bills')
            .on('postgres_changes', { event: '*', table: 'bills', filter: `user_id=eq.${currentUser.id}` }, () => fetchAnalytics(currentUser.id))
            .subscribe();

        return () => {
            supabase.removeChannel(incidentChannel);
            supabase.removeChannel(billChannel);
        };
    }, [navigate]);

    const fetchAnalytics = async (userId) => {
        try {
            setLoading(true);

            // Fetch Bills for Consumption Trend
            const { data: billData } = await supabase
                .from('bills')
                .select('amount, reading_date')
                .eq('user_id', userId)
                .order('reading_date', { ascending: false })
                .limit(7);

            // Mocking conversion from amount to m3 (e.g., 50 pesos per m3)
            const m3Data = (billData || []).map(b => ({
                val: Math.round(b.amount / 50),
                day: new Date(b.reading_date).toLocaleDateString('en-US', { weekday: 'short' })[0]
            })).reverse();
            setConsumptionData(m3Data);

            // Fetch Active Incidents for Network Availability
            const { data: activeIncidents } = await supabase
                .from('incidents')
                .select('*')
                .neq('status', 'Resolved');

            // Fetch Recent Maintenance (Resolved or In-Progress)
            const { data: logs } = await supabase
                .from('incidents')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            const outageCount = activeIncidents?.length || 0;
            const calculatedUptime = Math.max(95, 100 - (outageCount * 0.8)).toFixed(1);

            setStats({
                uptime: calculatedUptime,
                activeOutages: outageCount,
                maintenanceLogs: logs || []
            });

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title="System Status"
                    subtitle="Real-time Service Monitoring"
                    icon={<BarChart size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                {/* Additional Status Row for Analytics */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Network Online</span>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 mb-10">
                    <div className="flex items-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl shadow-blue-900/5 font-black text-xs uppercase tracking-widest text-slate-600">
                        <Calendar size={18} className="text-blue-600" />
                        <span>Today: Feb 18, 2026</span>
                    </div>
                    <div className="flex items-center gap-3 px-8 py-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl shadow-blue-900/5 font-black text-xs uppercase tracking-widest text-emerald-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>Zone 4: Stable</span>
                    </div>
                </div>

                {/* Usage Charts Grid */}
                <div className="grid lg:grid-cols-2 gap-10 mb-10">
                    <div
                        onClick={() => navigate('/bills')}
                        className="floating-card p-10 flex flex-col group cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 transition-all active:scale-[0.99]"
                    >
                        <div className="card-header pb-6 border-b border-slate-100/50 mb-10 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Your Consumption Trend (m³)</h3>
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Personal Usage</div>
                        </div>
                        <div className="flex items-end justify-between h-[300px] px-4 gap-4">
                            {consumptionData.length > 0 ? consumptionData.map((item, i) => (
                                <div key={i} className="flex flex-col items-center flex-1 group/bar">
                                    <div className="relative w-full flex flex-col items-center">
                                        <div className="absolute bottom-full mb-3 opacity-0 group-hover/bar:opacity-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-lg">
                                            {item.val}m³
                                        </div>
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-full shadow-lg shadow-blue-500/20 transition-all duration-1000 ease-out"
                                            style={{ height: `${Math.min(item.val * 10, 250)}px` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 mt-6 uppercase tracking-[0.2em]">{item.day}</span>
                                </div>
                            )) : (
                                <div className="w-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <Activity size={48} className="opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Usage cycles</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/service-map')}
                        className="floating-card p-10 flex flex-col group cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 transition-all active:scale-[0.99]"
                    >
                        <div className="card-header pb-6 border-b border-slate-100/50 mb-10 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Network Availability</h3>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Excellent</span>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1">
                            <div className="relative h-64 w-64 group-hover:scale-105 transition-transform duration-500">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="128" cy="128" r="110" fill="none" stroke="#f1f5f9" strokeWidth="24" />
                                    <circle cx="128" cy="128" r="110" fill="none" stroke="url(#blueGrad)" strokeWidth="24" strokeDasharray="691" strokeDashoffset="69" strokeLinecap="round" className="drop-shadow-xl" />
                                    <defs>
                                        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#2563eb" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-slate-800 tracking-tighter">{stats.uptime}%</span>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-2">Active Uptime</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-10 mt-12 w-full max-w-xs">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-slate-800 leading-none mb-2">{(stats.uptime * 12.48).toFixed(0)}h</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Continuous Supply</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-black text-emerald-500 leading-none mb-2">{stats.activeOutages}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Outages</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Log */}
                <div className="floating-card p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">Live Maintenance Log</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Active work in your neighborhood</p>
                        </div>
                        <button
                            onClick={() => navigate('/service-map')}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                            View Coverage Map
                        </button>
                    </div>
                    <div className="space-y-4">
                        {stats.maintenanceLogs.length > 0 ? stats.maintenanceLogs.map((log, i) => (
                            <div key={i} className="flex items-center gap-6 p-6 rounded-[28px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                                <div className="text-3xl">{log.status === 'Resolved' ? '✅' : '🚧'}</div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 text-sm mb-1">{log.type}</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{log.location} • {new Date(log.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${log.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    {log.status}
                                </div>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No recent maintenance activity logged.</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
