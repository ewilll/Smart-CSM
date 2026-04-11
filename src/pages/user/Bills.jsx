import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../utils/supabaseClient';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    Receipt,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    ArrowRight,
    Search,
    Download
} from 'lucide-react';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

export default function Bills() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedBill, setSelectedBill] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        document.title = "My Bills | Smart CSM";
        fetchBills(currentUser);

        // Real-time synchronization
        const billChannel = supabase
            .channel('user_bills_page')
            .on('postgres_changes', { event: '*', table: 'bills', filter: `user_id=eq.${currentUser.id}` }, () => fetchBills(currentUser))
            .subscribe();

        return () => {
            supabase.removeChannel(billChannel);
        };
    }, [navigate]);

    const fetchBills = async (currentUser) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (data) setBills(data);
        } catch (err) {
            console.error('Error fetching bills:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const handlePrint = (bill) => {
        setSelectedBill(bill);
        // We need a slight delay to ensure the component renders before printing
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Unpaid': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (!user) return null;

    const filteredBills = filterStatus === 'All'
        ? bills
        : bills.filter(b => b.status === filterStatus);

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title={t('bills')}
                    subtitle={t('billing_system_subtitle')}
                    icon={<Receipt size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                {/* Unpaid Summary Card */}
                <div className="grid lg:grid-cols-3 gap-8 mb-12">
                    <div
                        onClick={() => {
                            const unpaid = bills.find(b => b.status === 'Unpaid');
                            if (unpaid) {
                                // Maybe scroll to table or just keep user on page
                                setFilterStatus('Unpaid');
                            }
                        }}
                        className="lg:col-span-2 p-8 rounded-[40px] bg-white border border-blue-100 shadow-2xl shadow-blue-500/5 relative overflow-hidden group cursor-pointer hover:shadow-blue-500/10 transition-all active:scale-[0.99]"
                    >
                        <div className="relative z-10">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6">{t('latest_bill')}</span>

                            {bills.find(b => b.status === 'Unpaid') ? (
                                <>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-5xl font-black text-slate-800 tracking-tighter">₱{bills.find(b => b.status === 'Unpaid').amount.toLocaleString()}</span>
                                        <span className="text-slate-400 font-bold">{t('total_due')}</span>
                                    </div>
                                    <p className="text-slate-500 font-medium mb-8">{t('due_date_label')}: {new Date(bills.find(b => b.status === 'Unpaid').due_date).toLocaleDateString()}</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); /* Payment logic here */ }}
                                        className="btn-primary !w-auto px-10 h-14"
                                    >
                                        {t('pay_now')} <ArrowRight size={20} />
                                    </button>
                                </>
                            ) : (
                                <div className="py-4">
                                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                        <CheckCircle size={32} />
                                        <h3 className="text-2xl font-black tracking-tight">{t('all_settled')}</h3>
                                    </div>
                                    <p className="text-slate-500 font-medium">{t('no_pending_bills')}</p>
                                </div>
                            )}
                        </div>
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000"></div>
                    </div>

                    <div
                        onClick={() => navigate('/settings')}
                        className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 flex flex-col justify-center cursor-pointer hover:bg-slate-800 transition-all active:scale-[0.98] group"
                    >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">{t('account_summary')}</p>
                        <h4 className="text-2xl font-black mb-6">{user.account_no || '--- --- ---'}</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-slate-400">{t('status')}</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase">{t('active')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bills Table */}
                <div className="floating-card p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('billing_history')}</h3>

                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto scrollbar-hide">
                            {['All', 'Unpaid', 'Paid', 'Overdue'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${filterStatus === status
                                        ? 'bg-white text-blue-600 shadow-md translate-y-[-1px]'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {t(status.toLowerCase())}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Bills...</p>
                        </div>
                    ) : filteredBills.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">{t('bill_id_period')}</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">{t('reading_label')}</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">{t('amount_label')}</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">{t('status')}</th>
                                        <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBills.map((bill) => (
                                        <tr key={bill.id} className="group hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                        <Receipt size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-sm">#{bill.id.slice(0, 8).toUpperCase()}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(bill.reading_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4 font-bold text-slate-700 text-sm">
                                                {bill.consumption} m³
                                            </td>
                                            <td className="py-6 px-4 font-black text-slate-800 text-sm">
                                                ₱{bill.amount.toLocaleString()}
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(bill.status)}`}>
                                                    {t(bill.status.toLowerCase())}
                                                </span>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <button
                                                    onClick={() => handlePrint(bill)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                            <Clock size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t('no_bills_found')}</p>
                        </div>
                    )}
                </div>

                {/* Hidden Receipt Template for Printing */}
                <ReceiptTemplate bill={selectedBill} user={user} />
            </main>
        </div>
    );
}
