import React, { useRef, useEffect } from 'react';
import { Send, User, Bot, Clock } from 'lucide-react';

const MessageBubble = ({ message }) => {
    const isUser = message.is_user;
    const messageTime = message.timestamp ? 
        new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isUser ? 'text-blue-400' : 'text-purple-400'}`}>
                    {isUser ? 'User' : 'Assistant'}
                </span>
                <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                    <Clock size={10} />
                    {messageTime}
                </span>
            </div>

            <div className={`max-w-[90%] p-4 rounded-2xl text-[13px] leading-relaxed font-medium shadow-lg transition-all duration-300 ${isUser
                ? 'bg-blue-600 text-white rounded-tr-none border border-blue-500/50'
                : 'bg-[#1e293b]/80 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                {message.text}
            </div>
        </div>
    );
};

const TranscriptSidebar = ({ messages, isTyping, onSendMessage }) => {
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const text = inputRef.current.value.trim();
        if (text) {
            onSendMessage(text);
            inputRef.current.value = '';
        }
    };

    return (
        <aside className="w-96 glass-sidebar-right h-full flex flex-col p-6 overflow-hidden">
            <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/90 mb-1">Live Transcript</h2>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar pr-2 mb-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}
                {isTyping && (
                    <div className="flex flex-col items-start mb-6 animate-pulse">
                        <div className="max-w-[80%] p-4 bg-[#1e293b]/40 rounded-2xl rounded-tl-none border border-white/5">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
                <form onSubmit={handleSubmit} className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message instead..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-blue-500 rounded-lg text-slate-400 hover:text-white transition-all duration-300"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </aside>
    );
};

export default TranscriptSidebar;
