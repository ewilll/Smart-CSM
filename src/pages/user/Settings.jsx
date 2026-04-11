import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    Settings as SettingsIcon,
    ChevronDown,
    User,
    Shield,
    Bell,
    CreditCard,
    Camera,
    Plus,
    TrendingUp,
    LogOut,
    Palette,
    Globe,
    Type
} from 'lucide-react';

import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut as LogOutIcon, AlertTriangle } from 'lucide-react';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { theme, setTheme, language, setLanguage, font, setFont } = usePreferences() || {
        theme: 'light', setTheme: () => { },
        language: 'EN', setLanguage: () => { },
        font: 'inter', setFont: () => { }
    };
    const { t } = useTranslation(language);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        barangay: '',
        email: '',
        phone: '+63 912 345 6789'
    });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutProgress, setLogoutProgress] = useState(0);
    const [message, setMessage] = useState({ type: '', content: '' });

    const [avatarFile, setAvatarFile] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // --- NEW: Preferences State ---
    const [preferences, setPreferences] = useState({
        pushNotifications: true,
        usageReports: true,
        twoFactor: false,
        systemSounds: false
    });

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [deactivateLoading, setDeactivateLoading] = useState(false);
    const [deactivateEmailInput, setDeactivateEmailInput] = useState('');
    const [deactivateChecked, setDeactivateChecked] = useState(false);

    const handleTogglePreference = (key) => {
        const newPrefs = {
            ...preferences,
            [key]: !preferences[key]
        };
        setPreferences(newPrefs);

        // Persist to localStorage
        if (user) {
            localStorage.setItem(`smart_csm_prefs_${user.id}`, JSON.stringify(newPrefs));
        }
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);

        // Load preferences from localStorage
        const storedPrefs = localStorage.getItem(`smart_csm_prefs_${currentUser?.id}`);
        if (storedPrefs) {
            setPreferences(JSON.parse(storedPrefs));
        }
    }, [navigate]);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || user.name?.split(', ')[1] || user.name?.split(' ')[0] || '',
                lastName: user.lastName || user.name?.split(', ')[0] || user.name?.split(' ')[1] || '',
                barangay: user.barangay || '',
                email: user.email || '',
                phone: user.phone || '+63 912 345 6789'
            });
            setResetEmail(user.email || '');
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingAvatar(true);
        setMessage({ type: '', content: '' });

        const convertToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        };

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Import supabase dynamically
            const { supabase } = await import('../../utils/supabaseClient');
            const { updateUserProfile } = await import('../../utils/auth');

            let finalAvatarUrl = null;

            try {
                // Primary attempt: Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalAvatarUrl = data.publicUrl;
            } catch (storageError) {
                console.warn("⚠️ Supabase Storage failed (Bucket missing?). Falling back to Base64 Mode.", storageError);
                // Secondary attempt: Fallback to Base64 (Smart Mode)
                finalAvatarUrl = await convertToBase64(file);
            }

            // Update profile with the resulting URL (either Cloud or Base64)
            const result = await updateUserProfile(user.id, {
                name: formData.fullName,
                role: user.role,
                phone: formData.phone,
                avatar_url: finalAvatarUrl
            });

            if (result.success) {
                setUser(result.user);
                setMessage({ type: 'success', content: 'Profile picture updated (Smart mode active)!' });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Avatar update error:', error);
            setMessage({ type: 'error', content: 'Failed to update profile picture. Please try a smaller image.' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage({ type: '', content: '' });

        try {
            const { updateUserProfile } = await import('../../utils/auth');

            const result = await updateUserProfile(user.id, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                barangay: formData.barangay,
                role: user.role,
                phone: formData.phone,
                avatar_url: user.avatar_url // Preserve current avatar URL
            });

            if (result.success) {
                setUser(result.user);
                setMessage({ type: 'success', content: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'error', content: result.message || 'Failed to update profile.' });
            }
        } catch (error) {
            setMessage({ type: 'error', content: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!resetEmail) return;
        setResetEmail(resetEmail); // Redundant but safe
        setResetLoading(true);
        try {
            const { sendPasswordResetEmail } = await import('../../utils/auth');
            const result = await sendPasswordResetEmail(resetEmail);
            if (result.success) {
                setMessage({ type: 'success', content: `Reset link sent to ${resetEmail}` });
            } else {
                setMessage({ type: 'error', content: result.message });
            }
        } catch (error) {
            setMessage({ type: 'error', content: 'Failed to send reset email.' });
        } finally {
            setResetLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setShowLogoutConfirm(false);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress <= 100) setLogoutProgress(progress);
            if (progress >= 100) clearInterval(interval);
        }, 50);

        setTimeout(async () => {
            const { logoutUser } = await import('../../utils/auth');
            await logoutUser();
            window.location.href = '/login';
        }, 1000);
    };

    const handleDeactivateAccount = async () => {
        setDeactivateLoading(true);
        try {
            const { deactivateUser } = await import('../../utils/auth');
            const result = await deactivateUser(user.id);
            if (result.success) {
                window.location.href = '/login';
            } else {
                setMessage({ type: 'error', content: result.message || 'Failed to deactivate account.' });
                setShowDeactivateConfirm(false);
            }
        } catch (error) {
            setMessage({ type: 'error', content: 'An unexpected error occurred.' });
        } finally {
            setDeactivateLoading(false);
        }
    };

    if (!user) return null;

    const isAdmin = user.role === 'admin';

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title={t('settings')}
                    subtitle="Privacy, Preferences & Security"
                    icon={<SettingsIcon size={28} />}
                    iconBgColor="bg-gradient-to-br from-slate-700 to-slate-900"
                />

                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Security & Profile */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="floating-card p-10">
                            <div className="flex items-center gap-4 mb-10 pb-10 border-b border-slate-100/50">
                                <div className="p-3 bg-slate-900 rounded-xl text-white">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-slate-800">{t('personal_info')}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('account_profile_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 mb-12 pb-12 border-b border-slate-100/50">
                                <div className="relative group">
                                    <img
                                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff&size=120`}
                                        className="h-32 w-32 rounded-[40px] border-4 border-white shadow-2xl object-cover"
                                        alt="Large Avatar"
                                    />
                                    <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-2xl shadow-lg border-4 border-white transform translate-x-1/4 translate-y-1/4 hover:scale-110 active:scale-95 transition-all cursor-pointer">
                                        {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Camera size={18} />}
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                        disabled={uploadingAvatar}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">{user.name}</h3>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{isAdmin ? t('administrator') : t('resident_member')}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('first_name')}</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        placeholder={t('enter_first_name')}
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('last_name')}</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        placeholder={t('enter_last_name')}
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('residential_place')}</label>
                                    <input
                                        type="text"
                                        name="barangay"
                                        value={formData.barangay}
                                        onChange={handleInputChange}
                                        placeholder={t('barangay_placeholder')}
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('email_identity')}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-100 border border-slate-100 font-bold text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('contact_number')}</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Feedback Messages */}
                            {message.content && (
                                <div className={`mt-6 p-4 rounded-xl font-bold flex items-center justify-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {message.content}
                                </div>
                            )}

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={loading}
                                    className="px-12 py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:transform-none"
                                >
                                    {loading ? t('loading') : t('save_changes')}
                                </button>
                            </div>
                        </div>

                        {/* Password Reset Section */}
                        <div className="floating-card p-10 bg-white border border-slate-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-slate-800">{t('password_mgmt')}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('secure_reset_email')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-slate-500">{t('password_reset_desc')}</p>
                                <div className="flex gap-4">
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder={t('confirm_email_address')}
                                        className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    />
                                    <button
                                        onClick={handlePasswordReset}
                                        disabled={resetLoading}
                                        className="px-8 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {resetLoading ? t('sending') : t('send_link')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Side-by-Side Danger Zone & Account Session */}
                        <div className="grid md:grid-cols-2 gap-10">
                            {!isAdmin && (
                                <div className="floating-card p-10 bg-rose-50 border-rose-100">
                                    <h3 className="text-lg font-black text-rose-800 tracking-tight mb-4">{t('danger_zone')}</h3>
                                    <p className="text-xs text-rose-400 font-bold mb-8 uppercase tracking-widest leading-relaxed">{t('permanent_loss')}</p>
                                    <button
                                        onClick={() => setShowDeactivateConfirm(true)}
                                        className="w-full py-4 rounded-[20px] bg-white text-rose-500 border border-rose-200 font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                        {t('deactivate_account')}
                                    </button>
                                </div>
                            )}

                            <div className="floating-card p-10 bg-white border border-slate-100 shadow-xl">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">{t('account_session')}</h3>
                                <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest leading-relaxed">{t('account_session_desc')}</p>
                                <button
                                    onClick={() => setShowLogoutConfirm(true)}
                                    disabled={isLoggingOut}
                                    className="w-full py-4 rounded-[20px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOutIcon size={16} />
                                    {t('logout')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-8">
                        <div className="floating-card p-10">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-8">{t('notification_prefs')}</h3>
                            <div className="space-y-4">
                                {[
                                    { id: 'pushNotifications', label: 'Push Notifications', icon: <Bell />, enabled: preferences.pushNotifications },
                                    { id: 'usageReports', label: 'Usage Reports', icon: <TrendingUp />, enabled: preferences.usageReports },
                                    { id: 'twoFactor', label: '2FA Protection', icon: <Shield />, enabled: preferences.twoFactor },
                                    { id: 'systemSounds', label: 'System Sounds', icon: <Plus />, enabled: preferences.systemSounds },
                                ].map((item, i) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleTogglePreference(item.id)}
                                        className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-blue-500 transition-all cursor-pointer select-none active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl transition-colors duration-300 ${item.enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                {React.cloneElement(item.icon, { size: 18 })}
                                            </div>
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 shadow-inner ${item.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform ${item.enabled ? 'translate-x-5' : ''} transition-all duration-300 ease-out`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Internationalization & Theming Block */}
                        <div className="floating-card p-10 bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <h3 className="text-xl font-black text-blue-900 tracking-tight mb-8 relative z-10">{t('interface_localization')}</h3>

                            <div className="space-y-8 relative z-10">
                                {/* Language */}
                                <div>
                                    <label className="flex items-center gap-3 text-xs font-black text-blue-900 uppercase tracking-widest mb-4">
                                        <Globe size={16} className="text-blue-600" /> {t('system_language')}
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['EN', 'TG', 'BI'].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguage(lang)}
                                                className={`py-3 rounded-2xl font-black text-xs transition-all ${language === lang ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                                            >
                                                {lang === 'EN' ? 'English' : lang === 'TG' ? 'Tagalog' : 'Bisaya'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Theme */}
                                <div>
                                    <label className="flex items-center gap-3 text-xs font-black text-blue-900 uppercase tracking-widest mb-4">
                                        <Palette size={16} className="text-blue-600" /> {t('visual_theme')}
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['light', 'dark', 'oled'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={`py-3 rounded-2xl font-black text-xs capitalize transition-all ${theme === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Typography */}
                                <div>
                                    <label className="flex items-center gap-3 text-xs font-black text-blue-900 uppercase tracking-widest mb-4">
                                        <Type size={16} className="text-blue-600" /> {t('typography')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['inter', 'roboto'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFont(f)}
                                                className={`py-3 rounded-2xl font-black text-xs capitalize transition-all ${font === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                                            >
                                                {f} Font
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </main >

            {/* Modals & Overlays */}
            <AnimatePresence>
                {(showLogoutConfirm || showDeactivateConfirm) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => {
                            if (!isLoggingOut && !deactivateLoading) {
                                setShowLogoutConfirm(false);
                                setShowDeactivateConfirm(false);
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`w-full max-w-md ${showDeactivateConfirm ? 'bg-white' : 'bg-slate-900'} p-10 rounded-[40px] shadow-3xl text-center`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${showDeactivateConfirm ? 'bg-rose-50 text-rose-500' : 'bg-white/10 text-white'}`}>
                                {showLogoutConfirm ? <LogOutIcon size={40} /> : <AlertTriangle size={40} />}
                            </div>

                            <h3 className={`text-2xl font-black mb-4 ${showDeactivateConfirm ? 'text-slate-900' : 'text-white'}`}>
                                {showLogoutConfirm ? t('logout_confirm_title') : t('deactivate_confirm_title')}
                            </h3>
                            <p className={`text-sm font-bold uppercase tracking-widest opacity-60 mb-10 ${showDeactivateConfirm ? 'text-slate-500' : 'text-slate-300'}`}>
                                {showLogoutConfirm
                                    ? t('logout_confirm_desc')
                                    : t('deactivate_confirm_desc')}
                            </p>

                            {showDeactivateConfirm && (
                                <div className="space-y-6 mb-10 text-left">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('confirm_email')} <span className="text-slate-900 select-none">{user.email}</span></p>
                                        <input
                                            type="text"
                                            value={deactivateEmailInput}
                                            onChange={(e) => setDeactivateEmailInput(e.target.value)}
                                            placeholder={t('type_email_placeholder')}
                                            className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                                        />
                                    </div>
                                    <label className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 cursor-pointer group active:scale-[0.98] transition-all">
                                        <input
                                            type="checkbox"
                                            checked={deactivateChecked}
                                            onChange={(e) => setDeactivateChecked(e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-2 border-rose-200 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-relaxed">{t('understand_permanent')}</span>
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        setShowDeactivateConfirm(false);
                                        setDeactivateEmailInput('');
                                        setDeactivateChecked(false);
                                    }}
                                    disabled={isLoggingOut || deactivateLoading}
                                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showDeactivateConfirm ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={showLogoutConfirm ? handleLogout : handleDeactivateAccount}
                                    disabled={
                                        (showLogoutConfirm && isLoggingOut) ||
                                        (showDeactivateConfirm && (deactivateLoading || !deactivateChecked || deactivateEmailInput !== user.email))
                                    }
                                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${showDeactivateConfirm ? 'bg-rose-500 text-white disabled:opacity-30 hover:bg-rose-600 shadow-rose-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                                >
                                    {isLoggingOut || deactivateLoading ? t('loading') : t('confirm')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Logout Progress Overlay */}
            <AnimatePresence>
                {isLoggingOut && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center text-white p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="relative w-48 h-48 mb-10"
                        >
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="text-white/10"
                                />
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={553}
                                    strokeDashoffset={553 - (553 * logoutProgress) / 100}
                                    className="text-blue-500 transition-all duration-300 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black">{logoutProgress}%</span>
                            </div>
                        </motion.div>
                        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">{t('ending_session')}</h2>
                        <p className="text-sm font-bold text-white/40 tracking-[0.2em] uppercase">{t('cleaning_portal')}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
