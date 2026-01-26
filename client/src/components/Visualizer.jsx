import React from 'react';

const Visualizer = ({ audioData, isListening, color = 'var(--accent-cyan)' }) => {
    // Use 40 bars as in the reference
    const bars = Array.from({ length: 40 });

    return (
        <div className="flex items-center justify-center gap-[3px] h-32 w-full max-w-lg mx-auto overflow-hidden">
            {bars.map((_, i) => {
                // Calculate a responsive height based on audio data or just a pulse when listening
                const rawValue = audioData ? audioData[i % audioData.length] : 0;
                const scale = isListening ? Math.max(0.1, rawValue / 128) : 0.05;
                const height = `${scale * 100}%`;

                // Multi-colored bars as in reference (alternating blue/purple)
                const barColor = i % 2 === 0 ? 'var(--accent-blue)' : 'var(--accent-purple)';

                return (
                    <div
                        key={i}
                        className="visualizer-bar"
                        style={{
                            height,
                            backgroundColor: barColor,
                            opacity: isListening ? 0.4 + scale * 0.6 : 0.1,
                            boxShadow: isListening && scale > 0.5 ? `0 0 15px ${barColor}` : 'none'
                        }}
                    />
                );
            })}
        </div>
    );
};

export default Visualizer;
