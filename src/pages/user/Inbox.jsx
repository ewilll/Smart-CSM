import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    Bell,
    MessageSquare,
    Search,
    Star,
    Trash2,
    Clock,
    Send,
    MoreVertical,
    Paperclip,
    Smile,
    User,
    ChevronLeft,
    Info,
    Check
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import DashboardHeader from '../../components/common/DashboardHeader';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';

export default function Inbox() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All Messages');
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);
    const [showMenu, setShowMenu] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        if (location.state?.initialMsg) {
            setNewMessage(location.state.initialMsg);
        }
    }, [location]);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        fetchConversations(currentUser.id);

        // Subscription for new messages
        const channel = supabase
            .channel('messenger_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${currentUser.id}`
            }, () => {
                fetchConversations(currentUser.id);
                if (selectedConv) fetchMessages(selectedConv.id);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [navigate, selectedConv?.id]);

    // Cross-tab synchronization for Capstone Demo (allows Admin and User to chat in two different windows)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'mock_messages' && selectedConv) {
                fetchMessages(selectedConv.id);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [selectedConv, user]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchConversations = async (userId) => {
        setLoading(true);
        try {
            if (user?.role === 'admin') {
                // Admin Mode: Fetch users
                const { data: users } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .eq('role', 'customer');

                const localMsgs = JSON.parse(localStorage.getItem('mock_messages') || '[]');

                const adminConvs = (users || []).map(u => {
                    const userMsgs = localMsgs.filter(m => m.sender_id === u.id || m.recipient_id === u.id);
                    const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : t('no_messages_yet');
                    return {
                        id: u.id,
                        name: u.full_name || 'Resident',
                        role: 'User',
                        avatar: null,
                        lastMsg: lastMsg,
                        time: 'Active',
                        unread: 0,
                        online: true
                    };
                });

                setConversations(adminConvs);
                if (!selectedConv && adminConvs.length > 0) setSelectedConv(adminConvs[0]);
            } else {
                // User Mode: Fetch Admin
                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('role', 'admin')
                    .limit(1)
                    .single();

                const staticConvs = [
                    {
                        id: adminProfile?.id || 'admin_support',
                        name: adminProfile?.full_name || 'PrimeWater Support',
                        role: 'Official Admin',
                        avatar: null,
                        lastMsg: t('how_can_help'),
                        time: t('just_now'),
                        unread: 0,
                        online: true
                    }
                ];
                setConversations(staticConvs);
                if (!selectedConv) setSelectedConv(staticConvs[0]);
            }
        } catch (err) {
            console.error('Conv error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (convId) => {
        if (!user || !convId) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${convId}),and(sender_id.eq.${convId},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            // Combine with localStorage mock messages for a seamless demo even without a database table
            const localMsgs = JSON.parse(localStorage.getItem('mock_messages') || '[]');
            const relevantLocal = localMsgs.filter(m => (m.sender_id === user.id && m.recipient_id === convId) || (m.sender_id === convId && m.recipient_id === user.id));

            if (data && !error) {
                setMessages([...data, ...relevantLocal].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
            } else {
                setMessages(relevantLocal.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
            }
        } catch (err) {
            console.error('Msg fetch error:', err);
            const localMsgs = JSON.parse(localStorage.getItem('mock_messages') || '[]');
            const relevantLocal = localMsgs.filter(m => (m.sender_id === user.id && m.recipient_id === convId) || (m.sender_id === convId && m.recipient_id === user.id));
            setMessages(relevantLocal);
        }
    };

    useEffect(() => {
        if (selectedConv && user) {
            fetchMessages(selectedConv.id);
        }
    }, [selectedConv, user]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending || !user || !selectedConv) return;

        setIsSending(true);
        try {
            const msgContent = newMessage.trim();
            setNewMessage('');

            // 1. Optimistic UI update and LocalStorage Backup for capstone demo
            const newMsgObj = {
                id: Date.now() + Math.random(),
                sender_id: user.id,
                recipient_id: selectedConv.id,
                content: msgContent,
                status: 'sent',
                created_at: new Date().toISOString()
            };

            const localMsgs = JSON.parse(localStorage.getItem('mock_messages') || '[]');
            localMsgs.push(newMsgObj);
            localStorage.setItem('mock_messages', JSON.stringify(localMsgs));

            // Instantly show msg on UI
            setMessages(prev => [...prev, newMsgObj]);

            // 2. Try sending to actual Database in background
            const { error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: user.id,
                    recipient_id: selectedConv.id,
                    content: msgContent,
                    status: 'sent'
                }]);

            if (error) {
                console.warn("DB send failed (409 Table/Constraint missing). Message was saved locally for demo.", error);
            }

            // 3. Trigger Real-Time Notification Bell for the recipient
            // This pushes directly to Supabase so the other user's bell lights up!
            const targetLink = user.role === 'admin' ? '/messages' : '/admin/messages';
            await supabase.from('notifications').insert([{
                user_id: selectedConv.id,
                title: 'New Chat Message',
                message: `${user.name || 'Someone'} sent: ${msgContent.substring(0, 30)}${msgContent.length > 30 ? '...' : ''}`,
                type: 'message',
                link: targetLink,
                read: false
            }]);

        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setIsSending(false);
        }
    };

    const clearChat = () => {
        if (!selectedConv || !user) return;
        if (window.confirm(t('confirm_clear_chat'))) {
            const localMsgs = JSON.parse(localStorage.getItem('mock_messages') || '[]');
            const filtered = localMsgs.filter(m => !(
                (m.sender_id === user.id && m.recipient_id === selectedConv.id) ||
                (m.sender_id === selectedConv.id && m.recipient_id === user.id)
            ));
            localStorage.setItem('mock_messages', JSON.stringify(filtered));
            setMessages([]);
            setShowMenu(false);
        }
    };

    if (!user) return null;

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <main className="dashboard-main h-screen flex flex-col overflow-hidden">
                <div className="px-8 pt-6">
                    <DashboardHeader
                        user={user}
                        onUpdateUser={setUser}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        title={t('smart_support')}
                        subtitle={t('direct_communication')}
                        icon={<MessageSquare size={28} />}
                        iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                    />
                </div>

                <div className="flex-1 overflow-hidden p-8 pt-2">
                    <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 h-full flex overflow-hidden">

                        {/* Sidebar: Conversations List */}
                        <div className="w-full md:w-80 border-r border-slate-50 flex flex-col h-full bg-slate-50/30">
                            <div className="p-6">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('search_chat')}
                                        className="w-full pl-12 pr-6 h-12 rounded-2xl bg-white border border-slate-100 font-bold text-xs uppercase tracking-widest outline-none focus:border-blue-500 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedConv(conv)}
                                        className={`p-4 rounded-[24px] flex items-center gap-4 cursor-pointer transition-all ${selectedConv?.id === conv.id ? 'bg-white shadow-xl shadow-blue-500/5' : 'hover:bg-white/50'}`}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-600 text-lg">
                                                {conv.name[0]}
                                            </div>
                                            {conv.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h4 className="font-black text-slate-800 text-sm truncate tracking-tight">{conv.name}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{conv.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate font-medium">{conv.lastMsg}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="flex-1 flex flex-col h-full bg-white relative">
                            {/* Chat Header */}
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <button className="md:hidden p-2 hover:bg-slate-100 rounded-xl">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
                                        {selectedConv?.name[0] || 'A'}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 tracking-tight">{selectedConv?.name || t('select_a_chat')}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedConv?.online ? t('online') : t('active_support')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative">
                                    <button onClick={() => setShowInfo(!showInfo)} className={`p-3 rounded-xl transition-all ${showInfo ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}><Info size={20} /></button>
                                    <button onClick={() => setShowMenu(!showMenu)} className={`p-3 rounded-xl transition-all ${showMenu ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}><MoreVertical size={20} /></button>

                                    {/* Dropdown Menu */}
                                    {showMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 py-2 z-50">
                                            <button onClick={clearChat} className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors">
                                                <Trash2 size={14} /> {t('clear_chat')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Info Panel Popup */}
                                    {showInfo && (
                                        <div className="absolute top-full right-12 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 p-4 z-50">
                                            <div className="flex flex-col items-center mb-4">
                                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-600 text-2xl mb-3">
                                                    {selectedConv?.name[0] || 'A'}
                                                </div>
                                                <h4 className="font-black text-slate-800 text-sm text-center">{selectedConv?.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedConv?.role || 'Resident'}</p>
                                            </div>
                                            <div className="border-t border-slate-50 pt-3">
                                                <p className="text-xs text-slate-500 font-medium text-center">{t('connected_secure')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-8 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
                            >
                                {messages.map((msg, i) => {
                                    const isMe = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-bubble-up`}>
                                            <div className={`max-w-[70%] group relative`}>
                                                <div className={`p-4 rounded-[28px] ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-xl shadow-blue-500/20' : 'bg-slate-100 text-slate-700 rounded-tl-none'} font-medium text-sm leading-relaxed`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`mt-2 flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && <Check size={12} className="text-blue-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-white border-t border-slate-50">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-[30px] pr-4 border border-slate-100 focus-within:border-blue-200 transition-all">
                                    <button type="button" className="p-3 text-slate-400 hover:text-blue-600 transition-colors"><Paperclip size={20} /></button>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={t('type_message')}
                                        className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-600 placeholder:text-slate-400 px-2"
                                    />
                                    <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors hidden sm:block"><Smile size={20} /></button>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 hover:scale-110 active:scale-95' : 'bg-slate-200 text-slate-400'}`}
                                    >
                                        <Send size={18} fill={newMessage.trim() ? "currentColor" : "none"} />
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
