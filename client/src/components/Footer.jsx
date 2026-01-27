import { ShieldCheck, Globe, Zap } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="h-12 md:h-16 border-t border-slate-200 bg-gradient-to-r from-white via-indigo-50/20 to-pink-50/20 flex items-center justify-between px-4 md:px-8 shadow-sm">
            <div className="flex items-center gap-3 md:gap-8">
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <Globe size={10} className="text-indigo-500 md:w-3 md:h-3" />
                    <span>India</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <ShieldCheck size={10} className="text-emerald-500 md:w-3 md:h-3" />
                    <span className="hidden sm:inline">E2E Encrypted</span>
                    <span className="sm:hidden">Encrypted</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <Zap size={12} className="text-amber-500" />
                    <span>Optimized</span>
                </div>
            </div>

            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="hidden sm:inline">V2.4.0 • Production</span>
                <span className="sm:hidden">V2.4.0</span>
            </div>
        </footer>
    );
};

export default Footer;
