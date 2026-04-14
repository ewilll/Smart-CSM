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
    Area,
    ScatterChart,
    Scatter,
    ZAxis,
} from 'recharts';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';
import { AlertCircle, FileSpreadsheet, TrendingUp, Users } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminAnalytics({ incidents = [], users = [], onSwitchTab }) {
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    const safeIncidents = Array.isArray(incidents) ? incidents : [];
    const safeUsers = Array.isArray(users) ? users : [];

    // Process Incident Status Data
    const statusData = [
        { name: t('pending'), value: safeIncidents.filter(i => i.status === 'Pending').length },
        { name: t('in_progress'), value: safeIncidents.filter(i => ['In Progress', 'Dispatched'].includes(i.status)).length },
        { name: t('resolved'), value: safeIncidents.filter(i => i.status === 'Resolved').length },
    ];

    // --- REAL ANALYTICS DATA PROCESSING ---

    // 1. New user registrations (last 6 calendar months, no synthetic offset)
    const processUserGrowth = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        const last6Months = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            last6Months.push({
                name: months[d.getMonth()],
                newUsers: 0,
                monthIndex: d.getMonth(),
                year: d.getFullYear()
            });
        }

        safeUsers.forEach(u => {
            if (!u.created_at) return;
            const d = new Date(u.created_at);
            const bucket = last6Months.find(b => b.monthIndex === d.getMonth() && b.year === d.getFullYear());
            if (bucket) bucket.newUsers++;
        });

        return last6Months.map(({ name, newUsers }) => ({ name, newUsers }));
    };
    const userGrowthData = processUserGrowth();

    const processResolutionBuckets = () => {
        const buckets = [
            { name: '< 24h', count: 0 },
            { name: '24–72h', count: 0 },
            { name: '3–7d', count: 0 },
            { name: '> 7d', count: 0 },
        ];
        safeIncidents.forEach((i) => {
            if (i.status !== 'Resolved' || !i.created_at) return;
            const end = new Date(i.updated_at || i.created_at).getTime();
            const start = new Date(i.created_at).getTime();
            if (Number.isNaN(end) || Number.isNaN(start) || end < start) return;
            const h = (end - start) / (1000 * 60 * 60);
            if (h < 24) buckets[0].count += 1;
            else if (h < 72) buckets[1].count += 1;
            else if (h < 168) buckets[2].count += 1;
            else buckets[3].count += 1;
        });
        return buckets;
    };
    const resolutionBuckets = processResolutionBuckets();

    const geoPoints = safeIncidents
        .filter(
            (i) =>
                typeof i.latitude === 'number' &&
                typeof i.longitude === 'number' &&
                !Number.isNaN(i.latitude) &&
                !Number.isNaN(i.longitude)
        )
        .map((i) => ({
            id: i.id,
            x: i.longitude,
            y: i.latitude,
            z: 12,
        }));

    const processLocationHotspots = () => {
        const map = {};
        safeIncidents.forEach((i) => {
            const raw = (i.location || '').trim() || '—';
            const key = raw.length > 36 ? `${raw.slice(0, 36)}…` : raw;
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    };
    const locationHotspots = processLocationHotspots();

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

        safeIncidents.forEach(i => {
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
        if (!safeIncidents.length) return;

        const headers = ['ID', 'Type', 'Location', 'Status', 'Severity', 'Description', 'Reported By', 'Date'];
        const rows = safeIncidents.map(i => [
            i.id,
            i.type,
            `"${(i.location || '').replace(/"/g, '""')}"`,
            i.status,
            i.severity,
            `"${(i.description || '').replace(/"/g, '""')}"`,
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

    const panel =
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800 sm:p-6';
    const chartInner = 'min-h-[260px] w-full flex-1';

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header with Export */}
            <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${panel}`}>
                <div className="min-w-0">
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{t('sys_performance')}</h3>
                    <p className="mt-1 text-xs font-bold uppercase leading-relaxed tracking-widest text-slate-600 dark:text-slate-300 sm:text-sm">
                        {t('sys_perf_subtitle')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:px-6 sm:py-3.5"
                >
                    <FileSpreadsheet size={18} aria-hidden />
                    {t('export_csv')}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
                <div
                    onClick={() => onSwitchTab?.('users')}
                    className={`${panel} flex cursor-pointer items-center gap-4 transition-colors hover:border-blue-300 dark:hover:border-blue-500`}
                >
                    <div className="shrink-0 rounded-xl bg-blue-100 p-4 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                        <Users size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('total_residents')}</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50">{safeUsers.length}</h3>
                    </div>
                </div>
                <div
                    onClick={() => onSwitchTab?.('incidents')}
                    className={`${panel} flex cursor-pointer items-center gap-4 transition-colors hover:border-rose-300 dark:hover:border-rose-500`}
                >
                    <div className="shrink-0 rounded-xl bg-rose-100 p-4 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                        <AlertCircle size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('active_reports')}</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50">{safeIncidents.filter(i => i.status !== 'Resolved' && i.status !== 'Declined').length}</h3>
                    </div>
                </div>
                <div
                    onClick={() => onSwitchTab?.('incidents')}
                    className={`${panel} flex cursor-pointer items-center gap-4 transition-colors hover:border-emerald-300 dark:hover:border-emerald-500 sm:col-span-2 md:col-span-1`}
                >
                    <div className="shrink-0 rounded-xl bg-emerald-100 p-4 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <TrendingUp size={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('resolution_rate')}</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50">
                            {safeIncidents.length > 0
                                ? Math.round((safeIncidents.filter(i => i.status === 'Resolved').length / safeIncidents.length) * 100)
                                : 0}%
                        </h3>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
                {/* Incident Status Pie Chart */}
                <div className={`${panel} flex flex-col lg:min-h-[380px]`}>
                    <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('status_distribution')}</h4>
                    <div className={chartInner}>
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

                {/* New registrations per month */}
                <div className={`${panel} flex flex-col lg:min-h-[380px]`}>
                    <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('registrations_6m')}</h4>
                    <div className={chartInner}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-600" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.2)' }} />
                                <Bar dataKey="newUsers" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Resolution time + geographic view */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
                <div className={`${panel} flex flex-col lg:min-h-[380px]`}>
                    <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('resolution_time_dist')}</h4>
                    <div className={chartInner}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={resolutionBuckets}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-600" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip />
                                <Bar dataKey="count" name={t('resolved')} fill="#10b981" radius={[4, 4, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className={`${panel} flex flex-col lg:min-h-[380px]`}>
                    <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t('incident_geo_density')}</h4>
                    {geoPoints.length === 0 ? (
                        <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t('analytics_no_geo')}</p>
                    ) : null}
                    <div className={chartInner}>
                        {geoPoints.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                                    <XAxis type="number" dataKey="x" name="Lon" unit="" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis type="number" dataKey="y" name="Lat" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <ZAxis type="number" dataKey="z" range={[60, 60]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [value, name === 'x' ? 'Longitude' : 'Latitude']} />
                                    <Scatter data={geoPoints} fill="#6366f1" fillOpacity={0.65} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={locationHotspots} layout="vertical" margin={{ left: 4, right: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-600" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Area Chart - Reports vs Resolved — explicit height required for Recharts ResponsiveContainer */}
            <div className={`${panel} flex flex-col`}>
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 sm:text-[10px]">
                    {t('weekly_activity')}
                </h4>
                <div className="h-[280px] w-full sm:h-[300px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activityData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                            <defs>
                                <linearGradient id="weeklyColorReports" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="weeklyColorResolved" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" className="dark:stroke-slate-600" />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '12px',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="reports" name={t('reports')} stroke="#8884d8" fillOpacity={1} fill="url(#weeklyColorReports)" />
                            <Area type="monotone" dataKey="resolved" name={t('resolved')} stroke="#82ca9d" fillOpacity={1} fill="url(#weeklyColorResolved)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
