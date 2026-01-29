import { Zap, Cpu, Wifi, HardDrive } from 'lucide-react';

const MetricBox = ({ icon: Icon, label, value, subtext, badge, progress, color = "text-purple-500" }) => (
    <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/20 transition-all duration-300 hover:shadow-md flex flex-col justify-between min-h-[140px]">
        <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-cyan-50 rounded-xl">
                <Icon size={20} className="text-cyan-500" />
            </div>
            {badge && (
                <span className="px-3 py-1 bg-green-100 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {badge}
                </span>
            )}
        </div>

        <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
            <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${color}`}>
                    {value}
                </span>
                {subtext && <span className="text-xs font-semibold text-slate-400">{subtext}</span>}
            </div>
        </div>

        {progress !== undefined && (
            <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        )}
    </div>
);

const PerformanceSidebar = ({ metrics, logs }) => {
    return (
        <aside className="w-full h-full flex flex-col pt-8 pb-4 px-6 overflow-hidden bg-transparent">
            <div className="mb-8">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-1">Performance</h2>
                <p className="text-sm font-medium text-slate-500 italic">Real-time engine diagnostics</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
                {/* Latency Card */}
                <MetricBox
                    icon={Zap}
                    label="Latency"
                    value={`${Math.round(metrics?.total_turnaround || 0)}ms`}
                    subtext={metrics?.stt_latency ? `STT: ${Math.round(metrics.stt_latency)}ms` : '-12% vs avg'}
                    badge="Optimal"
                    color="text-purple-600"
                />

                {/* Engine Model Card */}
                <MetricBox
                    icon={Cpu}
                    label="Engine Model"
                    value={metrics?.model || "Llama 3.3 70B"}
                    color="premium-gradient-text" // Using the class for gradient text
                />

                {/* Network Card */}
                <MetricBox
                    icon={Wifi}
                    label="Network Speed"
                    value={`${metrics?.network_speed?.toFixed(1) || '0'} Mbps`}
                    subtext="Stable"
                    badge="Active"
                    color="text-purple-600"
                />

                {/* System Log Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/20 flex-1 min-h-[180px] flex flex-col mt-4">
                    <div className="flex items-center gap-2 mb-4 mt-5">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse"></div>
                        <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em]">System Log</h3>
                    </div>
                    {logs.length === 0 ? (
                        <div className="text-slate-400 font-mono text-[10px] opacity-50">No Logs Available...</div>
                    ) : (

                        <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar pr-2 flex flex-col-reverse">
                            {/* Display displayed in reverse order (newest at top) or standard with auto-scroll? User asked for "fixing" it.
                            Let's sticky to standard order but auto-scroll. Actually, flex-col-reverse is easier for checking "latest" at bottom if we want it to stick.
                            But standard console is top-down. 
                            Let's use a standard list with a ref for auto-scrolling. 
                            */}
                            {[...logs].reverse().map((log, i) => (
                                <div key={i} className="flex gap-2 items-start animate-fade-in mb-10">
                                    <span className="text-cyan-400/70 select-none text-[10px] mt-0.5">{'>'}</span>
                                    <span className={`leading-relaxed break-words ${i === 0 ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>
                                        {log}
                                    </span>
                                </div>
                            ))}

                        </div>

                    )}
                </div>
            </div>
        </aside>
    );
};

export default PerformanceSidebar;
