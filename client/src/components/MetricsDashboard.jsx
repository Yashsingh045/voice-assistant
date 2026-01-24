import React from 'react';
import { Cpu, Zap } from 'lucide-react';

const MetricsDashboard = ({ metrics }) => {
    if (!metrics) return null;

    return (
        <div className="absolute top-24 right-6 w-48 space-y-3 z-50">
            <div className="glass-card p-4 rounded-2xl border-white/5 premium-gradient">
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latency</span>
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">LLM Response</p>
                        <div className="flex items-end gap-1">
                            <span className="text-xl font-mono font-bold text-cyan-400">
                                {metrics.llm_generation?.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold mb-1">MS</span>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Total Loop</p>
                        <div className="flex items-end gap-1">
                            <span className="text-xl font-mono font-bold text-blue-400">
                                {metrics.total_turnaround?.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold mb-1">MS</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsDashboard;
