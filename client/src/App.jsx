import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, Activity } from 'lucide-react';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [metrics, setMetrics] = useState(null);
  const ws = useRef(null);
  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const currentSource = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://localhost:8000/ws/chat');

    ws.current.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
          setTranscripts(prev => [...prev, { text: data.text, is_user: data.is_user }]);
        } else if (data.type === 'status') {
          setStatus(data.text);
        } else if (data.type === 'transcript_chunk') {
          // Handle streaming chunks if we want to show them real-time
          setTranscripts(prev => {
            const last = prev[prev.length - 1];
            if (last && !last.is_user) {
              return [...prev.slice(0, -1), { ...last, text: last.text + data.text }];
            } else {
              return [...prev, { text: data.text, is_user: false }];
            }
          });
        } else if (data.type === 'metrics') {
          setMetrics(data.data);
        }
      } else {
        // Audio data (blob)
        const audioData = await event.data.arrayBuffer();
        audioQueue.current.push(audioData);
        if (!isPlaying.current) playNextAudio();
      }
    };

    return () => ws.current.close();
  }, []);

  const playNextAudio = async () => {
    if (audioQueue.current.length === 0) {
      isPlaying.current = false;
      setStatus('Ready');
      return;
    }

    isPlaying.current = true;
    setStatus('Speaking');
    const data = audioQueue.current.shift();

    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Simple way to play raw PCM 16-bit 44.1kHz from Cartesia
    const buffer = await audioContext.current.decodeAudioData(createWavHeader(data));
    const source = audioContext.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.current.destination);
    source.onended = () => {
      currentSource.current = null;
      playNextAudio();
    };
    currentSource.current = source;
    source.start();
  };

  // Utility to wrap raw PCM in WAV header for browser playback
  const createWavHeader = (pcmData) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const length = pcmData.byteLength;

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + length, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, length, true);

    const blob = new Uint8Array(header.byteLength + pcmData.byteLength);
    blob.set(new Uint8Array(header), 0);
    blob.set(new Uint8Array(pcmData), header.byteLength);
    return blob.buffer;
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext({ sampleRate: 16000 });

      // Load and add VAD AudioWorklet
      await audioContext.current.audioWorklet.addModule('/vad-processor.js');
      const vadNode = new AudioWorkletNode(audioContext.current, 'vad-processor');

      const source = audioContext.current.createMediaStreamSource(stream);

      vadNode.port.onmessage = (event) => {
        if (event.data.type === 'VAD_START') {
          setStatus('Listening');
          // Barge-in logic: stop audio playback and notify backend
          if (isPlaying.current || audioQueue.current.length > 0) {
            audioQueue.current = [];
            if (currentSource.current) {
              try {
                currentSource.current.stop();
              } catch (e) {
                // Already stopped
              }
              currentSource.current = null;
            }
            if (ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'barge-in' }));
            }
          }
        } else if (event.data.type === 'VAD_END') {
          setStatus('Thinking');
        }
      };

      const processor = audioContext.current.createScriptProcessor(4096, 1, 1);
      source.connect(vadNode);
      source.connect(processor);
      processor.connect(audioContext.current.destination);

      processor.onaudioprocess = (e) => {
        if (ws.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          ws.current.send(pcmData.buffer);
        }
      };

      mediaRecorder.current = { stream, source, processor, vadNode };
      setIsListening(true);
      setStatus('Listening');
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopListening = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorder.current.source.disconnect();
      mediaRecorder.current.processor.disconnect();
      mediaRecorder.current.vadNode.disconnect();
    }
    setIsListening(false);
    setStatus('Ready');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8 font-sans">
      <header className="w-full max-w-2xl flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          AI Voice Assistant
        </h1>
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800">
          <Activity size={16} className={isListening ? 'text-green-500 animate-pulse' : 'text-slate-500'} />
          <span className="text-sm font-medium text-slate-300">{status}</span>
        </div>
      </header>

      <main className="w-full max-w-2xl flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="text-center py-4">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Sonic AI
          </h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest opacity-60">High-Performance Voice Assistant</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
          {transcripts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>Start speaking to initialize the conversation</p>
            </div>
          )}
          {transcripts.map((t, i) => (
            <div key={i} className={`flex ${t.is_user ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${t.is_user ? 'bg-blue-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none'
                }`}>
                {t.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 pb-8">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-8 rounded-full transition-all transform hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-blue-600 shadow-lg shadow-blue-500/20'
              }`}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <p className="text-slate-400 text-sm">
            {isListening ? 'Tap to stop' : 'Tap to start talking'}
          </p>

          {metrics && (
            <div className="w-full mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex justify-around items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">LLM Latency</p>
                <p className="text-lg font-mono text-cyan-400">{metrics.llm_generation?.toFixed(0)}<span className="text-xs ml-0.5">ms</span></p>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Loop</p>
                <p className="text-lg font-mono text-blue-400">{metrics.total_turnaround?.toFixed(0)}<span className="text-xs ml-0.5">ms</span></p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
