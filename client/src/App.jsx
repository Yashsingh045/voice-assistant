import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PerformanceSidebar from './components/PerformanceSidebar';
import TranscriptSidebar from './components/TranscriptSidebar';
import VoiceInterface from './components/VoiceInterface';
import { useAudioStreaming, useAudioPlayer } from './utils/audio';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const { startStreaming, stopStreaming, audioData } = useAudioStreaming();
  const { playChunk, stopPlayback } = useAudioPlayer();

  const [metrics, setMetrics] = useState({
    llm_generation: 0,
    total_turnaround: 0,
    stt_latency: 0,
    tts_latency: 0,
    tps: 0,
    model: 'Llama 3.3 70B'
  });
  const [systemLogs, setSystemLogs] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState("I'm ready to help with your task");

  const ws = useRef(null);

  useEffect(() => {
    const updateRealTimeMetrics = () => {
      const updates = {};

      // Network Speed
      if (navigator.connection && navigator.connection.downlink) {
        updates.network_speed = navigator.connection.downlink;
      }

      // Memory Usage (if available)
      if (window.performance && window.performance.memory) {
        updates.memory_usage = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
      }

      setMetrics(prev => ({ ...prev, ...updates }));
    };

    updateRealTimeMetrics();
    const interval = setInterval(updateRealTimeMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const connectWebSocket = useCallback(() => {
    const connectWebSocketImpl = () => {
      const socket = new WebSocket('ws://localhost:8000/ws/chat');
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      console.log('WebSocket Connected');
      ws.current = socket;
    };

    socket.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'transcript':
            setMessages(prev => [...prev, { 
              text: data.text, 
              is_user: data.is_user,
              timestamp: new Date().toISOString()
            }]);
            if (data.is_user) setIsTyping(true);
            break;
          case 'assistant_transcript':
            setMessages(prev => [...prev, { 
              text: data.text, 
              is_user: data.is_user,
              timestamp: new Date().toISOString()
            }]);
            break;
          case 'assistant_transcript_interim':
            // Optionally show interim AI transcript in UI or ignore
            break;
          case 'transcript_chunk':
            setIsTyping(false);
            // Handle streaming transcript if needed, but for now we use bubbles
            break;
          case 'status':
            setStatus(data.text);
            break;
          case 'system_log':
            setSystemLogs(prev => [...prev.slice(-19), data.text]);
            break;
          case 'metrics':
            setMetrics(data.data);
            break;
          case 'error':
            console.error(data.text);
            setSystemLogs(prev => [...prev, `ERROR: ${data.text}`]);
            break;
        }
      } else {
        // Handle audio bytes
        const pcmBuffer = event.data instanceof ArrayBuffer ? event.data : await event.data.arrayBuffer();
        playChunk(pcmBuffer);
      }
    };

      socket.onclose = () => {
        console.log('WebSocket Disconnected');
        setTimeout(connectWebSocketImpl, 3000);
      };

      return socket;
    };

    return connectWebSocketImpl();
  }, [playChunk]);

  useEffect(() => {
    connectWebSocket();
    return () => ws.current?.close();
  }, [connectWebSocket]);

  const toggleListening = async () => {
    if (isListening) {
      stopStreaming();
      setIsListening(false);
      setStatus("I'm ready to help with your task");
    } else {
      setIsListening(true);
      await startStreaming((blob) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(blob);
        }
      });
    }
  };

  const sendMessage = (text) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'text_input', text }));
      setMessages(prev => [...prev, { 
        text, 
        is_user: true,
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isListening && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        toggleListening();
      }
      if (e.code === 'Escape' && isListening) {
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  return (
    <div className="flex flex-col h-screen premium-bg text-white selection:bg-cyan-500/30">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Diagnostics Sidebar */}
        <PerformanceSidebar metrics={metrics} logs={systemLogs} />

        {/* Center Main Stage */}
        <VoiceInterface
          isListening={isListening}
          status={status}
          audioData={audioData}
          onToggle={toggleListening}
        />

        {/* Right Transcript Sidebar */}
        <TranscriptSidebar
          messages={messages}
          isTyping={isTyping}
          onSendMessage={sendMessage}
        />
      </main>

      <Footer />
    </div>
  );
};

export default App;
