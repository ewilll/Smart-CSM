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
                    icon={<HelpCircle size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                <div className="grid lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        {/* FAQs */}
                        <div className="floating-card p-10">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">{t('faqs')}</h3>
                            <div className="space-y-6">
                                {[
                                    { q: t('faq_q1'), a: t('faq_a1'), path: '/report-incident' },
                                    { q: t('faq_q2'), a: t('faq_a2'), path: '/analytics' },
                                    { q: t('faq_q3'), a: t('faq_a3'), path: '/history' }
                                ].map((faq, i) => (
                                    <div
                                        key={i}
                                        onClick={() => navigate(faq.path)}
                                        className="p-6 rounded-3xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{faq.q}</p>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{faq.a}</p>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <ExternalLink size={14} className="text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Contact Channels */}
                        <div className="p-8 bg-blue-600 text-white rounded-[32px] shadow-2xl shadow-blue-500/30 border border-blue-500">
                            <h3 className="text-lg font-black tracking-tight mb-8">{t('get_in_touch')}</h3>
                            <div className="space-y-4">
                                <Link to="/messages" className="flex items-center gap-4 p-4 rounded-2xl bg-white/20 hover:bg-white/30 transition-all group">
                                    <MessageSquare size={20} className="text-white" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Direct Support</p>
                                        <p className="text-sm font-bold text-white">Smart Support Chat</p>
                                    </div>
                                    <ExternalLink size={16} className="text-white/40 group-hover:text-white transition-colors" />
                                </Link>
                                <a href="tel:0288892837" className="flex items-center gap-4 p-4 rounded-2xl bg-white/20 hover:bg-white/30 transition-all group cursor-pointer">
                                    <Phone size={20} className="text-white" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Hotline</p>
                                        <p className="text-sm font-bold text-white">(02) 888-WATER</p>
                                    </div>
                                    <ExternalLink size={16} className="text-white/40 group-hover:text-white transition-colors ml-auto opacity-0 group-hover:opacity-100" />
                                </a>
                                <a href="mailto:help@primewater.com" className="flex items-center gap-4 p-4 rounded-2xl bg-white/20 hover:bg-white/30 transition-all group cursor-pointer">
                                    <Mail size={20} className="text-white" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Support Email</p>
                                        <p className="text-sm font-bold text-white">help@primewater.com</p>
                                    </div>
                                    <ExternalLink size={16} className="text-white/40 group-hover:text-white transition-colors ml-auto opacity-0 group-hover:opacity-100" />
                                </a>
                            </div>
                        </div>

                        <div className="floating-card p-8">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">{t('documentation')}</h3>
                            <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-widest leading-relaxed">{t('doc_desc')}</p>
                            <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">{t('download_pdf')}</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

