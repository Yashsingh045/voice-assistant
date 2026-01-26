import React from 'react';

const MessageBubble = ({ text, isUser, timestamp }) => {
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col gap-1.5 mb-6 px-1 animate-fade-in">
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isUser ? 'text-blue-500' : 'text-slate-500'}`}>
                    {isUser ? 'YOU' : 'ASSISTANT'}
                </span>
                <span className="text-[10px] text-slate-600 font-medium">{formattedTime}</span>
            </div>

            <div className={`p-4 rounded-xl text-[13px] leading-relaxed border transition-all duration-300 ${isUser
                ? 'bg-[#1e293b]/50 border-white/[0.03] text-slate-300'
                : 'bg-[#1e293b]/30 border-blue-500/10 text-slate-200 shadow-lg shadow-blue-500/5'
                }`}>
                {text}
            </div>
        </div>
    );
};

export default MessageBubble;
