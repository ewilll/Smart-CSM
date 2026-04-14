import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../utils/auth';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import DashboardHeader from '../components/common/DashboardHeader';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from '../utils/translations';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationsCenter() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);
    const { notifications, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } =
        useNotifications();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        if (currentUser?.id) {
            void fetchNotifications(currentUser.id);
        }
    }, [navigate, fetchNotifications]);

    const filtered = notifications.filter((n) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
            String(n.title || '')
                .toLowerCase()
                .includes(q) || String(n.message || '').toLowerCase().includes(q)
        );
    });

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 transition-all duration-300">
                <DashboardHeader
                    user={user}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    placeholder={t('notifications_search_placeholder')}
                    title={t('notifications')}
                    subtitle={t('notifications_center_subtitle')}
                    icon={<Bell size={24} />}
                />

                <div className="mt-8 max-w-3xl mx-auto flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {loading ? t('loading') : `${filtered.length} ${t('notifications')}`}
                        </p>
                        <button
                            type="button"
                            onClick={() => markAllAsRead()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                        >
                            <CheckCheck size={16} />
                            {t('markAllRead')}
                        </button>
                    </div>

                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                        {filtered.length === 0 ? (
                            <div className="py-20 text-center">
                                <Bell className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                    {t('no_notifications_yet')}
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((n) => (
                                    <li
                                        key={n.id}
                                        className={`p-5 flex gap-4 items-start ${
                                            !n.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                        }`}
                                    >
                                        <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                                            <Bell size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    className={`text-sm font-black ${
                                                        n.read
                                                            ? 'text-slate-600 dark:text-slate-400'
                                                            : 'text-slate-900 dark:text-slate-100'
                                                    }`}
                                                >
                                                    {n.title}
                                                </p>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                    {n.created_at
                                                        ? new Date(n.created_at).toLocaleString()
                                                        : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                                {n.message}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {!n.read && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markAsRead(n.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        {t('markAsRead')}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => deleteNotification(n.id)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:underline"
                                                >
                                                    <Trash2 size={12} />
                                                    {t('delete_notif')}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
