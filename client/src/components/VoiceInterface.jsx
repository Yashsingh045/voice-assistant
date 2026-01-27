import { Mic } from 'lucide-react';
import Visualizer from './Visualizer';

const VoiceInterface = ({ isListening, status, audioData, onToggle }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
            <div className="text-center mb-8 md:mb-16 animate-in fade-in zoom-in duration-1000">
                <h1 className="text-4xl md:text-6xl font-black mb-3 md:mb-4 premium-gradient-text tracking-tighter">
                    {isListening ? 'Listening...' : 'Voice AI'}
                </h1>
                <p className="text-sm md:text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed px-4">
                    {status || "I'm ready to help with your task"}
                </p>
            </div>

            <div className="w-full mb-12 md:mb-20">
                <Visualizer audioData={audioData} isListening={isListening} />
            </div>

            <div className="flex flex-col items-center gap-6 md:gap-8">
                <button
                    onClick={onToggle}
                    className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-500 relative group ${isListening
                            ? 'bg-gradient-to-br from-indigo-500 to-pink-500 shadow-[0_0_50px_-10px_rgba(99,102,241,0.8)]'
                            : 'bg-white border-2 border-indigo-200 hover:border-indigo-400 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20'
                        }`}
                >
                    {isListening ? (
                        <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-400/30"></div>
                    ) : null}
                    <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                        {isListening ? (
                            <Mic size={36} fill="white" className="text-white md:w-10 md:h-10" />
                        ) : (
                            <Mic size={36} className="text-indigo-500 md:w-10 md:h-10" />
                        )}
                    </div>
                </button>

                <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">Space to Talk</span>
                    <span className="text-slate-300">•</span>
                    <span className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-pink-50 border border-pink-200 text-pink-600">Esc to End</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceInterface;
