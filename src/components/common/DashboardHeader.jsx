import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, X, MessageSquare, Settings, Clock, AlertCircle, Info, CheckCircle2, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileManagementModal from '../modals/ProfileManagementModal';
import { useNotifications } from '../../context/NotificationContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

/**
 * Universal Dashboard Header
 * @param {object} user - Current user object
 * @param {function} onUpdateUser - Callback for profile updates
 * @param {string} searchQuery - Current search value
 * @param {function} setSearchQuery - Search update function
 * @param {string} placeholder - Search input placeholder
 * @param {string} title - Page title (breadcrumb style)
 * @param {string} subtitle - Page subtitle
 * @param {React.ReactNode} icon - Page icon
 * @param {string} iconBgColor - Background color for icon
 * @param {boolean} showNotifications - State for notifications (controlled)
 * @param {function} setShowNotifications - Notification toggle function (controlled)
 */
export default function DashboardHeader({
    user,
    onUpdateUser,
    searchQuery = '',
    setSearchQuery = () => { },
    placeholder = null,
    title,
    subtitle,
    icon,
    iconBgColor,
    showNotifications: controlledShowNotifications,
    setShowNotifications: controlledSetShowNotifications
}) {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [internalShowNotifications, setInternalShowNotifications] = useState(false);

    // Unified state logic
    const { language, theme } = usePreferences() || { language: 'EN', theme: 'light' };
    const { t } = useTranslation(language);

    const showNotifications = controlledShowNotifications !== undefined
        ? controlledShowNotifications
        : internalShowNotifications;

    const setShowNotifications = (val) => {
        if (controlledSetShowNotifications) {
            controlledSetShowNotifications(val);
        } else {
            setInternalShowNotifications(val);
        }
    };

    const notificationRef = useRef(null);
    const navigate = useNavigate();

    // Real notifications from context
    const { notifications, unreadCount, markAsRead, markAllAsRead, toggleRead, deleteNotification } = useNotifications();

    // Icon mapping based on notification type
    const getIcon = (type) => {
        switch (type) {
            case 'incident': return <CheckCircle2 className="text-emerald-500" />;
            case 'bill': return <Info className="text-blue-500" />;
            case 'admin': return <AlertCircle className="text-rose-500" />;
            default: return <Bell size={18} className="text-slate-400" />;
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return t('just_now');
        const date = new Date(timestamp);
        const diff = (new Date() - date) / 1000;
        if (diff < 60) return t('just_now');
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('mins_ago')}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('hours_ago')}`;
        return date.toLocaleDateString();
    };

    // Handle click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setShowNotifications]);

    if (!user) return null;

    const handleSettingsClick = () => {
        if (user.role === 'admin') {
            navigate('/admin/config');
        } else {
            navigate('/settings');
        }
    };

    return (
        <>
            <div className="header-container mb-12 space-y-8">
                {/* Primary Interaction Row (Profile & Global Search) */}
                <header className="top-bar flex items-center justify-between gap-6">
                    <div className="profile-actions flex items-center gap-4 relative">
                        {/* User Profile - LEFT */}
                        <div
                            onClick={() => setIsProfileModalOpen(true)}
                            className="user-profile pl-2 pr-6 h-14 flex items-center gap-4 bg-white/50 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg cursor-pointer hover:bg-white hover:scale-[1.02] transition-all group"
                        >
                            <img
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=0D8ABC&color=fff`}
                                alt="Profile"
                                className="avatar w-10 h-10 ring-4 ring-white group-hover:ring-blue-100 transition-all rounded-full object-cover"
                            />
                            <div className="hidden md:block text-left">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                    {user.role === 'admin' ? t('admin') : t('resident')}
                                </p>
                                <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">
                                    {user.name}
                                </p>
                            </div>
                            <ChevronDown size={16} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                        </div>

                        {/* Settings Button */}
                        <button
                            onClick={handleSettingsClick}
                            className="icon-btn w-14 h-14 relative bg-slate-100 text-slate-500 border border-slate-200 rounded-2xl shadow-lg hover:bg-white hover:text-blue-600 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
                            title="Settings"
                        >
                            <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`icon-btn w-14 h-14 relative border rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${showNotifications ? 'bg-blue-700 text-white border-blue-700' : 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30'}`}
                            >
                                <Bell size={22} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 h-6 min-w-[24px] px-1 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-rose-500/40 animate-pulse">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 z-[100] overflow-hidden"
                                    >
                                        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t('notifications')}</h3>
                                            <div className="flex items-center gap-3">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-[10px] font-bold text-blue-600 hover:underline"
                                                    >
                                                        {t('markAllRead')}
                                                    </button>
                                                )}
                                                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{unreadCount} {t('newItem')}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.map((notif) => (
                                                    <NotificationItem
                                                        key={notif.id}
                                                        notif={notif}
                                                        formatTime={formatTime}
                                                        getIcon={getIcon}
                                                        markAsRead={markAsRead}
                                                        toggleRead={toggleRead}
                                                        deleteNotification={deleteNotification}
                                                        navigate={navigate}
                                                        t={t}
                                                    />
                                                ))
                                            ) : (
                                                <div className="py-12 text-center">
                                                    <Bell className="mx-auto h-8 w-8 text-slate-200 mb-3" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('no_notifications_yet')}</p>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => navigate('/notifications')}
                                            className="w-full py-4 text-center text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-colors"
                                        >
                                            {t('viewAll')}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Global Search - RIGHT */}
                    <div className="search-bar hidden md:flex flex-1 max-w-xl h-14 px-6 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-blue-900/5 group focus-within:ring-2 focus-within:ring-blue-600/20 transition-all">
                        <Search size={20} className="text-slate-400 group-focus-within:text-blue-600 transition-colors self-center" />
                        <input
                            type="text"
                            placeholder={placeholder || t('searchPlace')}
                            className="search-input ml-4 font-bold text-slate-700 placeholder:text-slate-400 outline-none w-full bg-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 rounded-full transition-colors self-center">
                                <X size={16} className="text-slate-400" />
                            </button>
                        )}
                    </div>
                </header>

                {/* Secondary Row (Status/Breadcrumb) - Optional */}
                {title && (
                    <div className="flex items-center gap-3 sm:gap-6 animate-fade-in pl-2">
                        {icon && (
                            <div className={`p-3 sm:p-4 rounded-[18px] sm:rounded-[22px] text-white shadow-xl shadow-blue-500/20 ${iconBgColor || 'bg-gradient-to-br from-blue-600 to-indigo-600'} shrink-0`}>
                                {React.cloneElement(icon, { size: 20, className: 'sm:w-7 sm:h-7' })}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none mb-1 sm:mb-2 truncate">{title}</h2>
                            <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest truncate">{subtitle}</p>
                        </div>
                    </div>
                )}
            </div>

            <ProfileManagementModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                onUpdate={onUpdateUser}
            />
        </>
    );
}

function NotificationItem({ notif, formatTime, getIcon, markAsRead, toggleRead, deleteNotification, navigate, t }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = (e, action) => {
        e.stopPropagation();
        setMenuOpen(false);
        if (action === 'toggle') toggleRead(notif.id, notif.read);
        if (action === 'delete') deleteNotification(notif.id);
    };

    return (
        <div
            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 flex gap-4 group relative ${!notif.read ? 'bg-blue-50/20' : ''}`}
            onClick={() => {
                if (!notif.read) markAsRead(notif.id);
                if (notif.link) navigate(notif.link);
            }}
        >
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                {getIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0 pr-6">
                <div className="flex justify-between items-start mb-0.5">
                    <p className={`text-xs truncate ${notif.read ? 'text-slate-600 font-bold' : 'text-slate-900 font-black'}`}>
                        {notif.title}
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap ml-2">
                        {formatTime(notif.created_at)}
                    </span>
                </div>
                <p className={`text-[11px] leading-relaxed line-clamp-2 ${notif.read ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    {notif.message}
                </p>
            </div>

            {/* Meatball Menu Button */}
            <div className="absolute right-2 top-4" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                    className={`p-1.5 rounded-full hover:bg-slate-200 transition-colors ${menuOpen ? 'bg-slate-200 text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
                >
                    <MoreHorizontal size={16} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-[110] py-2"
                        >
                            <button
                                onClick={(e) => handleAction(e, 'toggle')}
                                className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Clock size={12} />
                                </div>
                                {notif.read ? t('markAsUnread') : t('markAsRead')}
                            </button>
                            <button
                                onClick={(e) => handleAction(e, 'delete')}
                                className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                    <Trash2 size={12} />
                                </div>
                                {t('delete_notif')}
                            </button>
                            <div className="mx-2 my-1 border-t border-slate-50"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                    <AlertCircle size={12} />
                                </div>
                                {t('support_help')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
