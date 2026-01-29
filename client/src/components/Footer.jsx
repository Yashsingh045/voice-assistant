import { ShieldCheck, Globe, Activity } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="h-10 flex items-center justify-between px-6 text-[8px] font-semibold uppercase tracking-wider transition-all duration-300" style={{ borderTop: `1px solid var(--border-light)`, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                    <Globe size={10} style={{ color: 'var(--accent-primary)' }} />
                    Global Edge Net
                </span>
                <span className="flex items-center gap-1.5">
                    <ShieldCheck size={10} style={{ color: 'var(--accent-success)' }} />
                    Secured Sessions 
                </span>
                <span className="flex items-center gap-1.5">
                    <Activity size={10} style={{ color: 'var(--accent-warning)' }} />
                    Production Ready
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span>V1.0 • Stable</span>
                <span>•</span>
                <span>Production Ready</span>
            </div>
        </footer>
    );
};

export default Footer;
