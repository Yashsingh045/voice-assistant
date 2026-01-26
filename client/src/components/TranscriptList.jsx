import React, { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import MessageBubble from './MessageBubble';

const TranscriptList = ({ transcripts }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    return (
        <div className="flex flex-col h-full bg-[#0f172a]/30">
            {/* Sidebar Header */}
            <div className="px-6 py-5 border-b border-white/[0.05] flex justify-between items-center bg-[#0b1120]/40">
                <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Transcript</h2>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Active Session History</p>
                </div>
                <button className="text-slate-600 hover:text-slate-400">
                    <MoreVertical size={16} />
                </button>
            </div>

            {/* Transcript Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar"
            >
                <div className="flex items-center justify-center mb-8">
                    <div className="px-3 py-1 bg-white/[0.03] rounded-full border border-white/[0.05]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                            Session Started • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {transcripts.map((t, i) => (
                    <MessageBubble key={i} text={t.text} isUser={t.is_user} timestamp={t.timestamp} />
                ))}
            </div>
        </div>
    );
};

export default TranscriptList;
