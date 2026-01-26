import React from 'react';
import { Zap, Mic, Volume2, Brain, Radio } from 'lucide-react';

const MetricItem = ({ label, value, gradient }) => (
    <div>
        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className={`text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
                {value?.toFixed(0) || '—'}
            </span>
            <span className="text-[9px] text-slate-600 font-bold uppercase">ms</span>
        </div>
    </div>
);

const Divider = () => (
    <div className="h-[1px] bg-gradient-to-r from-white/[0.05] to-transparent" />
);

const MetricsDashboard = ({ metrics, error }) => {
    return (
        <div className="absolute top-6 right-6 w-44 z-50 animate-in fade-in slide-in-from-right-4 duration-700">
            {error && (
                <div className="mb-3 bg-red-500/20 border border-red-500/50 p-2 rounded-xl backdrop-blur-md animate-bounce">
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-tight text-center">
                        {error}
                    </p>
                </div>
            )}
            {!metrics && !error && null}
            {metrics && (
                <div className="bg-[#0f172a]/80 backdrop-blur-2xl p-4 rounded-2xl border border-white/[0.05] shadow-2xl premium-gradient group hover:border-cyan-500/30 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5">
                            <Zap size={12} className="text-cyan-400 group-hover:animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Latency</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-pulse" />
                    </div>

                    <div className="space-y-3">
                        {/* STT Latency */}
                        {metrics.stt_latency !== undefined && (
                            <>
                                <MetricItem
                                    label="STT"
                                    value={metrics.stt_latency}
                                    gradient="from-emerald-400 to-teal-400"
                                />
                                <Divider />
                            </>
                        )}

                        {/* LLM TTFT */}
                        <MetricItem
                            label="LLM (TTFT)"
                            value={metrics.llm_generation}
                            gradient="from-cyan-400 to-blue-400"
                        />

                        <Divider />

                        {/* TTS Latency */}
                        {metrics.tts_latency !== undefined && (
                            <>
                                <MetricItem
                                    label="TTS"
                                    value={metrics.tts_latency}
                                    gradient="from-purple-400 to-pink-400"
                                />
                                <Divider />
                            </>
                        )}

                        {/* Total E2E */}
                        <MetricItem
                            label="Total E2E"
                            value={metrics.total_turnaround}
                            gradient="from-blue-400 to-indigo-400"
                        />

                        {/* Audio Played */}
                        {metrics.audio_duration !== undefined && (
                            <>
                                <Divider />
                                <div>
                                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Audio</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                                            {(metrics.audio_duration / 1000)?.toFixed(1) || '—'}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-bold uppercase">sec</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricsDashboard;
