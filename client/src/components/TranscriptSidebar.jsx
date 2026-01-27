import React, { useRef, useEffect } from 'react';
import { Send, User, Bot, Clock, Download } from 'lucide-react';

const MessageBubble = ({ message }) => {
    const isUser = message.is_user;
    const isStreaming = message.isStreaming;
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
                {isStreaming ? (
                    <div className="flex gap-1 py-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                ) : (
                    message.text
                )}
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

    const exportTranscript = () => {
        if (messages.length === 0) {
            alert('No transcript to export');
            return;
        }

        // Format transcript with structure
        const sessionStart = new Date().toLocaleString();
        let transcriptText = `LIVE TRANSCRIPT\n`;
        transcriptText += `Session Started: ${sessionStart}\n`;
        transcriptText += `${'='.repeat(60)}\n\n`;

        messages.forEach((msg) => {
            const timestamp = msg.timestamp 
                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const speaker = msg.is_user ? 'USER' : 'ASSISTANT';
            
            transcriptText += `${speaker} • ${timestamp}\n`;
            transcriptText += `${msg.text}\n\n`;
        });

        transcriptText += `${'='.repeat(60)}\n`;
        transcriptText += `End of Transcript\n`;
        transcriptText += `Total Messages: ${messages.length}\n`;

        // Create and download file
        const blob = new Blob([transcriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <aside className="w-96 glass-sidebar-right h-full flex flex-col overflow-hidden border-l border-white/5">
            {/* Header with gradient */}
            <div className="px-6 py-5 bg-gradient-to-b from-[#0b1120]/60 to-transparent border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/90 mb-1">Live Transcript</h2>
                        <p className="text-[10px] text-slate-500 font-medium">Real-time conversation</p>
                    </div>
                    <button
                        onClick={exportTranscript}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all duration-200 group"
                        title="Export Transcript"
                    >
                        <Download size={14} className="text-blue-400 group-hover:text-blue-300" />
                        <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-bold uppercase tracking-wider">
                            Export
                        </span>
                    </button>
                </div>
            </div>

            {/* Messages area with custom scrollbar */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                <Clock size={24} className="text-slate-600" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No messages yet</p>
                            <p className="text-xs text-slate-600 mt-1">Start speaking or type a message</p>
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* Input area with improved styling */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#0b1120]/40">
                <form onSubmit={handleSubmit} className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-blue-500 rounded-lg text-slate-400 hover:text-white transition-all duration-300"
                    >
                        <Send size={16} />
                    </button>
                </form>
                <p className="text-[10px] text-slate-600 mt-2 text-center">Press Enter to send • Space to talk</p>
            </div>
        </aside>
    );
};

export default TranscriptSidebar;
