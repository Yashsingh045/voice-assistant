import React from 'react';

const Visualizer = ({ isListening, status }) => {
    const bars = Array.from({ length: 40 }, (_, i) => i);

    return (
        <div className="relative w-full h-80 flex items-center justify-center">
            {/* Main Glowing Orb */}
            <div className={`relative w-48 h-48 rounded-full transition-all duration-1000 ${status === 'Speaking' ? 'bg-blue-500 scale-110 shadow-[0_0_80px_rgba(59,130,246,0.6)]' :
                    status === 'Listening' ? 'bg-purple-500 scale-105 shadow-[0_0_60px_rgba(168,85,247,0.4)]' :
                        'bg-slate-800 scale-100 shadow-none'
                }`}>
                <div className="absolute inset-0 rounded-full animate-orb-glow opacity-50" />

                {/* Waveform Bars */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 pt-12">
                    {bars.map((i) => {
                        const isActive = status === 'Speaking' || status === 'Listening';
                        // Create a symmetric wave pattern
                        const height = isActive ? (30 + Math.sin(i * 0.5) * 20 + Math.random() * 15) : 4;

                        return (
                            <div
                                key={i}
                                className={`waveform-bar ${!isActive ? 'quiet' : ''}`}
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: isActive ? `${0.8 + Math.random() * 0.4}s` : '2s',
                                    '--wave-height': `${height}px`,
                                    opacity: isActive ? 1 : 0.2,
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Visualizer;
