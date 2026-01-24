import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import MessageBubble from './MessageBubble';

const TranscriptList = ({ transcripts }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar"
        >
            {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40">
                    <MessageSquare size={48} strokeWidth={1.5} className="mb-4" />
                    <p className="text-sm font-medium tracking-wide">READY FOR YOUR COMMAND</p>
                </div>
            ) : (
                transcripts.map((t, i) => (
                    <MessageBubble key={i} text={t.text} isUser={t.is_user} />
                ))
            )}
        </div>
    );
};

export default TranscriptList;
