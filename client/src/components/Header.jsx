import React from 'react';
import { Activity } from 'lucide-react';

const Header = ({ status }) => {
    return (
        <header className="p-6 flex justify-between items-center glass-card border-none rounded-none !bg-slate-900/20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white leading-none">Sonic AI</h1>
                    <p className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-semibold mt-1">Intelligence Pipeline</p>
                </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
                <Activity size={14} className={status === 'Listening' ? 'text-green-400 animate-pulse' : 'text-slate-500'} />
                <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">{status}</span>
            </div>
        </header>
    );
};

export default Header;
