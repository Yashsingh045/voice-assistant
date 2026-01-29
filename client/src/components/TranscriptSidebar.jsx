import { useRef, useEffect } from 'react';
import { Send, Clock, Download, Plus } from 'lucide-react';

const MessageBubble = ({ message, theme }) => {
    const isUser = message.is_user;
    const isStreaming = message.isStreaming;
    const messageTime = message.timestamp ?
        new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Determine Label
    let label = isUser ? 'USER' : 'NEXUS';

    // Determine background based on theme
    const getMessageBackground = () => {
        if (theme === 'multicolor') {
            if (isUser) {
                return 'linear-gradient(135deg, #10b981, #06b6d4)'; // Teal gradient for user
            } else {
                return 'linear-gradient(135deg, #8b5cf6, #d946ef)'; // Purple-pink gradient for assistant
            }
        }
        // Default for light and dark themes
        return isUser ? 'var(--accent-primary)' : 'var(--bg-secondary)';
    };

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6 animate-fade-in`}>

            <div className="flex items-center gap-1.5 mb-1.5 px-1">

                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {label} • {messageTime}
                </span>
            </div>

            <div
                className="max-w-[90%] px-5 py-4 text-xs md:text-sm leading-relaxed font-medium shadow-sm transition-all"
                style={{
                    background: getMessageBackground(),
                    color: isUser ? '#ffffff' : (theme === 'multicolor' ? '#ffffff' : 'var(--text-primary)'),
                    border: (isUser || theme === 'multicolor') ? 'none' : `1px solid var(--border-light)`,
                    borderRadius: isUser ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem'
                }}
            >
                {isStreaming ? (
                    <div className="">
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-secondary)' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-secondary)', animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-secondary)', animationDelay: '0.2s' }}></div>
                    </div>
                ) : (
                    message.text
                )}
            </div>
        </div>
    );
};

const TranscriptSidebar = ({ messages, isTyping, onSendMessage, onNewSession, theme, isConnected }) => {
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
        <aside className="glass-card w-full h-full flex flex-col overflow-hidden transition-all duration-300">
            {/* Header */}

            <div className="px-6 py-5 flex items-start justify-between">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>Live Transcript</h2>
                    <p className="text-[11px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-2 h-2 rounded-full relative flex items-center justify-center">
                            <span className={`w-full h-full rounded-full absolute inline-flex ${isConnected ? 'animate-ping' : ''} opacity-75`} style={{ backgroundColor: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full relative inline-flex" style={{ backgroundColor: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)' }}></span>
                        </span>
                        {isConnected ? 'Session Active' : 'Session Inactive'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNewSession && onNewSession()}
                        className="p-2 rounded-lg transition-all active:scale-95"
                        style={{ 
                            color: 'var(--accent-primary)',
                            background: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="New session"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={exportTranscript}
                        className="p-2 rounded-lg transition-all active:scale-95"
                        style={{ 
                            color: 'var(--text-muted)',
                            background: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Export Transcript"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            <div className="w-full h-px" style={{ background: 'var(--border-light)' }}></div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center opacity-50">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center rotate-12" style={{ background: 'var(--bg-secondary)', border: `2px solid var(--border-light)` }}>
                                <Clock size={24} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Start speaking or type below</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <MessageBubble key={i} message={msg} theme={theme} />
                        ))}
                        {isTyping && (
                            <div className="flex flex-col items-start mb-6 animate-pulse">
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
                                    NEXUS • typing...
                                </span>
                                <div className="px-5 py-4 rounded-2xl rounded-tl-sm" style={{ background: theme === 'multicolor' ? 'linear-gradient(135deg, #8b5cf6, #d946ef)' : 'var(--bg-secondary)', border: theme === 'multicolor' ? 'none' : `1px solid var(--border-light)` }}>
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-muted)' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-muted)', animationDelay: '0.1s' }}></div>
                                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: theme === 'multicolor' ? '#ffffff' : 'var(--text-muted)', animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Input area */}
            <div className="px-6 py-5" style={{ borderTop: `1px solid var(--border-light)`, background: 'var(--bg-card)' }}>
                <form onSubmit={handleSubmit} className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        className="w-full rounded-2xl py-3.5 pl-5 pr-12 text-sm focus:outline-none transition-all shadow-sm focus:shadow-md"
                        style={{
                            background: 'var(--bg-secondary)',
                            border: `1px solid var(--border-light)`,
                            color: 'var(--text-primary)'
                        }}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                    >
                        <Send size={16} fill="white" />
                    </button>
                </form>

                <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-bold uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded border border-current opacity-75 font-mono">ENTER</kbd>
                        SEND
                    </span>
                    <span className="w-px h-3 bg-current opacity-20"></span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded border border-current opacity-75 font-mono">SPACE</kbd>
                        TALK
                    </span>
                </div>
            </div>
        </aside>
    );
};

export default TranscriptSidebar;
