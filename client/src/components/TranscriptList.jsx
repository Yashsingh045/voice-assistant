import React, { useEffect, useRef } from 'react';
import { MoreVertical, Download } from 'lucide-react';
import MessageBubble from './MessageBubble';

const TranscriptList = ({ transcripts }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    const exportTranscript = () => {
        if (transcripts.length === 0) {
            alert('No transcript to export');
            return;
        }

        // Format transcript with structure
        const sessionStart = new Date().toLocaleString();
        let transcriptText = `LIVE TRANSCRIPT\n`;
        transcriptText += `Session Started: ${sessionStart}\n`;
        transcriptText += `${'='.repeat(60)}\n\n`;

        transcripts.forEach((t) => {
            const timestamp = t.timestamp 
                ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const speaker = t.is_user ? 'USER' : 'ASSISTANT';
            
            transcriptText += `${speaker} • ${timestamp}\n`;
            transcriptText += `${t.text}\n\n`;
        });

        transcriptText += `${'='.repeat(60)}\n`;
        transcriptText += `End of Transcript\n`;
        transcriptText += `Total Messages: ${transcripts.length}\n`;

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
        <div className="flex flex-col h-full bg-[#0f172a]/30">
            {/* Sidebar Header */}
            <div className="px-6 py-5 border-b border-white/[0.05] flex justify-between items-center bg-[#0b1120]/40">
                <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Transcript</h2>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Active Session History</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={exportTranscript}
                        className="text-slate-600 hover:text-blue-400 transition-colors duration-200 p-1.5 hover:bg-blue-500/10 rounded-lg"
                        title="Export Transcript"
                    >
                        <Download size={16} />
                    </button>
                    <button className="text-slate-600 hover:text-slate-400">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {/* Transcript Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar"
            >
                <div className="flex items-center justify-between mb-8 gap-3">
                    <div className="px-3 py-1 bg-white/[0.03] rounded-full border border-white/[0.05]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                            Live Transcript
                        </span>
                    </div>
                    <button
                        onClick={exportTranscript}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-lg transition-all duration-200 group"
                        title="Export Transcript"
                    >
                        <Download size={12} className="text-blue-400 group-hover:text-blue-300" />
                        <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-semibold uppercase tracking-wider">
                            Export
                        </span>
                    </button>
                </div>

                {transcripts.map((t, i) => (
                    <MessageBubble key={i} text={t.text} isUser={t.is_user} timestamp={t.timestamp} />
                ))}
            </div>
        </div>
    );
};

export default TranscriptList;
