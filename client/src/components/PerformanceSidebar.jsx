import React from 'react';
import { Zap, Cpu, Activity, Wifi, HardDrive } from 'lucide-react';

const DiagnosticCard = ({ icon: Icon, label, value, subtext, status, gradient }) => (
    <div className="glass-card p-5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
        {/* <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
            <Icon size={48} />
        </div> */}

        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/5 rounded-lg">
                <Icon size={17} className="text-cyan-400" />
            </div>
            {status && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                    {status}
                </span>
            )}
        </div>

        <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className={`text-2xl font-bold ${gradient || 'text-white'}`}>
                    {value}
                </h3>
                {subtext && <span className="text-[11px] text-slate-400 font-medium">{subtext}</span>}
            </div>
        </div>
    </div>
);

const PerformanceSidebar = ({ metrics, logs }) => {
    return (
        <aside className="w-80 glass-sidebar h-full flex flex-col p-6 overflow-hidden">
            <div className="mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-black/90 mb-1">Performance</h2>
                <p className="text-[11px] text-slate-500 font-medium italic">Real-time engine diagnostics</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pb-6">
                <DiagnosticCard
                    icon={Zap}
                    label="Latency"
                    value={`${metrics?.total_turnaround?.toFixed(0) || '0'}ms`}
                    subtext="-12% vs avg"
                    status="Optimal"
                    gradient="premium-gradient-text"
                />

                <DiagnosticCard
                    icon={Cpu}
                    label="Engine Model"
                    value={metrics?.model || 'SONIC-2'}
                    gradient="premium-gradient-text"
                />

                <DiagnosticCard
                    icon={Wifi}
                    label="Network Speed"
                    value={`${metrics?.network_speed || '—'} Mbps`}
                    subtext="STABLE"
                    status="Active"
                    gradient="premium-gradient-text"
                />

                <DiagnosticCard
                    icon={HardDrive}
                    label="Memory Load"
                    value={`${metrics?.memory_usage || '—'} MB`}
                    subtext="OPTIMIZED"
                    status="Active"
                    gradient="premium-gradient-text"
                />

                <DiagnosticCard
                    icon={Activity}
                    label="Processing Speed"
                    value={`${metrics?.tps?.toFixed(0) || '0'} tps`}
                    subtext="+5.2%"
                    status="Stable"
                    gradient="premium-gradient-text"
                />
            </div>

            <div className="mt-5">
                <div className="glass-card p-5 bg-black/20">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-glow"></span>
                        System Log
                    </h2>
                    <div className="space-y-2 h-32 overflow-y-auto no-scrollbar font-mono text-[10px]">
                        {logs.map((log, i) => (
                            <div key={i} className="text-slate-400 flex gap-2">
                                <span className="text-cyan-500/50">&gt;</span>
                                <span className={i === logs.length - 1 ? 'text-slate-500' : ''}>{log}</span>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-slate-600 italic">No logs available...</div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default PerformanceSidebar;
