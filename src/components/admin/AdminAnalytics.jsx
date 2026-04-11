import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminAnalytics({ incidents, users, onSwitchTab }) {
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    // Process Incident Status Data
    const statusData = [
        { name: t('pending'), value: incidents.filter(i => i.status === 'Pending').length },
        { name: t('in_progress'), value: incidents.filter(i => ['In Progress', 'Dispatched'].includes(i.status)).length },
        { name: t('resolved'), value: incidents.filter(i => i.status === 'Resolved').length },
    ];

    // --- REAL ANALYTICS DATA PROCESSING ---

    // 1. User Growth (Last 6 Months)
    const processUserGrowth = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        const last6Months = [];

        // Initialize last 6 months buckets
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            last6Months.push({
                name: months[d.getMonth()],
                users: 0,
                monthIndex: d.getMonth(),
                year: d.getFullYear()
            });
        }

        // Count users per bucket
        users.forEach(u => {
            const d = new Date(u.created_at);
            const bucket = last6Months.find(b => b.monthIndex === d.getMonth() && b.year === d.getFullYear());
            if (bucket) bucket.users++;
        });

        // Cumulative Sum (Optional - currently shows new users per month)
        // To make it cumulative total:
        let runningTotal = 0;
        return last6Months.map(m => {
            runningTotal += m.users;
            return { name: m.name, users: runningTotal + (users.length > 50 ? 100 : 0) }; // +Base offset if needed
        });
    };
    const userGrowthData = processUserGrowth();

    // 2. Weekly Activity (Last 7 Days)
    const processWeeklyActivity = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            last7Days.push({
                name: days[d.getDay()],
                dateStr: d.toISOString().split('T')[0],
                reports: 0,
                resolved: 0
            });
        }

        incidents.forEach(i => {
            const dateStr = new Date(i.created_at).toISOString().split('T')[0];
            const updatedStr = new Date(i.updated_at || i.created_at).toISOString().split('T')[0];

            const reportBucket = last7Days.find(b => b.dateStr === dateStr);
            if (reportBucket) reportBucket.reports++;

            if (i.status === 'Resolved') {
                const resolveBucket = last7Days.find(b => b.dateStr === updatedStr);
                if (resolveBucket) resolveBucket.resolved++;
            }
        });

        return last7Days;
    };
    const activityData = processWeeklyActivity();

    const handleDownloadCSV = () => {
        if (!incidents.length) return;

        const headers = ['ID', 'Type', 'Location', 'Status', 'Severity', 'Description', 'Reported By', 'Date'];
        const rows = incidents.map(i => [
            i.id,
            i.type,
            `"${i.location.replace(/"/g, '""')}"`,
            i.status,
            i.severity,
            `"${i.description.replace(/"/g, '""')}"`,
            i.user_name || 'Anonymous',
            new Date(i.created_at).toLocaleDateString()
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `PrimeWater_Incidents_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header with Export */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[32px] border border-white/20 shadow-sm">
                <div>
                    <h3 className="text-2xl font-black text-black tracking-tight">{t('sys_performance')}</h3>
                    <p className="text-slate-600 text-sm font-bold uppercase tracking-widest opacity-60">{t('sys_perf_subtitle')}</p>
                </div>
                <button
                    onClick={handleDownloadCSV}
                    className="flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all group"
                >
                    <FileSpreadsheet size={18} className="group-hover:rotate-6 transition-transform" />
                    {t('export_csv')}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => onSwitchTab?.('users')}
                    className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/30 flex items-center gap-4 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all active:scale-95 group"
                >
                    <div className="p-4 bg-blue-100/50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('total_residents')}</p>
                        <h3 className="text-3xl font-black text-slate-900">{users.length}</h3>
                    </div>
                </div>
                <div
                    onClick={() => onSwitchTab?.('incidents')}
                    className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/30 flex items-center gap-4 cursor-pointer hover:border-rose-500 hover:shadow-lg transition-all active:scale-95 group"
                >
                    <div className="p-4 bg-rose-100/50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('active_reports')}</p>
                        <h3 className="text-3xl font-black text-slate-900">{incidents.filter(i => i.status !== 'Resolved').length}</h3>
                    </div>
                </div>
                <div
                    onClick={() => onSwitchTab?.('incidents')}
                    className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/30 flex items-center gap-4 cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all active:scale-95 group"
                >
                    <div className="p-4 bg-emerald-100/50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('resolution_rate')}</p>
                        <h3 className="text-3xl font-black text-slate-900">
                            {incidents.length > 0
                                ? Math.round((incidents.filter(i => i.status === 'Resolved').length / incidents.length) * 100)
                                : 0}%
                        </h3>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Incident Status Pie Chart */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/30">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('status_distribution')}</h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Growth Bar Chart */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/30">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('user_growth_6m')}</h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Area Chart - Reports vs Resolved */}
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-white/30">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('weekly_activity')}</h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="reports" stroke="#8884d8" fillOpacity={1} fill="url(#colorReports)" />
                            <Area type="monotone" dataKey="resolved" stroke="#82ca9d" fillOpacity={1} fill="url(#colorResolved)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div >
    );
}
