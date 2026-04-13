
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
    getUnclassifiedQueries,
    adaptQuery,
    retrainModel
} from '../../utils/aiService';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import DashboardHeader from '../../components/common/DashboardHeader';
import {
    Bot,
    Search,
    RefreshCcw,
    CheckCircle,
    AlertCircle,
    Brain,
    Sparkles,
    Plus,
    X,
    Filter,
    ChevronRight,
    MessageSquare,
    Zap,
    Trash2,
    Clock,
    User
} from 'lucide-react';

const INTENTS = [
    { id: 'report_leak', label: 'Report Leak' },
    { id: 'check_bill', label: 'Check Bill' },
    { id: 'no_supply', label: 'No Supply' },
    { id: 'payment_methods', label: 'Payment Methods' },
    { id: 'water_quality', label: 'Water Quality' },
    { id: 'bill_dispute', label: 'Bill Dispute' },
    { id: 'high_consumption', label: 'High Consumption' },
    { id: 'meter_issues', label: 'Meter Issues' },
    { id: 'water_safety', label: 'Water Safety' },
    { id: 'greeting', label: 'General Greeting' },
    { id: 'feedback', label: 'Feedback/Compliment' },
    { id: 'request_service', label: 'New Service Connection' },
    { id: 'emergency', label: 'Emergency/Accident' }
];

export default function AILearning() {
    const [user, setUser] = useState(() => getCurrentUser());
    const [queries, setQueries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [serverOffline, setServerOffline] = useState(false);
    const [selectedIntents, setSelectedIntents] = useState({});
    const [notification, setNotification] = useState(null);
    const navigate = useNavigate();

    async function loadQueries() {
        setLoading(true);
        const data = await getUnclassifiedQueries();
        // If we got nothing and can't reach server, mark as offline
        if (!data || data.length === 0) {
            // Do a quick ping to distinguish "truly empty" from "server down"
            try {
                await fetch('http://localhost:8000/unclassified', { signal: AbortSignal.timeout(2000) });
                setServerOffline(false);
            } catch {
                setServerOffline(true);
            }
        } else {
            setServerOffline(false);
        }
        setQueries(data || []);
        setLoading(false);
    }

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        loadQueries();
    }, [navigate]);

    const handleTeach = async (text) => {
        const intent = selectedIntents[text];
        if (!intent) {
            showNotification('Please select an intent first', 'error');
            return;
        }

        const res = await adaptQuery(text, intent);
        if (res.status === 'success') {
            showNotification('Aqua learned a new phrase!', 'success');
            // Remove from local list
            setQueries(queries.filter(q => q.text !== text));
            // Keep the retrain warning
            showNotification('Brain adaptation pending. Don\'t forget to click "Retrain Brain"!', 'warning');
        } else {
            showNotification(res.message || 'Error teaching Aqua', 'error');
        }
    };

    const handleRetrain = async () => {
        if (serverOffline) {
            showNotification('AI Server is offline. Please start the Python server on Port 8000 first.', 'error');
            return;
        }
        setRetraining(true);
        const res = await retrainModel();
        if (res.status === 'success') {
            showNotification('Adaptation Complete! Aqua has evolved.', 'success');
        } else if (res.isOffline) {
            setServerOffline(true);
            showNotification('AI Server went offline. Please restart Port 8000.', 'error');
        } else {
            showNotification(res.message || 'Retrain failed', 'error');
        }
        setRetraining(false);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const filteredQueries = queries.filter(q =>
        q.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main overflow-y-auto relative">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title="Adaptation Center"
                    subtitle="Autonomous Self-Learning AI Environment"
                    icon={<Brain size={28} />}
                    iconBgColor="bg-blue-600"
                    action={
                        <button
                            onClick={handleRetrain}
                            disabled={retraining || serverOffline}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${retraining || serverOffline
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                        >
                            {retraining ? (
                                <>
                                    <RefreshCcw size={20} className="animate-spin" />
                                    Adapting Brain...
                                </>
                            ) : (
                                <>
                                    <Zap size={20} fill="currentColor" />
                                    Retrain Brain
                                </>
                            )}
                        </button>
                    }
                />

                {/* AI Server Offline Banner */}
                {serverOffline && (
                    <div className="mx-8 mt-4 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="font-bold text-amber-800 text-sm">AI Server Offline (Port 8000)</p>
                                <p className="text-amber-600 text-xs">The local Python AI server is not running. Query fetching and retraining are unavailable.</p>
                            </div>
                        </div>
                        <button
                            onClick={loadQueries}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all"
                        >
                            <RefreshCcw size={14} />
                            Retry
                        </button>
                    </div>
                )}

                <div className="p-8 max-w-6xl mx-auto">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Pending Knowledge</p>
                                <p className="text-2xl font-bold text-slate-900">{queries.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Model Status</p>
                                <p className="text-2xl font-bold text-green-600">Evolution Ready</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Bot size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Phrases</p>
                                <p className="text-2xl font-bold text-slate-900">10,000+</p>
                            </div>
                        </div>
                    </div>

                    {/* Learning Queue */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                        <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={20} className="text-slate-400" />
                                <h2 className="font-bold text-slate-900">Unknown Query Queue</h2>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search queries..."
                                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full md:w-64"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCcw size={32} className="text-blue-600 animate-spin" />
                                <p className="text-slate-500 font-medium">Scanning for unknown knowledge...</p>
                            </div>
                        ) : filteredQueries.length === 0 ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <div className="h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-900">Aqua is perfectly adapted</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto">All recent user queries are understood. No new knowledge needed right now.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">User Query</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Detected On</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Intent</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredQueries.map((q, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                            <User size={16} />
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-900 italic">"{q.text}"</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-slate-400">
                                                        {new Date(q.timestamp).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                        value={selectedIntents[q.text] || ''}
                                                        onChange={(e) => setSelectedIntents({ ...selectedIntents, [q.text]: e.target.value })}
                                                    >
                                                        <option value="">Select Category...</option>
                                                        {INTENTS.map(intent => (
                                                            <option key={intent.id} value={intent.id}>{intent.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleTeach(q.text)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white font-bold text-xs transition-all shadow-sm"
                                                    >
                                                        <Sparkles size={14} />
                                                        Teach Aqua
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {notification && (
                    <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${notification.type === 'error' ? 'bg-red-600 text-white' :
                        notification.type === 'warning' ? 'bg-orange-600 text-white' :
                            'bg-slate-900 text-white'
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

