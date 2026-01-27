import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PerformanceSidebar from './components/PerformanceSidebar';
import TranscriptSidebar from './components/TranscriptSidebar';
import VoiceInterface from './components/VoiceInterface';
import { useAudioStreaming, useAudioPlayer } from './utils/audio';
import { Menu, X } from 'lucide-react';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const { startStreaming, stopStreaming, audioData } = useAudioStreaming();
  const { playChunk } = useAudioPlayer();
  
  // Sidebar visibility state for mobile
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

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
          case 'assistant_transcript_start':
            // Create placeholder for assistant response
            setMessages(prev => [...prev, { 
              text: '', 
              is_user: false,
              timestamp: new Date().toISOString(),
              isStreaming: true
            }]);
            setIsTyping(false);
            break;
          case 'assistant_transcript':
            // Replace ALL streaming placeholders with the actual message
            setMessages(prev => {
              console.log('Before filtering:', prev.length, 'messages');
              // Filter out ALL streaming assistant messages
              const filteredMessages = prev.filter(msg => {
                const shouldKeep = !(msg.isStreaming && !msg.is_user);
                if (!shouldKeep) {
                  console.log('Removing streaming message:', msg);
                }
                return shouldKeep;
              });
              console.log('After filtering:', filteredMessages.length, 'messages');
              // Add the actual message
              const newMessages = [...filteredMessages, {
                text: data.text,
                is_user: false,
                timestamp: new Date().toISOString(),
                isStreaming: false
              }];
              console.log('Final messages:', newMessages.length);
              return newMessages;
            });
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
      // Don't add message here - let the server send it back via 'transcript' message
      // This prevents duplicate messages
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
     <div className="flex flex-col h-screen premium-bg text-gray-900 selection:bg-indigo-200">
      <Header />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile Menu Buttons */}
        <button
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="md:hidden fixed top-24 left-4 z-50 w-10 h-10 bg-white border-2 border-indigo-200 rounded-lg flex items-center justify-center shadow-lg hover:border-indigo-400 transition-all"
          aria-label="Toggle Performance Sidebar"
        >
          {leftSidebarOpen ? <X size={20} className="text-indigo-600" /> : <Menu size={20} className="text-indigo-600" />}
        </button>

        <button
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="md:hidden fixed top-24 right-4 z-50 w-10 h-10 bg-white border-2 border-pink-200 rounded-lg flex items-center justify-center shadow-lg hover:border-pink-400 transition-all"
          aria-label="Toggle Transcript Sidebar"
        >
          {rightSidebarOpen ? <X size={20} className="text-pink-600" /> : <Menu size={20} className="text-pink-600" />}
        </button>

        {/* Left Diagnostics Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-40 
          transform transition-transform duration-300 ease-in-out
          ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-80 md:w-80
        `}>
          <PerformanceSidebar metrics={metrics} logs={systemLogs} />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {(leftSidebarOpen || rightSidebarOpen) && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
            }}
          />
        )}

        {/* Center Main Stage */}
        <div className="flex-1 w-full md:w-auto">
          <VoiceInterface
            isListening={isListening}
            status={status}
            audioData={audioData}
            onToggle={toggleListening}
          />
        </div>

        {/* Right Transcript Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 right-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          w-80 md:w-96
        `}>
          <TranscriptSidebar
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;
