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

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setShowLogoutModal(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress <= 100) setLogoutProgress(progress);
            if (progress >= 100) clearInterval(interval);
        }, 50);

        setTimeout(async () => {
            await logoutUser();
            window.location.href = '/login';
        }, 1000);
    };


    const isAdmin = user?.role === 'admin';

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header relative flex items-center justify-between z-50">
                    {/* Brand */}
                    <div
                        onClick={() => handleNav('/')}
                        className="flex items-center gap-3 no-underline group px-2 cursor-pointer relative"
                    >
                        <div className="h-9 w-9 flex items-center justify-center bg-blue-600 rounded-lg shrink-0">
                            <Droplets size={18} className="text-white" />
                        </div>
                        <span className="brand-title transition-all duration-300 flex items-baseline gap-1">
                            <span className="text-white">Prime</span>
                            <span className="text-blue-400">Water</span>
                            <span className="text-[10px] text-slate-400 border-b border-dashed border-slate-500 ml-1 relative group/csm hover:text-blue-300 transition-colors">
                                CSM
                                <span className="absolute left-0 top-full mt-1 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/csm:opacity-100 transition-opacity pointer-events-none z-50">Customer Service Management</span>
                            </span>
                        </span>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:flex absolute -right-3.5 top-8 w-7 h-7 bg-slate-700 border border-slate-600 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 shadow-md transition-all z-50"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    <button className="mobile-toggle md:hidden" onClick={toggleSidebar}>
                        <X size={24} className="text-slate-300" />
                    </button>
                </div>

                <nav className="sidebar-nav space-y-1 mt-0 flex-1 overflow-y-auto pr-1">
                    <div className="nav-section">
                        <span className="nav-label text-xs mb-1">{t('main_menu')}</span>
                        <div className="space-y-0.5">
                            {/* SHARED OR ROLE-SPECIFIC DASHBOARD */}
                            <div
                                onClick={() => handleNav(isAdmin ? '/admin' : '/dashboard')}
                                className={`nav-item cursor-pointer ${isActive('/dashboard') || isActive('/admin') ? 'active' : ''}`}
                            >
                                <LayoutDashboard size={20} />
                                <span className="nav-label">{isAdmin ? t('admin_panel') : t('dashboard')}</span>
                            </div>

                            {!isAdmin ? (
                                <>
                                    <div onClick={() => handleNav('/report-incident')} className={`nav-item cursor-pointer ${isActive('/report-incident') ? 'active' : ''}`}>
                                        <FileText size={20} />
                                        <span className="nav-label">{t('report_incident')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/help')} className={`nav-item cursor-pointer ${isActive('/help') ? 'active' : ''}`}>
                                        <MessageSquare size={20} />
                                        <span className="nav-label">{t('ai_support')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/bills')} className={`nav-item cursor-pointer ${isActive('/bills') ? 'active' : ''}`}>
                                        <Receipt size={20} />
                                        <span className="nav-label">{t('bills')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/history')} className={`nav-item cursor-pointer ${isActive('/history') ? 'active' : ''}`}>
                                        <Clock size={20} />
                                        <span className="nav-label">{t('history')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/public-log')} className={`nav-item cursor-pointer ${isActive('/public-log') ? 'active' : ''}`}>
                                        <Activity size={20} />
                                        <span className="nav-label">{t('public_log')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/service-map')} className={`nav-item cursor-pointer ${isActive('/service-map') ? 'active' : ''}`}>
                                        <Map size={20} />
                                        <span className="nav-label">{t('service_map')}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div onClick={() => handleNav('/admin/map')} className={`nav-item cursor-pointer ${isActive('/admin/map') ? 'active' : ''}`}>
                                        <Map size={20} />
                                        <span className="nav-label">{t('command_center')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/admin/messages')} className={`nav-item cursor-pointer ${isActive('/admin/messages') ? 'active' : ''}`}>
                                        <MessageSquare size={20} />
                                        <span className="nav-label">{t('resident_chat')}</span>
                                    </div>

                                    <div onClick={() => handleNav('/admin/config')} className={`nav-item cursor-pointer ${isActive('/admin/config') ? 'active' : ''}`}>
                                        <Settings size={20} />
                                        <span className="nav-label">{t('system_dna')}</span>
                                    </div>
                                    <div onClick={() => handleNav('/admin/audit')} className={`nav-item cursor-pointer ${isActive('/admin/audit') ? 'active' : ''}`}>
                                        <Database size={20} />
                                        <span className="nav-label">{t('system_audit')}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                <div className="sidebar-footer flex flex-col gap-2">
                    <div onClick={() => setShowLogoutModal(true)} className="nav-item cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-50 mt-auto">
                        <LogOut size={20} />
                        <span className="nav-label">{t('logout')}</span>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-2">Smart CSM v1.0</p>
                </div>
            </aside>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={32} className="text-rose-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('logout_confirm_title')}</h3>
                            <p className="text-slate-500 mb-8">{t('logout_confirm_desc')}</p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={cancelLogout}
                                    disabled={isLoggingOut}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    {t('cancel')}
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 relative overflow-hidden"
                                >
                                    {isLoggingOut ? (
                                        <div className="absolute inset-0 bg-rose-500 flex items-center justify-center">
                                            <span className="text-sm">{logoutProgress}%</span>
                                        </div>
                                    ) : (
                                        t('logout')
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-[90] md:hidden animate-fade-in"
                    onClick={toggleSidebar}
                />
            )}

        </>
    );
}
