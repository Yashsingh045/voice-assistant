import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import TranscriptList from './components/TranscriptList';
import VoiceControls from './components/VoiceControls';
import Visualizer from './components/Visualizer';
import MetricsDashboard from './components/MetricsDashboard';
import { createWavHeader } from './utils/audio';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [currentAIResponse, setCurrentAIResponse] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const ws = useRef(null);
  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const currentSource = useRef(null);

  const playNextAudio = useCallback(async () => {
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

    const buffer = await audioContext.current.decodeAudioData(createWavHeader(data));
    const source = audioContext.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.current.destination);
    source.onended = () => {
      currentSource.current = null;
      // Use a function reference to avoid circular dependency
      setTimeout(() => {
        if (audioQueue.current.length > 0) {
          playNextAudio();
        } else {
          isPlaying.current = false;
          setStatus('Ready');
        }
      }, 0);
    };
    currentSource.current = source;
    source.start();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Connect to WebSocket
    const socket = new WebSocket('ws://localhost:8000/ws/chat');
    ws.current = socket;

    socket.onopen = () => {
      if (isMounted) {
        console.log('WebSocket connected');
        setStatus('Ready');
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    };

    socket.onclose = () => {
      if (isMounted) {
        console.log('WebSocket closed');
        setStatus('Disconnected');
      }
    };

    socket.onmessage = async (event) => {
      if (!isMounted) return;

      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        const now = new Date().toISOString();

        if (data.type === 'transcript') {
          // Final user transcript
          setTranscripts(prev => [...prev, {
            text: data.text,
            is_user: true,
            timestamp: now
          }]);
          setCurrentAIResponse("");
          setInterimTranscript("");
        } else if (data.type === 'transcript_interim') {
          setInterimTranscript(data.text);
        } else if (data.type === 'status') {
          setStatus(data.text);
        } else if (data.type === 'transcript_chunk') {
          setCurrentAIResponse(prev => prev + data.text);
          setTranscripts(prev => {
            const last = prev[prev.length - 1];
            if (last && !last.is_user) {
              // Append to existing AI transcript
              return [...prev.slice(0, -1), { ...last, text: last.text + data.text }];
            } else {
              // Start new AI transcript
              return [...prev, { text: data.text, is_user: false, timestamp: now }];
            }
          });
        } else if (data.type === 'metrics') {
          setMetrics(data.data);
        } else if (data.type === 'error') {
          setError(data.text);
          setTimeout(() => setError(null), 5000);
        }
      } else {
        const audioData = await event.data.arrayBuffer();
        audioQueue.current.push(audioData);
        if (audioQueue.current.length > 50) audioQueue.current.shift(); // Drop old if too many
        if (!isPlaying.current) playNextAudio();
      }
    };

    return () => {
      isMounted = false;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [playNextAudio]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext({ sampleRate: 16000 });
      await audioContext.current.audioWorklet.addModule('/vad-processor.js');
      const vadNode = new AudioWorkletNode(audioContext.current, 'vad-processor');
      const source = audioContext.current.createMediaStreamSource(stream);

      vadNode.port.onmessage = (event) => {
        if (event.data.type === 'VAD_START') {
          setStatus('Listening');
          setError(null);
          if (isPlaying.current || audioQueue.current.length > 0) {
            audioQueue.current = [];
            if (currentSource.current) {
              try {
                currentSource.current.stop();
              } catch (e) {
                // Ignore errors when stopping already stopped sources
              }
              currentSource.current = null;
            }
            if (ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'barge-in' }));
            }
          }
        } else if (event.data.type === 'VAD_END') {
          setStatus('Thinking');
          if (ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'speech_end' }));
          }
        } else if (event.data.type === 'AUDIO_DATA') {
          if (ws.current.readyState === WebSocket.OPEN) {
            const inputData = event.data.audio;
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            ws.current.send(pcmData.buffer);
          }
        }
      };

      source.connect(vadNode);
      vadNode.connect(audioContext.current.destination);

      mediaRecorder.current = { stream, source, vadNode };
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
      mediaRecorder.current.vadNode.disconnect();
    }
    setIsListening(false);
    setStatus('Ready');
  };

  return (
    <div className="h-screen bg-[#0b1120] text-white flex flex-col overflow-hidden font-sans">
      <Header />
      <MetricsDashboard metrics={metrics} error={error} />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Interaction Area */}
        <main className="flex-1 flex flex-col items-center justify-between relative bg-gradient-to-b from-[#0b1120] to-[#0f172a]/20">
          {/* AI Status Indicator */}
          <div className="absolute top-8 left-8 flex flex-col gap-3">
            {status === 'Speaking' && (
              <p className="text-blue-400 text-[11px] font-bold animate-pulse tracking-widest flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                AI is speaking...
              </p>
            )}
            {status === 'Thinking' && (
              <p className="text-slate-400 text-[11px] font-bold animate-pulse tracking-widest flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]" />
                Processing...
              </p>
            )}
            {status.includes('Searching') && (
              <p className="text-amber-400 text-[11px] font-bold animate-pulse tracking-widest flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                {status}...
              </p>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center px-12 text-center animate-fade-in">
            <Visualizer isListening={isListening} status={status} />

            <div className={`mt-12 max-w-2xl transition-all duration-500 ${currentAIResponse || interimTranscript ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 leading-tight">
                {currentAIResponse ? `"${currentAIResponse}"` : interimTranscript ? `"${interimTranscript}..."` : ""}
              </h2>
            </div>
          </div>

          <VoiceControls
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
            status={status}
          />
        </main>

        {/* Sidebar Transcript */}
        <aside className="w-96 min-w-[320px] flex-shrink-0 border-l border-white/[0.05] bg-[#0f172a]/40 backdrop-blur-3xl animate-slide-up">
          <TranscriptList transcripts={transcripts} />
        </aside>
      </div>

      {/* Decorative center glow */}
      <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
    </div>
  );
};

export default App;
