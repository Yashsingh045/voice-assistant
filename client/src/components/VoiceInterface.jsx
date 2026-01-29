import { Mic, Zap, Brain, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import Visualizer from './Visualizer';

const VoiceInterface = ({ isListening, status, audioData, onToggle, websocket }) => {
    const [responseMode, setResponseMode] = useState('planning');

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('responseMode');
        if (savedMode && ['faster', 'planning', 'detailed'].includes(savedMode)) {
            setResponseMode(savedMode);
        }
    }, []);

    const handleModeChange = (newMode) => {
        setResponseMode(newMode);
        localStorage.setItem('responseMode', newMode);
        
        // Send WebSocket message
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'set_response_mode',
                mode: newMode
            }));
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center relative">

            <div className="glass-card w-full h-full flex flex-col items-center justify-center relative overflow-hidden p-8">
                {/* Background Glow Effect */}
                

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-12 animate-fade-in relative z-10">
                    <h1 className="text-5xl md:text-6xl font-black mb-3 tracking-tight premium-gradient-text">
                        Voice Engine
                    </h1>
                    <p className="text-sm font-medium max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {status || "Calibrating neural speech synthesis..."}
                    </p>
                </div>

                <div className="w-full max-w-2xl mb-16 relative z-10">
                    <Visualizer audioData={audioData} isListening={isListening} />
                </div>

                <div className="flex flex-col items-center gap-8 relative z-10">
                    <button
                        onClick={onToggle}
                        className="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 relative group shadow-2xl"
                        style={{
                            background: isListening ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-secondary)',
                            border: isListening ? 'none' : `3px solid var(--accent-primary)`,
                            boxShadow: isListening ? '0 20px 60px -10px var(--accent-primary)' : '0 10px 40px var(--shadow-soft)'
                        }}
                    >
                        {isListening && (
                            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)', opacity: 0.2 }}></div>
                        )}
                        <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">
                            <Mic
                                size={44}
                                fill={isListening ? "white" : "none"}
                                strokeWidth={2}
                                style={{ color: isListening ? 'white' : 'var(--accent-primary)' }}
                            />
                        </div>
                    </button>

                    {/* Response Mode Selector */}
                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={() => handleModeChange('faster')}
                            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                            style={{
                                background: responseMode === 'faster' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-card)',
                                border: responseMode === 'faster' ? 'none' : `1px solid var(--border-light)`,
                                color: responseMode === 'faster' ? 'white' : 'var(--text-secondary)',
                                boxShadow: responseMode === 'faster' ? '0 4px 12px var(--accent-primary)' : 'none'
                            }}
                        >
                            <Zap size={14} className="inline mr-1" />
                            Faster
                        </button>
                        <button
                            onClick={() => handleModeChange('planning')}
                            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                            style={{
                                background: responseMode === 'planning' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-card)',
                                border: responseMode === 'planning' ? 'none' : `1px solid var(--border-light)`,
                                color: responseMode === 'planning' ? 'white' : 'var(--text-secondary)',
                                boxShadow: responseMode === 'planning' ? '0 4px 12px var(--accent-primary)' : 'none'
                            }}
                        >
                            <Brain size={14} className="inline mr-1" />
                            Planning
                        </button>
                        <button
                            onClick={() => handleModeChange('detailed')}
                            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                            style={{
                                background: responseMode === 'detailed' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-card)',
                                border: responseMode === 'detailed' ? 'none' : `1px solid var(--border-light)`,
                                color: responseMode === 'detailed' ? 'white' : 'var(--text-secondary)',
                                boxShadow: responseMode === 'detailed' ? '0 4px 12px var(--accent-primary)' : 'none'
                            }}
                        >
                            <Layers size={14} className="inline mr-1" />
                            Detailed
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                        <span className="px-4 py-2 rounded-lg transition-all" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-light)`, color: 'var(--accent-primary)' }}>
                            Hold Space to Talk
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span className="px-4 py-2 rounded-lg transition-all" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-light)`, color: 'var(--accent-danger)' }}>
                            Esc to End Call
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceInterface;
