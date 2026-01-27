import { AudioLines, Zap } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-16 md:h-20 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-gradient-to-r from-white via-indigo-50/30 to-pink-50/30 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all">
                    <AudioLines size={24} className="text-white md:w-7 md:h-7" />
                </div>
                <div>
                    <h1 className="text-base md:text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent leading-none mb-1">
                        AI Voice Assistant
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="system-status-dot"></div>
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-600">System Ready</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Zap size={12} className="text-indigo-600 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI</span>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-indigo-200 overflow-hidden bg-gradient-to-br from-indigo-100 to-pink-100 flex items-center justify-center p-0.5 hover:border-indigo-400 transition-all">
                    <img
                        src="https://api.dicebear.com/9.x/avataaars/svg?seed=x"
                        alt="Profile"
                        className="w-full h-full rounded-full"
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
