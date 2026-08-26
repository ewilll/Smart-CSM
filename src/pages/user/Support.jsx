import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    HelpCircle,
    ChevronDown,
    MessageSquare,
    Phone,
    Mail,
    ExternalLink
} from 'lucide-react';

import DashboardHeader from '../../components/common/DashboardHeader';
import EmbeddedAIChat from '../../components/EmbeddedAIChat';
import { useTranslation } from '../../utils/translations';
import { usePreferences } from '../../context/PreferencesContext';

export default function Support() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { language } = usePreferences();
    const { t } = useTranslation(language);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
    }, [navigate]);

    if (!user) return null;

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title={t('support_title')}
                    subtitle={t('support_subtitle')}
                    icon={<HelpCircle size={24} toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />}
                />

                <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* AI Chatbox */}
                            <EmbeddedAIChat />

                            {/* FAQs */}
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8">
                                <h3 className="text-xl font-semibold text-slate-900 mb-6">{t('faqs')}</h3>
                                <div className="space-y-4">
                                    {[
                                        { q: t('faq_q1'), a: t('faq_a1'), path: '/report-incident' },
                                        { q: t('faq_q2'), a: t('faq_a2'), path: '/analytics' },
                                        { q: t('faq_q3'), a: t('faq_a3'), path: '/history' }
                                    ].map((faq, i) => (
                                        <div
                                            key={i}
                                            onClick={() => navigate(faq.path)}
                                            className="p-5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{faq.q}</p>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                                                </div>
                                                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all ml-4">
                                                    <ExternalLink size={16} className="text-blue-600" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Contact Channels */}
                            <div className="p-6 md:p-8 bg-blue-600 text-white rounded-2xl shadow-sm">
                                <h3 className="text-lg font-semibold mb-6">{t('get_in_touch')}</h3>
                                <div className="space-y-3">
                                    <Link to="/messages" className="flex items-center gap-4 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all group">
                                        <MessageSquare size={20} className="text-blue-100" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-blue-200 mb-0.5">Direct Support</p>
                                            <p className="text-sm font-semibold text-white">Smart Support Chat</p>
                                        </div>
                                        <ExternalLink size={16} className="text-blue-300 group-hover:text-white transition-colors" />
                                    </Link>
                                    <a href="tel:0288892837" className="flex items-center gap-4 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all group cursor-pointer">
                                        <Phone size={20} className="text-blue-100" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-blue-200 mb-0.5">Hotline</p>
                                            <p className="text-sm font-semibold text-white">(02) 888-WATER</p>
                                        </div>
                                        <ExternalLink size={16} className="text-blue-300 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                    </a>
                                    <a href="mailto:help@primewater.com" className="flex items-center gap-4 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all group cursor-pointer">
                                        <Mail size={20} className="text-blue-100" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-blue-200 mb-0.5">Support Email</p>
                                            <p className="text-sm font-semibold text-white">help@primewater.com</p>
                                        </div>
                                        <ExternalLink size={16} className="text-blue-300 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                    </a>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8">
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('documentation')}</h3>
                                <p className="text-sm text-slate-500 mb-6 leading-relaxed">{t('doc_desc')}</p>
                                <button className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors">
                                    {t('download_pdf')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

