import { Zap, Cpu, Wifi, Menu, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

const MetricBox = ({ icon: Icon, label, value, subtext, badge, progress, color = "text-purple-500" }) => (
    <div className="backdrop-blur-md rounded-[2rem] p-6 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between min-h-[160px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
        <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <Icon size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>
            {badge && (
                <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider" style={{ background: 'var(--accent-success)', color: '#ffffff', opacity: 0.9 }}>
                    {badge}
                </span>
            )}
        </div>

        <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</h3>
            <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${color}`} style={color === "premium-gradient-text" ? {} : { color: 'var(--accent-primary)' }}>
                    {value}
                </span>
                {subtext && <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{subtext}</span>}
            </div>
        </div>

        {progress !== undefined && (
            <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', width: `${progress}%` }}
                />
            </div>
        )}
    </div>
);

const PerformanceSidebar = ({ metrics, logs }) => {
    const [isLatencyExpanded, setIsLatencyExpanded] = useState(false);
    const [appMetadata, setAppMetadata] = useState({
        version: '1.0.0',
        uptime: '0m',
        status: 'Active'
    });

    // Calculate uptime
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            let uptimeStr = '';
            if (days > 0) uptimeStr = `${days}d ${hours % 24}h`;
            else if (hours > 0) uptimeStr = `${hours}h ${minutes % 60}m`;
            else uptimeStr = `${minutes}m`;
            
            setAppMetadata(prev => ({ ...prev, uptime: uptimeStr }));
        }, 60000); // Update every minute
        
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className="w-full h-full flex flex-col pt-8 pb-4 px-6 overflow-hidden bg-transparent relative">
            <div className="mb-8">
                <h2 className="text-xl font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-primary)' }}>Performance</h2>
                <p className="text-sm font-medium italic" style={{ color: 'var(--text-secondary)' }}>Real-time engine diagnostics</p>
            </div>

            {/* Scrollable Metrics Area - extends fully with padding for system logs */}
            <div className="absolute top-[120px] bottom-0 left-6 right-6 overflow-y-auto custom-scrollbar pr-1 mb-8">
                <div className="flex flex-col gap-4 pb-[240px]">
                {/* Latency Card - Collapsible */}
            
                <div className="backdrop-blur-md rounded-[2rem] p-6 shadow-sm transition-all duration-300 min-h-[150px] flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    {/* Header - Always Visible */}
                    
                    <div 
                        className="flex items-start justify-between cursor-pointer group"
                        onClick={() => setIsLatencyExpanded(!isLatencyExpanded)}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'var(--bg-secondary)' }}>
                                    <Zap size={20} style={{ color: 'var(--accent-primary)' }} />
                                </div>
                            </div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total Latency</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                                    {(() => {
                                        const stt = metrics?.stt_latency || 0;
                                        const llm = metrics?.llm_generation || 0;
                                        const tts = metrics?.tts_latency || 0;
                                        const search = metrics?.search_latency || 0;
                                        const total = stt + llm + tts + search;
                                        return total > 0 ? `${Math.round(total)}ms` : '0ms';
                                    })()}
                                </span>
                                {metrics?.stt_latency > 0 && (
                                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                                        STT: {Math.round(metrics.stt_latency)}ms
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className={`p-2 rounded-lg transition-all`} style={{ background: isLatencyExpanded ? 'var(--accent-primary)' : 'var(--bg-secondary)' }}>
                            <Menu size={18} className={`transition-all duration-300 ${isLatencyExpanded ? 'rotate-90' : ''}`} style={{ color: isLatencyExpanded ? '#ffffff' : 'var(--text-secondary)' }} />
                        </div>
                    </div>

                    {/* Expandable Breakdown */}
                    <div className={`overflow-hidden transition-all duration-300 ${isLatencyExpanded ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-4 pt-4" style={{ borderTop: '2px solid var(--border-light)' }}>
                            {(() => {
                                // Calculate actual total from all components
                                const stt = metrics?.stt_latency || 0;
                                const llm = metrics?.llm_generation || 0;
                                const tts = metrics?.tts_latency || 0;
                                const search = metrics?.search_latency || 0;
                                const actualTotal = stt + llm + tts + search;
                                
                                return (
                                    <>
                                        {/* STT Latency */}
                                        <div className="group">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }}></div>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Speech-to-Text</span>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                                                    {stt ? `${Math.round(stt)}ms` : '—'}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--bg-secondary)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                                                    style={{ background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', width: `${actualTotal > 0 ? Math.min((stt / actualTotal) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Web Search (if available) */}
                                        {search > 0 && (
                                            <div className="group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-warning)' }}></div>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Web Search</span>
                                                    </div>
                                                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-warning)' }}>
                                                        {Math.round(search)}ms
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--bg-secondary)' }}>
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                                                        style={{ background: 'var(--accent-warning)', width: `${actualTotal > 0 ? Math.min((search / actualTotal) * 100, 100) : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* LLM Generation */}
                                        <div className="group">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }}></div>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>LLM Generation</span>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                                                    {llm ? `${Math.round(llm)}ms` : '—'}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--bg-secondary)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                                                    style={{ background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', width: `${actualTotal > 0 ? Math.min((llm / actualTotal) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* TTS Latency */}
                                        <div className="group">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-secondary)' }}></div>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Text-to-Speech</span>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--accent-secondary)' }}>
                                                    {tts ? `${Math.round(tts)}ms` : '—'}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--bg-secondary)' }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                                                    style={{ background: 'var(--accent-secondary)', width: `${actualTotal > 0 ? Math.min((tts / actualTotal) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

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

                {/* App Metadata Card */}
                <div className="backdrop-blur-md rounded-[2rem] p-6 shadow-sm transition-all duration-300 hover:shadow-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <Info size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <span className="px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider" style={{ background: 'var(--accent-success)', color: '#ffffff', opacity: 0.9 }}>
                            {appMetadata.status}
                        </span>
                    </div>

                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>App Info</h3>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Version</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>{appMetadata.version}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>{appMetadata.uptime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Engine</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>Voice AI</span>
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* System Log Card - Fixed at Bottom (Overlays on top) */}
            <div className="absolute bottom-4 left-6 right-8 backdrop-blur-md rounded-[2rem] p-6 shadow-lg h-[210px] flex flex-col z-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>System Log</h3>
                </div>
                {logs.length === 0 ? (
                    <div className="font-mono text-[10px] opacity-50" style={{ color: 'var(--text-muted)' }}>No Logs Available...</div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar pr-2 flex flex-col-reverse">
                        {[...logs].reverse().map((log, i) => (
                            <div key={i} className="flex gap-2 items-start animate-fade-in mb-10">
                                <span className="select-none text-[10px] mt-0.5" style={{ color: 'var(--accent-primary)', opacity: 0.7 }}>{'>'}</span>
                                <span className={`leading-relaxed break-words ${i === 0 ? 'font-bold' : ''}`} style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {log}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default PerformanceSidebar;
