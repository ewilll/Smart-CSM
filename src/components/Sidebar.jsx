import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Droplets,
    AlertCircle,
    Clock,
    BarChart3,
    Receipt,
    Map,
    Info,
    BookOpen,
    Database,
    Activity,
    Brain
} from 'lucide-react';
import { logoutUser, getCurrentUser } from '../utils/auth';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from '../utils/translations';

export default function Sidebar({ isOpen, toggleSidebar }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutProgress, setLogoutProgress] = useState(0);
    const [user, setUser] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
    }, []);

    // Sync CSS variable for main content margin - works across ALL pages
    useEffect(() => {
        const sidebarPx = isCollapsed ? '100px' : '280px';
        document.documentElement.style.setProperty('--active-sidebar-width', sidebarPx);
        localStorage.setItem('sidebar_collapsed', isCollapsed);
        // Also keep body class as fallback
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }, [isCollapsed]);

    const toggleCollapse = (e) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    const handleNav = (path) => {
        navigate(path);
        if (window.innerWidth < 768) toggleSidebar();
    };

    const cancelLogout = () => {
        if (isLoggingOut) return;
        setShowLogoutModal(false);
        setLogoutProgress(0);
    };

    const isAdmin = user?.role === 'admin';

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''} bg-white shadow-2xl shadow-blue-900/5`}>
                <div className="sidebar-header">
                    <div
                        onClick={() => handleNav(isAdmin ? '/admin' : '/dashboard')}
                        className="flex items-center gap-3 no-underline group px-2 cursor-pointer overflow-hidden"
                    >
                        <div className="h-10 w-10 flex items-center justify-center bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform shrink-0">
                            <Droplets size={20} className="text-white" />
                        </div>
                        <span className="brand-title !text-2xl transition-all duration-300">
                            <span className="text-slate-900">Prime</span>
                            <span className="text-blue-600">Water</span>
                        </span>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all z-50 transform hover:scale-110"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>

                    <button className="mobile-toggle md:hidden" onClick={toggleSidebar}>
                        <X size={24} className="text-slate-900" />
                    </button>
                </div>

                <nav className="sidebar-nav space-y-6 mt-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="nav-section">
                        <span className="nav-label px-6 mb-4 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('main_menu')}</span>
                        <div className="space-y-2 px-3">
                            {/* SHARED OR ROLE-SPECIFIC DASHBOARD */}
                            <div
                                onClick={() => handleNav(isAdmin ? '/admin' : '/dashboard')}
                                className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/dashboard') || isActive('/admin') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <LayoutDashboard size={20} className={isActive('/dashboard') || isActive('/admin') ? 'text-white' : 'group-hover:text-blue-600'} />
                                <span className="font-bold text-sm line-clamp-1">{isAdmin ? t('admin_panel') : t('dashboard')}</span>
                            </div>

                            {!isAdmin ? (
                                <>
                                    <div onClick={() => handleNav('/report-incident')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/report-incident') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <FileText size={20} className={isActive('/report-incident') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('report_incident')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/help')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/help') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <MessageSquare size={20} className={isActive('/help') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('ai_support')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/bills')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/bills') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <Receipt size={20} className={isActive('/bills') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('bills')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/history')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/history') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <Clock size={20} className={isActive('/history') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('history')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/public-log')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/public-log') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <Activity size={20} className={isActive('/public-log') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('public_log')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/service-map')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/service-map') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <Map size={20} className={isActive('/service-map') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('service_map')}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div onClick={() => handleNav('/admin/map')} className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/admin/map') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                        <Map size={20} className={isActive('/admin/map') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('command_center')}</span>
                                    </div>
                                    <div
                                        onClick={() => handleNav('/admin/messages')}
                                        className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/admin/messages') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'}`}
                                    >
                                        <MessageSquare size={20} className={isActive('/admin/messages') ? 'text-white' : 'group-hover:text-emerald-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('resident_chat')}</span>
                                    </div>
                                    <div
                                        onClick={() => handleNav('/admin/learning')}
                                        className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/admin/learning') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
                                    >
                                        <Brain size={20} className={isActive('/admin/learning') ? 'text-white' : 'group-hover:text-indigo-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('learning_center')}</span>
                                        {!isActive('/admin/learning') && (
                                            <div className="ml-auto w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                    <div
                                        onClick={() => handleNav('/admin/config')}
                                        className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/admin/config') ? 'bg-slate-900 text-white shadow-lg shadow-slate-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <Settings size={20} className={isActive('/admin/config') ? 'text-white' : 'group-hover:text-slate-900'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('system_dna')}</span>
                                    </div>
                                    <div
                                        onClick={() => handleNav('/admin/audit')}
                                        className={`nav-item cursor-pointer flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive('/admin/audit') ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}
                                    >
                                        <Database size={20} className={isActive('/admin/audit') ? 'text-white' : 'group-hover:text-blue-600'} />
                                        <span className="font-bold text-sm line-clamp-1">{t('system_audit')}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                <div className="sidebar-footer mt-auto pt-6 border-t border-slate-100 p-4">
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        Smart CSM v1.0
                    </p>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] md:hidden animate-fade-in"
                    onClick={toggleSidebar}
                />
            )}

        </>
    );
}
