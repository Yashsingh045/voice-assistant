import { AudioLines, Sun, Moon, Palette, Bell } from 'lucide-react';

const Header = ({ theme, onThemeChange }) => {
    const getThemeIcon = () => {
        if (theme === 'light') return <Sun size={16} />;
        if (theme === 'dark') return <Moon size={16} />;
        return <Palette size={16} />;
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 transition-all duration-300" style={{ background: 'var(--bg-secondary)', borderBottom: `1px solid var(--border-light)` }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                    <AudioLines size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-base font-bold tracking-tight transition-colors" style={{ color: 'var(--accent-primary)' }}>
                        Nexus Voice
                    </h1>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-success)' }}></div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider transition-colors" style={{ color: 'var(--accent-success)' }}>
                            {theme === 'multicolor' ? 'Multi-Spectrum Active' : 'System Synchronized'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onThemeChange}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    style={{ 
                        background: theme === 'multicolor' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--bg-card)',
                        border: `1px solid var(--border-light)`,
                        color: theme === 'multicolor' ? 'white' : 'var(--accent-primary)'
                    }}
                >
                    {getThemeIcon()}
                </button>
                <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-all" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-light)`, color: 'var(--text-secondary)' }}>
                    <Bell size={16} />
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                    <img
                        src="https://api.dicebear.com/9.x/avataaars/svg?seed=x"
                        alt="Profile"
                        className="w-full h-full"
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
