import React from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceControls = ({ isListening, startListening, stopListening, status }) => {
    return (
        <div className="flex flex-col items-center gap-6 pb-12 pt-4 glass-card border-none rounded-none !bg-slate-900/40 backdrop-blur-3xl">
            <div className="relative">
                {isListening && (
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                )}
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={`relative z-10 p-8 rounded-full transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl ${isListening
                            ? 'bg-red-500 shadow-red-500/40 text-white'
                            : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20 text-white'
                        }`}
                >
                    {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
            </div>

            <div className="flex flex-col items-center gap-1">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.2em]">
                    {isListening ? 'Streaming Audio' : 'Ready to Start'}
                </p>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">{status}</p>
                </div>
            </div>
        </div>
    );
};

export default VoiceControls;
