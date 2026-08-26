import React, { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function MockPhoneNotification() {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const handleSmsSent = (e) => {
            const { to, message } = e.detail;
            const newMsg = {
                id: Date.now(),
                to,
                message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, newMsg]);

            // Auto dismiss after 10 seconds
            setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== newMsg.id));
            }, 10000);
        };

        window.addEventListener('sms-sent', handleSmsSent);
        return () => window.removeEventListener('sms-sent', handleSmsSent);
    }, []);

    if (messages.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
            <AnimatePresence>
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-72 border-[6px] border-slate-900 pointer-events-auto"
                    >
                        {/* Phone Header */}
                        <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <Smartphone size={14} className="text-slate-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Messages</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{msg.time}</span>
                        </div>
                        
                        {/* Phone Body */}
                        <div className="p-4 bg-slate-50 relative">
                            <button 
                                onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500"
                            >
                                <X size={14} />
                            </button>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To: {msg.to}</p>
                            
                            {/* Message Bubble */}
                            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-sm text-xs font-medium leading-relaxed mt-2 shadow-sm">
                                {msg.message.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        <br />
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
