import React from 'react';
import { User, Bot } from 'lucide-react';

const MessageBubble = ({ text, isUser }) => {
    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${isUser ? 'bg-blue-600/20 text-blue-400' : 'bg-cyan-600/20 text-cyan-400'
                    }`}>
                    {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'glass-card rounded-tl-none text-slate-200 border-white/5'
                    }`}>
                    {text}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
