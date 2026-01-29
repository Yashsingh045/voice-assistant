const Visualizer = ({ audioData, isListening }) => {
    const bars = Array.from({ length: 40 });

    // Get theme from document
    const theme = document.documentElement.getAttribute('data-theme') || 'light';

    const getBarColor = (index) => {
        if (theme === 'multicolor') {
            // Rainbow colors from CSS variables
            const colorIndex = (index % 7) + 1; // 1 through 7
            return `var(--visualizer-color-${colorIndex})`;
        }
        // Alternate between two colors for light/dark themes
        return index % 2 === 0 ? 'var(--visualizer-color-1)' : 'var(--visualizer-color-2)';
    };

    return (
        <div className="flex items-center justify-center gap-[3px] h-32 w-full max-w-lg mx-auto overflow-visible">
            {bars.map((_, i) => {
                const rawValue = audioData ? audioData[i % audioData.length] : 0;
                const scale = isListening ? Math.max(0.01, rawValue / 128) : 0.035;
                const height = `${scale * 100}%`;
                const barColor = getBarColor(i);

                return (
                    <div
                        key={i}
                        className="visualizer-bar transition-all duration-100"
                        style={{
                            height,
                            backgroundColor: barColor,
                            opacity: isListening ? 0.6 + scale * 0.4 : 0.15,
                            boxShadow: isListening && scale > 0.5 ? `0 0 12px ${barColor}` : 'none'
                        }}
                    />
                );
            })}
        </div>
    );
};

export default Visualizer;
