import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import { supabase } from '../../utils/supabaseClient';
import {
    Search,
    Bell,
    MessageSquare,
    ChevronDown,
    MoreHorizontal,
    Activity,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Zap,
    MapPin,
    Users,
    Droplets
} from 'lucide-react';

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SkeletonCard, SkeletonCircle, SkeletonText } from '../../components/SkeletonLoader';
import ServiceTracker from '../../components/ServiceTracker';
import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

const PulseMetric = ({ label, value, icon: Icon, color }) => (
    <div
        className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm"
    >
        <div className={`p-2 ${color} text-white rounded-lg`}>
            <Icon size={14} />
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-black text-slate-900 leading-none">{value}</p>
        </div>
    </div>
);

export default function UserDashboard() {
    const { language } = usePreferences();
    const { t } = useTranslation(language);
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unpaidBill, setUnpaidBill] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [announcements, setAnnouncements] = useState([]);
    const [userIncidents, setUserIncidents] = useState([
        {
            id: 'INC-882194',
            title: 'Water Leakage Block B',
            date: 'Today, 10:30 AM',
            status: 'In Progress',
            progress: 65,
            evidence: 'https://images.unsplash.com/photo-1585938389612-a552a28d6914?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'
        },
        {
            id: 'INC-882190',
            title: 'Low Pressure Kitchen',
            date: 'Yesterday, 4:15 PM',
            status: 'Pending',
            progress: 15,
            evidence: null
        }
    ]);
    const [loading, setLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleNotificationClick = (type) => {
        setShowNotifications(false);
        switch (type) {
            case 'alert':
                navigate('/public-log');
                break;
            case 'admin':
                navigate('/messages');
                break;
            case 'bill':
                navigate('/bills');
                break;
            default:
                break;
        }
    };

    const [stats, setStats] = useState([
        { label: t('total_incidents'), value: "0", change: "Live", trend: "up", icon: <Activity />, color: "bg-blue-500" },
        { label: t('pending'), value: "0", change: "Active", trend: "down", icon: <Clock />, color: "bg-amber-500" },
        { label: t('in_progress'), value: "0", change: "Active", trend: "up", icon: <AlertCircle />, color: "bg-blue-600" },
        { label: t('resolved'), value: "0", change: "Success", trend: "up", icon: <CheckCircle />, color: "bg-emerald-500" },
    ]);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        document.title = "Resident Dashboard | Smart CSM";

        // Initial fetch
        fetchUserStats(currentUser);

        // Subscribe to real-time changes
        const incidentChannel = supabase
            .channel(`user_incidents_${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                table: 'incidents',
                filter: `user_id=eq.${currentUser.id}`
            }, () => {
                fetchUserStats(currentUser);
            })
            .subscribe();

        const billChannel = supabase
            .channel(`user_bills_${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                table: 'bills',
                filter: `user_id=eq.${currentUser.id}`
            }, () => {
                fetchUserStats(currentUser);
            })
            .subscribe();

        fetchAnnouncements();
        const announcementChannel = supabase
            .channel('public_announcements')
            .on('postgres_changes', { event: '*', table: 'announcements' }, fetchAnnouncements)
            .subscribe();

        return () => {
            supabase.removeChannel(incidentChannel);
            supabase.removeChannel(billChannel);
            supabase.removeChannel(announcementChannel);
        };
    }, [navigate]);

    const fetchUserStats = async (currentUser) => {
        try {
            // 1. Fetch Incidents
            const { data: incidentData } = await supabase
                .from('incidents')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (incidentData) {
                // Map database fields to UI expected fields
                const mappedIncidents = incidentData.map(inc => ({
                    id: inc.id.slice(0, 8),
                    title: inc.type,
                    date: new Date(inc.created_at).toLocaleString(),
                    status: inc.status,
                    progress: inc.status === 'Resolved' ? 100 :
                        inc.status === 'On-Site' ? 75 :
                            inc.status === 'Dispatched' ? 50 :
                                inc.status === 'In Progress' ? 25 : 10,
                    evidence: inc.evidence_url || null
                }));
                setUserIncidents(mappedIncidents);

                const inProgressCount = incidentData.filter(i => i.status !== 'Resolved').length;
                const resolvedCount = incidentData.filter(i => i.status === 'Resolved').length;

                setStats([
                    { label: t('active_incidents'), value: inProgressCount.toString(), change: "Live", trend: "up", icon: <Activity />, color: "bg-blue-500" },
                    { label: t('resolved'), value: resolvedCount.toString(), change: "Success", trend: "up", icon: <CheckCircle />, color: "bg-emerald-500" },
                    { label: t('consumption'), value: "24.5m³", change: "-12%", trend: "down", icon: <Zap />, color: "bg-blue-600" },
                    { label: t('pending_bill'), value: "₱0", change: "Due Soon", trend: "up", icon: <Clock />, color: "bg-amber-500" },
                ]);
            }

            // 2. Fetch Unpaid Bills
            const { data: billData } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('status', 'Unpaid')
                .order('due_date', { ascending: true })
                .limit(1);

            if (billData && billData.length > 0) {
                setUnpaidBill(billData[0]);
                setStats(prev => prev.map(s =>
                    s.label === t('pending_bill')
                        ? { ...s, value: `₱${billData[0].amount.toLocaleString()}` }
                        : s
                ));
            } else {
                setUnpaidBill(null);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (!error && data) setAnnouncements(data);
    };

    const [flowData, setFlowData] = useState(() => 
        Array.from({ length: 15 }, (_, i) => ({
            time: new Date(Date.now() - (14 - i) * 2000).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
            value: Math.floor(Math.random() * 20) + 30
        }))
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setFlowData(prev => {
                const newData = [...prev.slice(1)];
                const lastVal = prev[prev.length - 1].value;
                const fluctuation = (Math.random() - 0.5) * 10;
                let nextVal = Math.max(10, Math.min(80, lastVal + fluctuation));
                newData.push({
                    time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
                    value: Math.round(nextVal)
                });
                return newData;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'In Progress': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'Dispatched': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
            case 'On-Site': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'High': return 'bg-rose-100 text-rose-600';
            case 'Medium': return 'bg-amber-100 text-amber-600';
            case 'Low': return 'bg-emerald-100 text-emerald-600';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    if (!user) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            <main className="dashboard-main overflow-y-auto">
                <div className="w-full">
                    <DashboardHeader
                        user={user}
                        onUpdateUser={setUser}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        showNotifications={showNotifications}
                        setShowNotifications={setShowNotifications}
                        placeholder={t('search_placeholder')}
                        toggleSidebar={toggleSidebar}
                    />
                    {/* Dashboard Hero - Clean Welcome Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('resident_dashboard')}</p>
                            <h2 className="text-2xl font-black text-slate-900 mb-1">{t('hello')}, {user.name?.split(' ')[0] || 'Resident'}! 👋</h2>
                            <p className="text-sm text-slate-500">
                                {t('water_healthy')} {t('active_reports_count', { count: userIncidents.filter(i => i.status !== 'Resolved').length })}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/report-incident'); }}
                                className="btn btn-primary btn-md"
                            >
                                {t('quick_report')}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/history'); }}
                                className="btn btn-outline btn-md"
                            >
                                {t('my_history')}
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <SkeletonCircle size="w-8 h-8" />
                                        <SkeletonText width="w-12" height="h-4" />
                                    </div>
                                    <div className="mt-auto space-y-2">
                                        <SkeletonText width="w-1/2" height="h-3" />
                                        <SkeletonText width="w-3/4" height="h-6" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            stats.map((stat, i) => (
                                <div
                                    key={i}
                                    onClick={() => {
                                        if (stat.label === 'Active Incidents') navigate('/history');
                                        else if (stat.label === 'Consumption') navigate('/analytics');
                                        else if (stat.label === 'Pending Bill') navigate('/bills');
                                        else if (stat.label === 'Resolved') navigate('/history');
                                        else navigate('/analytics');
                                    }}
                                    className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                        <div className="p-1.5 bg-blue-50 rounded-lg">
                                            {React.cloneElement(stat.icon, { size: 16, className: "text-blue-600" })}
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between mt-auto">
                                        <span className="text-2xl font-black text-slate-800">{stat.value}</span>
                                        <span className={`text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Water Flow Chart */}
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-600" /> {t('water_flow_weekly')}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{t('real_time_consumption')}</p>
                            </div>
                            <button onClick={() => navigate('/analytics')} className="btn btn-ghost btn-sm text-blue-600">
                                {t('full_analytics')}
                            </button>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 4, fill: '#2563EB' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Billing Summary Section */}
                    {unpaidBill && (
                        <div className="bg-white border border-rose-100 rounded-xl shadow-sm p-6 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">{t('action_required')}</span>
                                        <span className="text-slate-500 text-xs font-bold">{t('unpaid_bill')}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-1">₱{unpaidBill.amount.toLocaleString()} Due</h3>
                                    <p className="text-slate-600 text-sm">
                                        {t('settle_payment_for')} <span className="font-bold">{new Date(unpaidBill.reading_date).toLocaleDateString(language === 'TG' ? 'tl-PH' : language === 'BI' ? 'ceb-PH' : 'en-US', { month: 'long', year: 'numeric' })}</span> {t('due_before')} {new Date(unpaidBill.due_date).toLocaleDateString(language === 'TG' ? 'tl-PH' : language === 'BI' ? 'ceb-PH' : 'en-US')}.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate('/bills')}
                                        className="btn btn-outline btn-md"
                                    >
                                        {t('view_details')}
                                    </button>
                                    <button
                                        onClick={() => navigate('/bills')}
                                        className="btn btn-primary btn-md flex items-center gap-2"
                                    >
                                        {t('secure_payment')} <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Incidents & Progress Tracking */}
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{t('incident_tracking')}</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Real-time Updates</p>
                            </div>
                            <button
                                onClick={() => navigate('/report-incident')}
                                className="btn btn-primary btn-sm"
                            >
                                {t('new_report')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                [...Array(2)].map((_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white border border-slate-100">
                                        <div className="flex gap-4 items-center">
                                            <SkeletonCard className="w-16 h-16 shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <SkeletonText width="w-1/4" />
                                                <SkeletonText width="w-1/2" />
                                                <SkeletonText width="w-full" height="h-8" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                userIncidents.filter(inc =>
                                    inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    inc.id.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map((incident, i) => (
                                    <div key={i} onClick={() => { setSelectedIncident(incident); setIsModalOpen(true); }} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center">
                                        {/* Evidence Thumbnail */}
                                        <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden relative">
                                            {incident.evidence ? (
                                                <img src={incident.evidence} alt="Evidence" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <AlertCircle size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">{incident.title}</h4>
                                                <span className="text-[10px] text-slate-400">#{incident.id}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-3">Reported: {incident.date}</p>

                                            {/* Repair Journey Timeline */}
                                            <ServiceTracker incident={incident} />
                                        </div>

                                        {/* Action / Badge */}
                                        <div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                incident.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' :
                                                incident.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                                                'bg-blue-50 text-blue-700'
                                            }`}>
                                                {incident.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* About Section */}
                    <div onClick={() => navigate('/info-hub')} className="bg-white border border-slate-100 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row gap-8 items-center">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    {t('primewater_resources')}
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">v2.4.0</span>
                                </h3>
                                <p className="text-sm text-slate-500 mb-6 max-w-xl">
                                    PrimeWater Smart CSM is an advanced water management and incident tracking ecosystem designed for seamless community service and administrative oversight.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('developer')}</p>
                                        <p className="text-sm font-semibold text-slate-700">Cortex Solutions</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('support_status')}</p>
                                        <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                            {t('active_tracking')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center shrink-0">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin)}`}
                                    alt="Mobile QR Code"
                                    className="w-24 h-24 mb-3 rounded-lg"
                                />
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t('scan_mobile')}</h4>
                                <p className="text-[9px] text-slate-400 text-center max-w-[120px]">
                                    Ensure you are using your PC's Network IP
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- INCIDENT DETAIL MODAL --- */}
                {isModalOpen && selectedIncident && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50" onClick={() => setIsModalOpen(false)}>
                        <div
                            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-blue-600 p-6 flex justify-between items-start text-white">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{selectedIncident.title || t('issue_detail')}</h3>
                                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">{t('incident_tracking')} #{selectedIncident.id}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                    <AlertCircle size={16} className="rotate-45" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <span className="text-sm font-semibold text-slate-800">{selectedIncident.status}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date Reported</p>
                                        <span className="text-sm font-semibold text-slate-800">
                                            {selectedIncident.date}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Activity size={14} className="text-blue-600" />
                                        {t('repair_journey')}
                                    </h4>
                                    <ServiceTracker incident={selectedIncident} />
                                </div>

                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                    <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">{t('internal_notes')}</h4>
                                    <p className="text-xs text-slate-600">
                                        {selectedIncident.status === 'Resolved'
                                            ? t('resolved_note')
                                            : t('dispatch_note')}
                                    </p>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn btn-outline flex-1"
                                    >
                                        {t('close_detail')}
                                    </button>
                                    <button
                                        onClick={() => navigate('/help')}
                                        className="btn btn-primary flex-1"
                                    >
                                        {t('message_support')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
}
