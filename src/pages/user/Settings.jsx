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
    Type,
    LogOut as LogOutIcon,
    AlertTriangle
} from 'lucide-react';

import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

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

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Import supabase dynamically
            const { supabase } = await import('../../utils/supabaseClient');
            const { updateUserProfile } = await import('../../utils/auth');

            let finalAvatarUrl = null;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                console.error("Avatar storage upload failed:", uploadError);
                throw new Error(`Avatar upload failed: ${uploadError.message}`);
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            finalAvatarUrl = data.publicUrl;

            // Update profile with the resulting URL
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
                    icon={<SettingsIcon size={24} toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />}
                />

                <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Security & Profile */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">{t('personal_info')}</h3>
                                        <p className="text-sm text-slate-500">{t('account_profile_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                                    <div className="relative group">
                                        <img
                                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff&size=120`}
                                            className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                                            alt="Large Avatar"
                                        />
                                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">
                                            {uploadingAvatar ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Camera size={16} />}
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
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{user.name}</h3>
                                        <p className="text-sm text-slate-500">{isAdmin ? t('administrator') : t('resident_member')}</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('first_name')}</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            placeholder={t('enter_first_name')}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('last_name')}</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            placeholder={t('enter_last_name')}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('residential_place')}</label>
                                        <select
                                            name="barangay"
                                            value={formData.barangay}
                                            onChange={handleInputChange}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>{t('barangay_placeholder')}</option>
                                            <option value="Aglayan">Aglayan</option>
                                            <option value="Bangcud">Bangcud</option>
                                            <option value="Casisang">Casisang</option>
                                            <option value="Dalwangan">Dalwangan</option>
                                            <option value="Imbayao">Imbayao</option>
                                            <option value="Kalasungay">Kalasungay</option>
                                            <option value="Laguitas">Laguitas</option>
                                            <option value="Linabo">Linabo</option>
                                            <option value="Magsaysay">Magsaysay</option>
                                            <option value="Poblacion">Poblacion</option>
                                            <option value="San Jose">San Jose</option>
                                            <option value="Sumpong">Sumpong</option>
                                            <option value="Zamboanguita">Zamboanguita</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('email_identity')}</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('contact_number')}</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Feedback Messages */}
                                {message.content && (
                                    <div className={`mt-6 p-4 rounded-xl font-medium text-sm flex items-center justify-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                        {message.content}
                                    </div>
                                )}

                                <div className="mt-8 flex justify-end pt-6 border-t border-slate-100">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? t('loading') : t('save_changes')}
                                    </button>
                                </div>
                            </div>

                            {/* Password Reset Section */}
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">{t('password_mgmt')}</h3>
                                        <p className="text-sm text-slate-500">{t('secure_reset_email')}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-600">{t('password_reset_desc')}</p>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            placeholder={t('confirm_email_address')}
                                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                        />
                                        <button
                                            onClick={handlePasswordReset}
                                            disabled={resetLoading}
                                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {resetLoading ? t('sending') : t('send_link')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Side-by-Side Danger Zone & Account Session */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {!isAdmin && (
                                    <div className="bg-white border border-rose-100 rounded-2xl shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-rose-700 mb-2">{t('danger_zone')}</h3>
                                        <p className="text-sm text-rose-600 mb-6">{t('permanent_loss')}</p>
                                        <button
                                            onClick={() => setShowDeactivateConfirm(true)}
                                            className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium text-sm hover:bg-rose-100 transition-colors"
                                        >
                                            {t('deactivate_account')}
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('account_session')}</h3>
                                    <p className="text-sm text-slate-500 mb-6">{t('account_session_desc')}</p>
                                    <button
                                        onClick={() => setShowLogoutConfirm(true)}
                                        disabled={isLoggingOut}
                                        className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogOutIcon size={16} />
                                        {t('logout')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-slate-900 mb-6">{t('notification_prefs')}</h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'pushNotifications', label: 'Push Notifications', icon: <Bell />, enabled: preferences.pushNotifications },
                                        { id: 'usageReports', label: 'Usage Reports', icon: <TrendingUp />, enabled: preferences.usageReports },
                                        { id: 'twoFactor', label: '2FA Protection', icon: <Shield />, enabled: preferences.twoFactor },
                                        { id: 'systemSounds', label: 'System Sounds', icon: <Plus />, enabled: preferences.systemSounds },
                                    ].map((item, i) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleTogglePreference(item.id)}
                                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg transition-colors duration-200 ${item.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {React.cloneElement(item.icon, { size: 16 })}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                            </div>
                                            <div className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ${item.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform ${item.enabled ? 'translate-x-5' : ''} transition-transform duration-200 ease-in-out`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Internationalization & Theming Block */}
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-slate-900 mb-6">{t('interface_localization')}</h3>

                                <div className="space-y-6">
                                    {/* Language */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                            <Globe size={16} className="text-slate-400" /> {t('system_language')}
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['EN', 'TG', 'BI'].map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setLanguage(lang)}
                                                    className={`py-2 rounded-lg font-medium text-sm transition-colors ${language === lang ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    {lang === 'EN' ? 'English' : lang === 'TG' ? 'Tagalog' : 'Bisaya'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Theme */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                            <Palette size={16} className="text-slate-400" /> {t('visual_theme')}
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['light', 'dark', 'oled'].map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTheme(t)}
                                                    className={`py-2 rounded-lg font-medium text-sm capitalize transition-colors ${theme === t ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Typography */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                            <Type size={16} className="text-slate-400" /> {t('typography')}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['inter', 'roboto'].map((f) => (
                                                <button
                                                    key={f}
                                                    onClick={() => setFont(f)}
                                                    className={`py-2 rounded-lg font-medium text-sm capitalize transition-colors ${font === f ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
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
                </div>
            </main>

            {/* Modals & Overlays */}
            {(showLogoutConfirm || showDeactivateConfirm) && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40"
                    onClick={() => {
                        if (!isLoggingOut && !deactivateLoading) {
                            setShowLogoutConfirm(false);
                            setShowDeactivateConfirm(false);
                        }
                    }}
                >
                    <div
                        className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-xl text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${showDeactivateConfirm ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                            {showLogoutConfirm ? <LogOutIcon size={24} /> : <AlertTriangle size={24} />}
                        </div>

                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            {showLogoutConfirm ? t('logout_confirm_title') : t('deactivate_confirm_title')}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {showLogoutConfirm
                                ? t('logout_confirm_desc')
                                : t('deactivate_confirm_desc')}
                        </p>

                        {showDeactivateConfirm && (
                            <div className="space-y-4 mb-6 text-left">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs font-medium text-slate-500 mb-1">{t('confirm_email')} <span className="text-slate-900">{user.email}</span></p>
                                    <input
                                        type="text"
                                        value={deactivateEmailInput}
                                        onChange={(e) => setDeactivateEmailInput(e.target.value)}
                                        placeholder={t('type_email_placeholder')}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                    />
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deactivateChecked}
                                        onChange={(e) => setDeactivateChecked(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <span className="text-xs text-rose-700 leading-tight">{t('understand_permanent')}</span>
                                </label>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    setShowDeactivateConfirm(false);
                                    setDeactivateEmailInput('');
                                    setDeactivateChecked(false);
                                }}
                                disabled={isLoggingOut || deactivateLoading}
                                className="py-2.5 rounded-xl font-medium text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={showLogoutConfirm ? handleLogout : handleDeactivateAccount}
                                disabled={
                                    (showLogoutConfirm && isLoggingOut) ||
                                    (showDeactivateConfirm && (deactivateLoading || !deactivateChecked || deactivateEmailInput !== user.email))
                                }
                                className={`py-2.5 rounded-xl font-medium text-sm text-white transition-colors disabled:opacity-50 ${showDeactivateConfirm ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isLoggingOut || deactivateLoading ? t('loading') : t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Progress Overlay */}
            {isLoggingOut && (
                <div
                    className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-6"
                >
                    <div
                        className="relative w-32 h-32 mb-8"
                    >
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-slate-100"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={352}
                                strokeDashoffset={352 - (352 * logoutProgress) / 100}
                                className="text-blue-600 transition-all duration-300 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-slate-900">{logoutProgress}%</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">{t('ending_session')}</h2>
                    <p className="text-sm text-slate-500">{t('cleaning_portal')}</p>
                </div>
            )}
        </div>
    );
}
