import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import Visualizer from './Visualizer';

const VoiceInterface = ({ isListening, status, audioData, onToggle }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            <div className="text-center mb-16 animate-in fade-in zoom-in duration-1000">
                <h1 className="text-5xl font-black mb-4 premium-gradient-text tracking-tighter">
                    {isListening ? 'Listening...' : 'Voice AI'}
                </h1>
                <p className="text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                    {status || "I'm ready to help with your task"}
                </p>
            </div>

            <div className="w-full mb-20">
                <Visualizer audioData={audioData} isListening={isListening} />
            </div>

            <div className="flex flex-col items-center gap-8">
                <button
                    onClick={onToggle}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 relative group ${isListening
                            ? 'bg-blue-600 shadow-[0_0_50px_-10px_rgba(37,99,235,0.8)]'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                >
                    {isListening ? (
                        <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/30 opacity-75"></div>
                    ) : null}
                    <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                        {isListening ? <Mic size={36} fill="white" /> : <Mic size={36} className="text-slate-400" />}
                    </div>
                </button>

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    <span className="px-3 py-1.5 glass-card bg-white/[0.02]">Space to Talk</span>
                    <span className="text-slate-800">•</span>
                    <span className="px-3 py-1.5 glass-card bg-white/[0.02]">Esc to End</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceInterface;
