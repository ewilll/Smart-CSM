import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles, Maximize2, Minimize2, Droplets, AlertCircle } from 'lucide-react';
import { getAIChatResponse } from '../utils/aiService';
import { getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabaseClient';

// Aqua Mascot Component - Extracted to prevent re-renders resetting position
const AquaMascot = ({ isOpen, setIsOpen, dragRef, mascotName }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [messageIndex, setMessageIndex] = useState(0);

    const helperMessages = [
        "Double Click Me!",
        "Need Help?",
        "Have Questions?",
        "Track your Bill?",
        "Report an Issue?",
        "I'm Aqua!"
    ];

    useEffect(() => {
        if (isOpen) return;
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % helperMessages.length);
        }, 3000); // Changed from 2000 to 3000
        return () => clearInterval(interval);
    }, [isOpen]);

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={dragRef}
            whileHover={{ scale: 1.1, rotate: 2 }}
            whileTap={{ scale: 0.9, rotate: -2 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onDoubleClick={() => !isOpen && setIsOpen(true)}
            className="relative cursor-grab active:cursor-grabbing group pointer-events-auto"
        >
            {/* The Water Drop Body - Droplet Shape */}
            <div className="relative w-24 h-24 bg-gradient-to-b from-blue-300 via-blue-500 to-blue-700 rounded-full rounded-tr-none -rotate-45 shadow-2xl flex flex-col items-center justify-center border-2 border-white/30 backdrop-blur-sm z-50 pointer-events-none">
                {/* Internal container to keep face upright */}
                <div className="rotate-45 w-full h-full flex flex-col items-center justify-center">
                    {/* Shine effect */}
                    <div className="absolute top-2 right-4 w-5 h-3 bg-white/40 rounded-full blur-[2px]"></div>

                    {/* Eyes */}
                    <div className="flex gap-3 mb-2 mt-2">
                        <motion.div
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 3, times: [0, 0.9, 0.95, 1] }}
                            className="w-4 h-6 bg-slate-900 rounded-full relative overflow-hidden"
                        >
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                        </motion.div>
                        <motion.div
                            animate={{ scaleY: [1, 1, 0.1, 1] }}
                            transition={{ repeat: Infinity, duration: 3, times: [0, 0.9, 0.95, 1] }}
                            className="w-4 h-6 bg-slate-900 rounded-full relative overflow-hidden"
                        >
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                        </motion.div>
                    </div>

                    {/* Mouth */}
                    <motion.div
                        animate={isHovered ? { scaleX: 1.2 } : { scaleX: 1 }}
                        className="w-6 h-3 border-b-4 border-slate-900 rounded-full"
                    ></motion.div>
                </div>
            </div>

            {/* Badge - Moved outside to stay horizontal */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-white/20 z-[60] pointer-events-none">
                {mascotName || 'AQUA'} SUPPORT
            </div>

            {/* Arms */}
            <motion.div
                animate={{ rotate: [10, -10, 10] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -left-4 top-10 w-8 h-2 bg-blue-500 rounded-full origin-right border-l-4 border-blue-300 z-40 pointer-events-none"
            ></motion.div>
            <motion.div
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -right-4 top-10 w-8 h-2 bg-blue-500 rounded-full origin-left border-r-4 border-blue-300 z-40 pointer-events-none"
            ></motion.div>

            {/* Floating text bubble prompt */}
            {!isOpen && (
                <div className="absolute -top-12 -right-8 z-[70] pointer-events-none flex justify-center items-center w-32 h-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={messageIndex}
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white p-2 rounded-2xl rounded-bl-sm shadow-xl border border-slate-100 text-[10px] font-black text-blue-600 whitespace-nowrap absolute"
                        >
                            {helperMessages[messageIndex]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // New State for Expand/Minimize
    const [messages, setMessages] = useState([]);
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
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'ai_config')
                    .single();

                const isGuest = !currentUser;
                const guestWelcome = "Hello! I am Aqua, your exclusive PrimeWater customer care AI. I see you are browsing as a guest. How can I help you today? Please log in to fully use the system and allow me to assist you better!";

                if (data?.value) {
                    setAiConfig(data.value);
                    const defaultWelcome = data.value.welcomeMessage || 'Hello! I am Aqua, your PrimeWater assistant. How can I help you manage your water services today?';
                    setMessages([{ role: 'assistant', content: isGuest ? guestWelcome : defaultWelcome }]);
                } else {
                    const fallbackWelcome = 'Hello! I am Aqua, your PrimeWater assistant. How can I help you manage your water services today?';
                    setMessages([{ role: 'assistant', content: isGuest ? guestWelcome : fallbackWelcome }]);
                }
            } catch (err) {
                console.error('Error fetching AI config:', err);
                const isGuest = !currentUser;
                const guestWelcome = "Hello! I am Aqua, your exclusive PrimeWater customer care AI. I see you are browsing as a guest. How can I help you today? Please log in to fully use the system and allow me to assist you better!";
                const fallbackWelcome = 'Hello! I am Aqua, your PrimeWater assistant. How can I help you manage your water services today?';
                setMessages([{ role: 'assistant', content: isGuest ? guestWelcome : fallbackWelcome }]);
            }
        };

        fetchConfig();

        // Subscribe to settings changes
        const channel = supabase
            .channel('system_settings_changes')
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
        <>
            {/* Full screen constraints container - invisible */}
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9999]" />

            <div className={`fixed z-[10000] pointer-events-none flex flex-col transition-all duration-300 ${(isOpen && isExpanded) ? 'inset-0 items-center justify-center bg-slate-900/50 backdrop-blur-sm' : 'bottom-10 right-10 items-end'}`}>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            drag={!isExpanded}
                            dragConstraints={constraintsRef}
                            dragElastic={0}
                            dragMomentum={false}
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                width: isExpanded ? '85vw' : '380px',
                                height: isExpanded ? '85vh' : '550px',
                                maxWidth: isExpanded ? '1000px' : '380px'
                            }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className={`pointer-events-auto bg-white rounded-[28px] md:rounded-[40px] shadow-4xl shadow-slate-900/30 overflow-hidden flex flex-col border border-slate-100 relative origin-bottom-right ${!isExpanded ? 'mb-4 sm:mb-6 w-[92vw] h-[75vh] md:w-[380px] md:h-[550px]' : ''}`}
                        >
                            {/* Header (Drag Handle) */}
                            <div className={`bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 text-white flex items-center justify-between relative overflow-hidden shrink-0 ${!isExpanded ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="flex items-center gap-4 relative z-10 pointer-events-none">
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
                                <div className="flex items-center gap-2 relative z-10">
                                    <button
                                        onClick={toggleExpand}
                                        className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all cursor-pointer"
                                        title={isExpanded ? "Collapse" : "Expand"}
                                    >
                                        {isExpanded ? <Minimize2 className="w-5 h-5 pointer-events-none" /> : <Maximize2 className="w-5 h-5 pointer-events-none" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            setIsExpanded(false);
                                        }}
                                        className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all cursor-pointer"
                                    >
                                        <X className="w-6 h-6 pointer-events-none" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/80 custom-scrollbar cursor-auto">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        key={i}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] px-5 py-4 rounded-[24px] text-sm font-bold shadow-sm flex flex-col ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                            }`}>
                                            <span className="whitespace-pre-wrap">{msg.content}</span>
                                            {msg.showSmsButton && (
                                                <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-2 relative z-50">
                                                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-wider italic flex items-center gap-1">
                                                        <AlertCircle size={10} /> No Internet Required
                                                    </p>
                                                    <a
                                                        href="sms:+639123456789?body=EMERGENCY%20WATER%20REPORT:%20[Please%20type%20your%20Location/Address%20and%20Concern%20here]"
                                                        className="w-full py-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Send size={12} /> Send Emergency SMS
                                                    </a>
                                                    <p className="text-[9px] text-slate-400 text-center leading-tight mt-1">
                                                        This will open your phone's native messaging app to text our 24/7 Admin hotline. Standard SMS rates apply.
                                                    </p>
                                                </div>
                                            )}
                                            {msg.deepLinks && msg.deepLinks.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-2 relative z-50 pointer-events-auto">
                                                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-wider italic flex items-center gap-1">
                                                        <Sparkles size={10} /> Interactive Actions
                                                    </p>
                                                    {msg.deepLinks.map((link, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                navigate(link.path);
                                                                if (window.innerWidth < 768) setIsOpen(false);
                                                            }}
                                                            className="w-full py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {link.label} 👉
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {msg.showHandoff && (
                                                <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col gap-2">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider italic">AI expertise limit reached</p>
                                                    <button
                                                        onClick={handleHandoff}
                                                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <MessageSquare size={12} />
                                                        Talk to Human Agent
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white px-5 py-4 rounded-[24px] rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-3">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-50 shrink-0 cursor-auto">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={aiConfig.isMaintenance ? "AI is currently offline for maintenance..." : "Ask Aqua anything..."}
                                        disabled={aiConfig.isMaintenance || loading}
                                        className="w-full bg-slate-100 border-none rounded-[24px] py-4.5 pl-7 pr-16 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-600/10 focus:bg-white transition-all outline-none shadow-inner disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !input.trim() || aiConfig.isMaintenance}
                                        className="absolute right-2 top-2 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:scale-110 active:scale-90 disabled:opacity-50 disabled:transform-none transition-all"
                                    >
                                        <Send className="w-5 h-5 pointer-events-none" />
                                    </button>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInput("How to pay my bill?")}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                        💳 Pay Bill
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInput("Report a water leak")}
                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                                    >
                                        🚰 Report Leak
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInput("Why no water?")}
                                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase border border-amber-100 hover:bg-amber-600 hover:text-white transition-all"
                                    >
                                        🚫 No Water
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gemini AI Supported</span>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hide mascot when chat is open */}
                {!isOpen && <AquaMascot isOpen={isOpen} setIsOpen={setIsOpen} dragRef={constraintsRef} mascotName={aiConfig.mascotName} />}
            </div>
        </>
    );
}
