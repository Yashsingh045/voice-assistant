import React from 'react';
import { AudioLines } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0f1d]/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <AudioLines size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tight text-white leading-none mb-1">AI Voice Assistant</h1>
                    <div className="flex items-center gap-1.5">
                        <div className="system-status-dot"></div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-500/80">System Ready</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden bg-slate-800 flex items-center justify-center p-0.5">
                    <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=yash"
                        alt="Profile"
                        className="w-full h-full rounded-full"
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
