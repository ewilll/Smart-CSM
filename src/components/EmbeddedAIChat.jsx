import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, User, Sparkles, Maximize2, Minimize2, Droplets, AlertCircle } from 'lucide-react';
import { getAIChatResponse } from '../utils/aiService';
import { getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabaseClient';

export default function EmbeddedAIChat() {
    
    const [isExpanded, setIsExpanded] = useState(false); // New State for Expand/Minimize
    const [messages, setMessages] = useState(() => {
        const saved = sessionStorage.getItem('smart_csm_ai_chat_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiConfig, setAiConfig] = useState({
        mascotName: 'Aqua',
        welcomeMessage: 'Hello! I am Aqua, your PrimeWater assistant. How can I help you manage your water services today?',
        isMaintenance: false
    });
    const messagesEndRef = useRef(null);
    const constraintsRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    // List of pages where the floating mascot should NOT show up (to avoid clutter)
    const excludedPages = ['/track', '/customer-service', '/about', '/login', '/signup'];
    const isExcluded = excludedPages.includes(location.pathname);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    useEffect(() => {
        scrollToBottom();
        sessionStorage.setItem('smart_csm_ai_chat_history', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'ai_config')
                    .single();

                if (data?.value) {
                    setAiConfig(data.value);
                }
            } catch (err) {
                console.error('Error fetching AI config:', err);
            }
        };

        fetchConfig();

        // Subscribe to settings changes
        const channel = supabase
            .channel('system_settings_changes_embedded')
            .on('postgres_changes', { event: 'UPDATE', table: 'system_settings', filter: 'key=eq.ai_config' }, (payload) => {
                if (payload.new?.value) {
                    setAiConfig(payload.new.value);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        const isAuthenticatedUser = !!currentUser;

        try {
            let aiResponse = await getAIChatResponse(messages, userMessage, isAuthenticatedUser);

            let cleanResponse = aiResponse;
            let requiresSmsHelp = false;
            let extractedLinks = [];

            // 1. Extract SMS Emergency flag
            if (aiResponse.includes("[SMS_EMERGENCY]")) {
                requiresSmsHelp = true;
                cleanResponse = cleanResponse.replace("[SMS_EMERGENCY]", "").trim();
            }

            // 2. Extract Multiple Links: [LINK:/path|Label] or [LINK:/path]
            const linkRegex = /\[LINK:(.*?)\]/g;
            let match;
            while ((match = linkRegex.exec(aiResponse)) !== null) {
                const parts = match[1].split('|');
                extractedLinks.push({
                    path: parts[0],
                    label: parts[1] || 'Take me there'
                });
                cleanResponse = cleanResponse.replace(match[0], "");
            }
            cleanResponse = cleanResponse.trim();

            const isFallback = cleanResponse.includes("Offline Mode") || cleanResponse.includes("limited internet connection") || cleanResponse.includes("I don't have a specific answer");

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: cleanResponse,
                showHandoff: isFallback,
                showSmsButton: requiresSmsHelp,
                deepLinks: extractedLinks // Updated to array
            }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting to my local brain. Please check if the AI server is running!",
                showHandoff: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleHandoff = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('support_tickets')
                .insert([{
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    subject: 'AI Handoff Request',
                    description: `User requested human assistance. Last message: ${messages[messages.length - 1]?.content}`,
                    status: 'Open',
                    priority: 'Medium',
                    metadata: { transcript: messages }
                }]);

            if (error) throw error;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I've notified our human support team! They will review our conversation and get back to you shortly. You can also check your 'History' for updates."
            }]);
        } catch (err) {
            console.error('Handoff error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: "I had trouble connecting to the support team, but I've logged your request. Please try again later or visit our office." }]);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Expand Mode
    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    if (isAdmin || isExcluded) return null;

    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden mb-6" style={{ height: '550px' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30 rotate-3">
                        <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl leading-none tracking-tight">{aiConfig.mascotName} Chat</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className={`w-2 h-2 ${aiConfig.isMaintenance ? 'bg-rose-400' : 'bg-emerald-400'} rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]`}></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
                                {aiConfig.isMaintenance ? 'Maintenance' : 'Synchronized'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/80 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-4 rounded-[24px] text-sm font-bold shadow-sm flex flex-col ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                            }`}>
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                            {msg.showSmsButton && (
                                <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-2">
                                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-wider italic flex items-center gap-1">
                                        <AlertCircle size={10} /> No Internet Required
                                    </p>
                                    <a
                                        href="sms:+639123456789?body=EMERGENCY%20WATER%20REPORT:%20[Please%20type%20your%20Location/Address%20and%20Concern%20here]"
                                        className="w-full py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare size={14} /> Send SMS Alert
                                    </a>
                                </div>
                            )}
                            {msg.deepLinks && msg.deepLinks.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                    {msg.deepLinks.map((link, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (link.path === '/chat-handoff') handleHandoff();
                                                else navigate(link.path);
                                            }}
                                            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                        >
                                            {link.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {msg.showHandoff && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                    <button
                                        onClick={handleHandoff}
                                        className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                                    >
                                        Talk to Human Support
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="px-5 py-4 bg-white border border-slate-100 rounded-[24px] rounded-tl-none shadow-sm flex gap-2 items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-50 shrink-0">
                <div className="relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={aiConfig.isMaintenance ? "AI is currently offline..." : "Ask Aqua anything..."}
                        disabled={aiConfig.isMaintenance || loading}
                        className="w-full bg-slate-100 border-none rounded-[32px] py-4 pl-7 pr-16 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-600/10 focus:bg-white transition-all outline-none shadow-inner disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim() || aiConfig.isMaintenance}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:scale-110 active:scale-90 disabled:opacity-50 disabled:transform-none transition-all"
                    >
                        <Send className="w-4 h-4 pointer-events-none" />
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => setInput('How to pay my bill?')} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">💳 Pay Bill</button>
                    <button type="button" onClick={() => setInput('Report a water leak')} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">🚰 Report Leak</button>
                    <button type="button" onClick={() => setInput('Why no water?')} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase border border-amber-100 hover:bg-amber-600 hover:text-white transition-all">🚫 No Water</button>
                </div>
            </form>
        </div>
    );
}
