import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

export default function ChatSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: "Hello! I'm your Smart CSM Assistant. How can I help you with your water services today?" }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // Add user message
        const newMessage = { id: Date.now(), sender: 'user', text: inputText };
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        setIsTyping(true);

        // Simulate AI mock response
        setTimeout(() => {
            const botResponses = [
                "I can help you check your current water usage. Would you like to see a report?",
                "That sounds like a billing inquiry. Your current balance is ₱1,250.00.",
                "I understand. If you're experiencing a leak, please report it immediately in the 'Report' section.",
                "Our maintenance team is scheduled for a check-up on Feb 15th.",
                "I'm just a demo AI for now, but I'm learning fast!"
            ];
            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'bot',
                text: randomResponse
            }]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="login-box w-96 h-[500px] mb-4 rounded-2xl flex flex-col shadow-2xl animate-slide-up overflow-hidden border border-slate-700/50">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg mr-3 shadow-lg shadow-blue-500/20">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">Smart Assistant</h3>
                                <div className="flex items-center">
                                    <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                    <span className="text-xs text-blue-200">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md 
                                        ${msg.sender === 'user' ? 'bg-blue-600 ml-2' : 'bg-slate-700 mr-2 border border-white/10'}`}>
                                        {msg.sender === 'user' ? (
                                            <User className="h-4 w-4 text-white" />
                                        ) : (
                                            <Sparkles className="h-4 w-4 text-cyan-400" />
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                        ${msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-slate-800/80 text-gray-100 border border-white/5 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex flex-row">
                                    <div className="h-8 w-8 rounded-full bg-slate-700 mr-2 border border-white/10 flex items-center justify-center mt-1">
                                        <Sparkles className="h-4 w-4 text-cyan-400" />
                                    </div>
                                    <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center space-x-1">
                                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/50 border-t border-white/5 backdrop-blur-sm">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Type your question..."
                                className="w-full bg-slate-800/50 text-white placeholder-gray-500 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim()}
                                className="absolute right-2 p-1.5 bg-blue-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Float Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center relative group
                    ${isOpen ? 'bg-slate-800 rotate-90 border border-white/10 text-gray-400 hover:text-white' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:scale-110 hover:shadow-cyan-500/30'}`}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}

                {!isOpen && (
                    <span className="absolute right-full mr-4 bg-white text-slate-900 px-3 py-1 rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                        Need Help?
                    </span>
                )}

                {!isOpen && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
                )}
            </button>
        </div>
    );
}
