import React from 'react';
import { ShieldCheck, Globe } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="h-10 border-t border-white/5 bg-[#0a0f1d] flex items-center justify-between px-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Globe size={10} className="text-slate-700" />
                    <span>Region: US-EAST-1</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={10} className="text-emerald-500/50" />
                    <span>E2E Encrypted</span>
                </div>
            </div>

            <div className="text-slate-700">
                V2.4.0-Production
            </div>
        </footer>
    );
};

export default Footer;
