import React from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceControls = ({ isListening, startListening, stopListening, status }) => {
    return (
        <div className="py-12 flex justify-center">
            <button
                onClick={isListening ? stopListening : startListening}
                className={`px-8 py-3.5 rounded-full border transition-all duration-500 flex items-center gap-3 backdrop-blur-md shadow-2xl group ${isListening
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                    }`}
            >
                <div className={`p-1.5 rounded-full ${isListening ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`}>
                    {isListening ? (
                        <MicOff size={16} className="text-white" />
                    ) : (
                        <Mic size={16} className="text-white" />
                    )}
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                    {isListening ? 'Tap to Interrupt' : 'Tap to Start'}
                </span>
            </button>
        </div>
    );
};

export default VoiceControls;
