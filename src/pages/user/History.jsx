import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { History, FileText, CheckCircle, Clock, AlertCircle, Receipt, Megaphone, MoreHorizontal, Trash2, ArrowRight } from 'lucide-react';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

export default function AppHistory() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        fetchHistory(currentUser);

        // Real-time subscription for immediate updates
        const channel = supabase
            .channel(`user_history_${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                table: 'incidents',
                filter: `user_id=eq.${currentUser.id}`
            }, () => {
                fetchHistory(currentUser);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [navigate]);

    const fetchHistory = async (currentUser) => {
        setLoading(true);
        try {
            // 1. Fetch Incidents
            const { data: incidentData } = await supabase
                .from('incidents')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            // 2. Fetch Bills
            const { data: billData } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            // 3. Fetch Announcements
            const { data: announcementData } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            const allLogs = [];

            if (incidentData) {
                incidentData.forEach(inc => {
                    allLogs.push({
                        id: `inc-${inc.id}`,
                        timestamp: new Date(inc.created_at),
                        action: inc.status === 'Resolved' ? t('issue_resolved') :
                            inc.status === 'Pending' ? t('incident_reported') : t('status_updated'),
                        details: `${inc.type} - ${t('located_at')} ${inc.location}`,
                        time: new Date(inc.created_at).toLocaleString(),
                        status: inc.status,
                        icon: inc.status === 'Resolved' ? CheckCircle :
                            inc.status === 'Pending' ? FileText : Clock,
                        color: inc.status === 'Resolved' ? 'emerald' :
                            inc.status === 'Pending' ? 'blue' : 'amber',
                        link: '/dashboard'
                    });
                });
            }

            if (billData) {
                billData.forEach(bill => {
                    allLogs.push({
                        id: `bill-${bill.id}`,
                        timestamp: new Date(bill.created_at),
                        action: bill.status === 'Paid' ? t('bill_paid') : t('water_bill_issued'),
                        details: `${t('bill')} ID: #${bill.id.slice(0, 8).toUpperCase()} - ${t('amount_label')}: ₱${bill.amount.toLocaleString()}`,
                        time: new Date(bill.created_at).toLocaleString(),
                        status: bill.status,
                        icon: Receipt,
                        color: bill.status === 'Paid' ? 'emerald' : 'indigo',
                        link: '/bills'
                    });
                });
            }

            if (announcementData) {
                announcementData.forEach(ann => {
                    allLogs.push({
                        id: `ann-${ann.id}`,
                        timestamp: new Date(ann.created_at),
                        action: t('system_advisory'),
                        details: ann.title,
                        time: new Date(ann.created_at).toLocaleString(),
                        status: 'Announcement',
                        icon: Megaphone,
                        color: 'rose',
                        link: '/support'
                    });
                });
            }

            // Sort all by timestamp
            allLogs.sort((a, b) => b.timestamp - a.timestamp);
            setHistoryLogs(allLogs);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const filteredLogs = historyLogs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title={t('activity_history')}
                    subtitle={t('recent_actions')}
                    icon={<History size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('timeline')}</h2>
                            {loading && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <HistoryItem
                                        key={log.id}
                                        log={log}
                                        navigate={navigate}
                                    />
                                ))
                            ) : !loading && (
                                <div className="p-20 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertCircle size={32} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                                        {searchQuery ? t('no_matches_found') : t('no_activity_found')}
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {searchQuery ? t('no_matches_desc', { query: searchQuery }) : t('no_reports_yet')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function HistoryItem({ log, navigate }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const menuRef = React.useRef(null);

    React.useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isHidden) return null;

    return (
        <div className="relative group border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-6 flex items-start gap-6 cursor-pointer active:scale-[0.99]"
            >
                <div className={`p-4 rounded-2xl bg-${log.color}-50 shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <log.icon className={`w-6 h-6 text-${log.color}-600`} />
                </div>
                <div className="flex-1 min-w-0 pt-1 pr-12">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col">
                            <p className="font-extrabold text-slate-800 text-lg mb-0.5 group-hover:text-blue-600 transition-colors">{log.action}</p>
                            <p className="text-slate-500 font-medium line-clamp-1">{log.details}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0">{log.time}</span>
                    </div>
                </div>
            </div>

            {/* EXPANDED CONTAINER */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2 md:pl-[88px]">
                            <div className="p-6 bg-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                <h4 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-widest">{log.action}</h4>
                                <p className="text-slate-600 font-medium mb-6 leading-relaxed">{log.details}</p>

                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100/50">
                                        <Clock size={16} className="text-blue-600" />
                                        <span>{log.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100/50">
                                        <CheckCircle size={16} className="text-emerald-500" />
                                        <span>{t('status')}: {t(log.status?.toLowerCase()?.replace(' ', '_'))}</span>
                                    </div>
                                    {log.id && (
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100/50">
                                            <FileText size={16} className="text-indigo-500" />
                                            <span>Ref: {log.id.toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(log.link || '/dashboard');
                                    }}
                                    className="px-6 h-12 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20 w-auto flex items-center justify-center gap-2"
                                >
                                    {t('view_related_document')} <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Meatball Menu */}
            <div className="absolute right-6 top-8" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                    className={`p-2 rounded-full hover:bg-slate-200 transition-colors ${menuOpen ? 'bg-slate-200 text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
                >
                    <MoreHorizontal size={20} />
                </button>

                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 z-50 py-2"
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsHidden(true); }}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Clock size={14} />
                                </div>
                                {t('mark_as_read')}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsHidden(true); }}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                    <Trash2 size={14} />
                                </div>
                                {t('hide_item')}
                            </button>
                            <div className="mx-2 my-1 border-t border-slate-50"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                    <AlertCircle size={14} />
                                </div>
                                {t('filter_similar')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
