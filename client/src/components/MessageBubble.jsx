const MessageBubble = ({ text, isUser, timestamp, isStreaming }) => {
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col gap-1.5 mb-6 px-1 animate-fade-in">
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isUser ? 'text-indigo-500' : 'text-pink-500'}`}>
                    {isUser ? 'YOU' : 'ASSISTANT'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{formattedTime}</span>
            </div>

            <div className={`p-4 rounded-xl text-[13px] leading-relaxed border transition-all duration-300 ${isUser
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/20 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white border-slate-200 text-slate-700 shadow-lg shadow-slate-200/50'
                }`}>
                {isStreaming ? (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                ) : (
                    text
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
