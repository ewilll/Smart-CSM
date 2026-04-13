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
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SkeletonCard, SkeletonCircle, SkeletonText } from '../../components/SkeletonLoader';
import ServiceTracker from '../../components/ServiceTracker';
import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

const PulseMetric = ({ label, value, icon: Icon, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-sm"
    >
        <div className={`p-2 ${color} text-white rounded-lg`}>
            <Icon size={14} />
        </div>
        <div>
            <p className="text-[9px] font-black text-black uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-black text-black leading-none">{value}</p>
        </div>
    </motion.div>
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
        // /dashboard is the resident app; admins belong on /admin (same Sidebar can highlight both)
        if (currentUser?.role === 'admin') {
            navigate('/admin', { replace: true });
            return;
        }
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

    const weeklyData = [
        { day: 'Mon', value: 45 },
        { day: 'Tue', value: 52 },
        { day: 'Wed', value: 38 },
        { day: 'Thu', value: 65 },
        { day: 'Fri', value: 48 },
        { day: 'Sat', value: 25 },
        { day: 'Sun', value: 32 },
    ];

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

            <main className="dashboard-main !pt-0">
                <div className="px-6 sm:px-10 py-8">
                    <DashboardHeader
                        user={user}
                        onUpdateUser={setUser}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        showNotifications={showNotifications}
                        setShowNotifications={setShowNotifications}
                        placeholder={t('search_placeholder')}
                    />


                    {/* Dashboard Hero - Highly Interactive Animated Water Theme */}
                    <div
                        onClick={() => navigate('/history')}
                        className="relative mb-8 sm:mb-12 p-6 sm:p-12 rounded-[40px] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 border border-blue-400/30 shadow-2xl shadow-blue-500/30 overflow-hidden group cursor-pointer hover:shadow-blue-500/40 transition-all active:scale-[0.99]"
                    >
                        {/* CSS defined for moving waves */}
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            @keyframes wave {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            @keyframes floatY {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-10px); }
                            }
                        `}} />

                        {/* Moving Water Background Effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ width: '200%', animation: 'wave 15s linear infinite' }}>
                            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="h-full w-full">
                                <path fill="white" d="M0,50 C150,80 350,0 500,50 C650,100 850,20 1000,50 L1000,100 L0,100 Z" opacity="0.5" />
                            </svg>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 top-1/3 pointer-events-none opacity-10" style={{ width: '200%', animation: 'wave 10s linear infinite reverse' }}>
                            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="h-[120%] w-full">
                                <path fill="white" d="M0,50 C200,10 300,90 500,50 C700,10 800,90 1000,50 L1000,100 L0,100 Z" />
                            </svg>
                        </div>

                        <div className="relative z-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="flex-1" style={{ animation: 'floatY 6s ease-in-out infinite' }}>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] mb-4 sm:mb-6 shadow-xl border border-white/10">{t('resident_dashboard')}</span>
                                <h2 className="text-4xl sm:text-6xl font-black mb-2 sm:mb-4 tracking-tighter leading-tight drop-shadow-lg drop-shadow-blue-900/50">{t('hello')}, {user.name?.split(' ')[0] || 'Resident'}! 👋</h2>
                                <p className="text-blue-100 max-w-lg font-bold text-base sm:text-lg leading-relaxed drop-shadow-md">
                                    {t('water_healthy')} {t('active_reports_count', { count: userIncidents.filter(i => i.status !== 'Resolved').length })}
                                </p>
                                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/report-incident'); }}
                                        className="flex items-center justify-center gap-2 bg-white text-blue-700 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/30 w-full sm:w-auto px-10 h-14 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {t('quick_report')} <ArrowRight size={20} className="text-blue-600" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/history'); }}
                                        className="flex items-center justify-center gap-2 bg-blue-700/30 backdrop-blur-md text-white font-black text-sm uppercase tracking-widest border border-white/30 rounded-2xl shadow-lg w-full sm:w-auto px-10 h-14 hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        {t('my_history')}
                                    </button>
                                </div>
                            </div>

                            {/* Interactive Hero Graphic (Moving Droplet) */}
                            <div className="hidden lg:flex w-64 h-64 shrink-0 relative items-center justify-center p-8 group-hover:scale-105 transition-transform duration-700" style={{ animation: 'floatY 4s ease-in-out infinite' }}>
                                <div className="absolute inset-0 bg-white/10 border border-white/20 rounded-full blur-sm"></div>
                                <Droplets size={120} className="text-white drop-shadow-2xl animate-pulse" />
                                <div className="absolute bottom-8 right-8 w-16 h-16 bg-emerald-400 rounded-full text-white flex items-center justify-center font-black text-2xl shadow-emerald-500/50 shadow-2xl border-4 border-blue-600">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid with Hover Animations */}
                    <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="stat-card p-6 flex flex-col group active:scale-95 cursor-pointer">
                                    <div className="flex justify-between items-start mb-6">
                                        <SkeletonCircle size="w-14 h-14" />
                                        <SkeletonText width="w-16" height="h-6" />
                                    </div>
                                    <div className="mt-auto space-y-2">
                                        <SkeletonText width="w-1/2" height="h-3" />
                                        <SkeletonText width="w-3/4" height="h-10" />
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
                                    className="stat-card p-6 flex flex-col group active:scale-95 cursor-pointer bg-white hover:shadow-2xl hover:shadow-blue-500/15 transition-all overflow-hidden relative"
                                    style={{ animationDelay: `${i * 100}ms`, animation: `floatY ${6 + i}s ease-in-out infinite` }}
                                >
                                    {/* Abstract background shapes on hover */}
                                    <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color.replace('bg-', 'bg-').replace('-500', '-50')} rounded-full -mr-16 -mt-16 transition-transform opacity-0 group-hover:opacity-100 group-hover:scale-[2] duration-700 blur-2xl`}></div>

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className={`p-4 rounded-[22px] ${stat.color} text-white shadow-xl shadow-blue-500/10 group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                                            {React.cloneElement(stat.icon, { size: 24, strokeWidth: 2.5 })}
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} animate-pulse`}>
                                            {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                                        </div>
                                    </div>
                                    <div className="mt-auto relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">{stat.label}</p>
                                        <div className="text-4xl font-black text-slate-800 tracking-tighter drop-shadow-sm group-hover:-translate-y-1 transition-transform">{stat.value}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Highly Interactive Real-time Water Flow Chart */}
                    <div className="floating-card p-8 mb-12 bg-white relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <Activity className="text-blue-600 animate-pulse" /> {t('water_flow_weekly')}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{t('real_time_consumption')}</p>
                            </div>
                            <button onClick={() => navigate('/analytics')} className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black transition-all shadow-sm">
                                {t('full_analytics')}
                            </button>
                        </div>
                        <div className="h-[250px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 900 }}
                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#3b82f6' }} animationDuration={2500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Billing Summary Section */}
                    {unpaidBill && (
                        <div className="mb-12 p-8 rounded-[40px] bg-slate-900 border border-slate-800 shadow-2xl shadow-blue-500/10 relative overflow-hidden group animate-slide-up">
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">{t('action_required')}</span>
                                        <span className="text-slate-400 text-xs font-bold">{t('unpaid_bill')}</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">₱{unpaidBill.amount.toLocaleString()} Due</h3>
                                    <p className="text-slate-300 font-medium">{t('settle_payment_for')} <span className="text-white font-bold">{new Date(unpaidBill.reading_date).toLocaleDateString(language === 'TG' ? 'tl-PH' : language === 'BI' ? 'ceb-PH' : 'en-US', { month: 'long', year: 'numeric' })}</span> {t('due_before')} {new Date(unpaidBill.due_date).toLocaleDateString(language === 'TG' ? 'tl-PH' : language === 'BI' ? 'ceb-PH' : 'en-US')}.</p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => navigate('/bills')}
                                        className="px-8 h-14 bg-white text-slate-900 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl shadow-white/5 active:scale-95"
                                    >
                                        {t('view_details')}
                                    </button>
                                    <button
                                        onClick={() => navigate('/bills')}
                                        className="btn-premium !w-auto px-8 h-14"
                                    >
                                        {t('secure_payment')} <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl -ml-24 -mb-24"></div>
                        </div>
                    )}

                    {/* Active Incidents & Progress Tracking */}
                    <div className="floating-card p-8 group mb-12">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('incident_tracking')}</h3>
                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Real-time Updates</p>
                            </div>
                            <button
                                onClick={() => navigate('/report-incident')}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                            >
                                {t('new_report')}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {loading ? (
                                [...Array(2)].map((_, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                        <div className="flex gap-6 items-center">
                                            <SkeletonCard className="w-16 h-16 shrink-0" />
                                            <div className="flex-1 space-y-3">
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
                                    <div key={i} onClick={() => { setSelectedIncident(incident); setIsModalOpen(true); }} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer group/card active:scale-[0.98]">
                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                            {/* Evidence Thumbnail */}
                                            <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-200 overflow-hidden relative group/img">
                                                {incident.evidence ? (
                                                    <img src={incident.evidence} alt="Evidence" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <AlertCircle size={20} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 group-hover/img:bg-black/0 transition-colors"></div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-black text-slate-800 text-base">{incident.title}</h4>
                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-[10px] font-bold text-slate-500">#{incident.id}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-600 mb-3">Reported: {incident.date}</p>

                                                {/* Repair Journey Timeline */}
                                                <ServiceTracker incident={incident} />
                                            </div>

                                            {/* Action */}
                                            <div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedIncident(incident);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white rounded-xl border border-slate-100 shadow-sm"
                                                >
                                                    {t('view_details')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* About & Mobile Onboarding Section */}
                    <div onClick={() => navigate('/info-hub')} className="floating-card p-10 bg-white relative overflow-hidden group border-2 border-blue-50 cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                            <div className="flex-1">
                                <h3 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight mb-4 flex items-center gap-3">
                                    {t('primewater_resources')}
                                    <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">v2.4.0-STABLE</span>
                                </h3>
                                <p className="text-slate-600 font-medium leading-relaxed mb-8 max-w-xl">
                                    PrimeWater Smart CSM is an advanced water management and incident tracking ecosystem designed for seamless community service and administrative oversight.
                                    Our system integrates real-time geolocation, AI-powered support, and high-fidelity reporting to ensure water services are always optimal.
                                </p>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('developer')}</p>
                                        <p className="text-sm font-bold text-slate-800">Cortex Solutions</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('support_status')}</p>
                                        <div className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            {t('active_tracking')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-auto p-8 rounded-4xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center shadow-3xl shadow-slate-900/20">
                                <div className="relative mb-6 group">
                                    <div className="absolute -inset-2 bg-blue-500/20 rounded-3xl blur-xl group-hover:bg-blue-500/40 transition-all opacity-0 group-hover:opacity-100"></div>
                                    <div className="p-2 bg-white rounded-2xl relative">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin)}`}
                                            alt="Mobile QR Code"
                                            className="w-32 h-32"
                                        />
                                    </div>
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-2">{t('scan_mobile')}</h4>
                                <p className="text-[10px] font-bold text-slate-400 text-center max-w-[150px] leading-relaxed">
                                    Scan to access on mobile. Ensure you are using your PC's Network IP, not localhost.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- INCIDENT DETAIL MODAL --- */}
                <AnimatePresence>
                    {isModalOpen && selectedIncident && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl shadow-slate-900/40 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{selectedIncident.title || t('issue_detail')}</h3>
                                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">{t('incident_tracking')} #{selectedIncident.id}</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center hover:bg-white hover:text-blue-600 transition-all">
                                        <AlertCircle size={20} className="rotate-45" />
                                    </button>
                                </div>

                                <div className="p-8">
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${selectedIncident.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                                                <span className="font-bold text-slate-800">{selectedIncident.status}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Reported</p>
                                            <span className="font-bold text-slate-800">
                                                {selectedIncident.date}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Activity size={16} className="text-blue-600" />
                                            {t('repair_journey')}
                                        </h4>
                                        <ServiceTracker incident={selectedIncident} />
                                    </div>

                                    <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">{t('internal_notes')}</h4>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                            {selectedIncident.status === 'Resolved'
                                                ? t('resolved_note')
                                                : t('dispatch_note')}
                                        </p>
                                    </div>

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 h-14 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            {t('close_detail')}
                                        </button>
                                        <button
                                            onClick={() => navigate('/help')}
                                            className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            {t('message_support')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main >
        </div >
    );
}
