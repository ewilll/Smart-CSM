
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getSystemConfig, updateSystemConfig } from '../../utils/aiService';
import {
    Settings,
    Map,
    MessageSquare,
    Save,
    RefreshCcw,
    Plus,
    Trash2,
    Info,
    AlertCircle,
    CheckCircle,
    Phone,
    Clock,
    Globe,
    ChevronRight,
    Search,
    X,
    Activity
} from 'lucide-react';
import DashboardHeader from '../../components/common/DashboardHeader';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

export default function SystemConfig() {
    const [config, setConfig] = useState({
        MALAYBALAY_BARANGAYS: [],
        HOTLINES: []
    });
    const [loading, setLoading] = useState(true);
    const [serverOffline, setServerOffline] = useState(false);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    const navigate = useNavigate();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        setUser(getCurrentUser());
        loadConfig();
    }, [navigate]);
    const [activeTab, setActiveTab] = useState('barangays');

    // Edit states
    const [newBarangay, setNewBarangay] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        const data = await getSystemConfig();
        if (data) {
            setConfig(data);
            setServerOffline(!!data.isOffline);
        } else {
            setServerOffline(true);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateSystemConfig(config);
        if (res.status === 'success') {
            showNotification('System DNA updated successfully!', 'success');
        } else {
            showNotification(res.message || 'Error updating config', 'error');
        }
        setSaving(false);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const addBarangay = () => {
        if (!newBarangay || config.MALAYBALAY_BARANGAYS.includes(newBarangay)) return;
        setConfig({
            ...config,
            MALAYBALAY_BARANGAYS: [...config.MALAYBALAY_BARANGAYS, newBarangay].sort()
        });
        setNewBarangay('');
    };

    const removeBarangay = (name) => {
        setConfig({
            ...config,
            MALAYBALAY_BARANGAYS: config.MALAYBALAY_BARANGAYS.filter(b => b !== name)
        });
    };



    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw size={40} className="text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-bold">Loading System DNA...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main">
                {/* Header */}
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    title={t('master_system_config')}
                    subtitle={t('global_dna_subtitle')}
                    icon={<Settings size={28} />}
                    iconBgColor="bg-slate-900"
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    searchQuery={searchTerm}
                    setSearchQuery={setSearchTerm}
                    placeholder={t('searchPlace')}
                />

                <div className="px-8 pb-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || serverOffline}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${saving || serverOffline
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-black hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                    >
                        {saving ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />}
                        {saving ? t('saving_dna') : t('commit_changes')}
                    </button>
                </div>

                <div className="p-8 max-w-6xl mx-auto">
                    {/* Server Offline Warning */}
                    {serverOffline && (
                        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-amber-800">
                                <div className="p-3 bg-amber-100 rounded-2xl">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold tracking-tight italic uppercase">{t('ai_server_offline')}</h3>
                                    <p className="text-sm font-semibold opacity-80">{t('dna_sync_error')}</p>
                                </div>
                            </div>
                            <button
                                onClick={loadConfig}
                                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shrink-0"
                            >
                                <RefreshCcw size={14} /> Reconnect DNA
                            </button>
                        </div>
                    )}

                    {/* Tabs Navigation */}
                    <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 w-full sm:w-fit">
                        <button
                            onClick={() => setActiveTab('barangays')}
                            className={`flex items-center justify-center sm:justify-start gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'barangays' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Map size={18} />
                            {t('geofenced_barangays')}
                        </button>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Globe size={18} />
                            {t('operations_hub')}
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mb-12">
                        {activeTab === 'barangays' && (
                            <div className="p-8">
                                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('service_area_coverage')}</h2>
                                        <p className="text-slate-500">{t('service_area_desc')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Add new barangay..."
                                                className="pl-4 pr-10 py-3 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all w-full md:w-64 font-semibold"
                                                value={newBarangay}
                                                onChange={(e) => setNewBarangay(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && addBarangay()}
                                            />
                                            <button
                                                onClick={addBarangay}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {config.MALAYBALAY_BARANGAYS?.map((b, idx) => (
                                        <div
                                            key={idx}
                                            className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all"
                                        >
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{b}</span>
                                            <button
                                                onClick={() => removeBarangay(b)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                        {activeTab === 'general' && (
                            <div className="p-8 max-w-2xl">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('operations_hub_settings')}</h2>
                                <p className="text-slate-500 mb-10">{t('operations_hub_desc')}</p>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Phone size={16} />
                                            Customer Hotlines (Array)
                                        </label>
                                        <div className="space-y-2">
                                            {config.HOTLINES.map((h, idx) => (
                                                <div key={idx} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                        value={h}
                                                        onChange={(e) => {
                                                            const newHotlines = [...config.HOTLINES];
                                                            newHotlines[idx] = e.target.value;
                                                            setConfig({ ...config, HOTLINES: newHotlines });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newHotlines = config.HOTLINES.filter((_, i) => i !== idx);
                                                            setConfig({ ...config, HOTLINES: newHotlines });
                                                        }}
                                                        className="p-3 text-red-400 hover:text-red-600"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setConfig({ ...config, HOTLINES: [...config.HOTLINES, ''] })}
                                                className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mt-2"
                                            >
                                                <Plus size={16} /> Add Hotline
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                            <Clock size={16} />
                                            Active Office Hours
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            value={config.OFFICE_HOURS}
                                            onChange={(e) => setConfig({ ...config, OFFICE_HOURS: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {notification && (
                    <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                        }`}>
                        {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span className="font-semibold">{notification.message}</span>
                        <X size={18} className="ml-2 cursor-pointer opacity-70 hover:opacity-100" onClick={() => setNotification(null)} />
                    </div>
                )}
            </main>
        </div>
    );
}

