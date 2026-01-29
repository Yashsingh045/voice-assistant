import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PerformanceSidebar from './components/PerformanceSidebar';
import TranscriptSidebar from './components/TranscriptSidebar';
import HistorySidebar from './components/HistorySidebar';
import VoiceInterface from './components/VoiceInterface';
import SessionsModal from './components/SessionsModal';
import { useAudioStreaming, useAudioPlayer } from './utils/audio';
import { Menu, X, History, MessageSquare, Activity } from 'lucide-react';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const { startStreaming, stopStreaming, audioData } = useAudioStreaming();
  const { playChunk } = useAudioPlayer();

  // Sidebar visibility state for mobile
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeMobileSidebar, setActiveMobileSidebar] = useState(null); // 'history', 'transcript', 'performance'

  // Theme state: 'light', 'dark', 'multicolor'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });

  // Device ID for session isolation
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const deviceId = getDeviceId();

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'multicolor';
      return 'light';
    });
  };

  // Session management functions
  const createNewSession = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sessions', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId })
      });
      const session = await res.json();
      setCurrentSessionId(session.id);
      localStorage.setItem('currentSessionId', session.id);
      setMessages([]);
      console.log('New session created:', session.id);
      // Trigger a refresh of sessions in the modal if it's open
      window.dispatchEvent(new Event('sessionCreated'));
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);
      localStorage.setItem('currentSessionId', sessionId);
      const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}/messages`);
      const msgs = await res.json();
      setMessages(msgs.map(m => ({
        text: m.text,
        is_user: m.is_user,
        timestamp: m.timestamp
      })));
      setSessionsModalOpen(false);
      setHistorySidebarOpen(false); // Close history sidebar when session is loaded
      setActiveMobileSidebar(null); // Close mobile sidebar
      setMobileDrawerOpen(false); // Close mobile drawer
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };



  // Initialize session on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('currentSessionId');
    if (savedSessionId) {
      // Validate session_id format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(savedSessionId)) {
        loadSession(savedSessionId).catch(() => {
          // If session doesn't exist in DB, create new one
          createNewSession();
        });
      } else {
        // Invalid format, create new session
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

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
  const [isConnected, setIsConnected] = useState(false);

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
      // Only connect if we have a valid session_id
      if (!currentSessionId) {
        console.log('Waiting for session to be created...');
        return null;
      }
      
      // Use environment variable or fallback to localhost
      const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/chat';
      const wsUrl = `${baseUrl}?session_id=${currentSessionId}`;
      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        console.log('WebSocket Connected');
        ws.current = socket;
        setIsConnected(true);
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
        setIsConnected(false);
        setTimeout(connectWebSocketImpl, 3000);
      };

      return socket;
    };

    return connectWebSocketImpl();
  }, [currentSessionId, playChunk]);

  useEffect(() => {
    if (!currentSessionId) return;
    
    const socket = connectWebSocket();
    return () => socket?.close();
  }, [connectWebSocket, currentSessionId]);

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
    <div className="flex flex-col h-screen app-bg text-gray-900 selection:bg-indigo-200">
      <Header 
        theme={theme} 
        onThemeChange={cycleTheme}
        onHistoryClick={() => setHistorySidebarOpen(!historySidebarOpen)}
      />

      <main className="flex-1 flex overflow-hidden relative px-10 py-6 gap-10">
        {/* Mobile Menu Button - Single Three Bars */}
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="md:hidden fixed top-24 right-4 z-50 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all"
          style={{
            background: mobileDrawerOpen ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-card)',
            border: `2px solid ${mobileDrawerOpen ? 'transparent' : 'var(--border-light)'}`,
            color: mobileDrawerOpen ? 'white' : 'var(--accent-primary)'
          }}
          aria-label="Toggle Menu"
        >
          {mobileDrawerOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Drawer */}
        <div className={`
          md:hidden fixed top-40 right-4 z-40
          transform transition-all duration-300 ease-in-out
          ${mobileDrawerOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
          rounded-2xl shadow-2xl overflow-hidden
        `}
        style={{
          background: 'var(--bg-card)',
          border: `1px solid var(--border-light)`,
          backdropFilter: 'blur(20px)'
        }}
        >
          <div className="flex flex-col p-2 gap-2 min-w-[180px]">
            <button
              onClick={() => {
                setActiveMobileSidebar('history');
                setHistorySidebarOpen(true);
                setMobileDrawerOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105"
              style={{
                background: activeMobileSidebar === 'history' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
                color: activeMobileSidebar === 'history' ? 'white' : 'var(--text-primary)'
              }}
            >
              <History size={18} />
              <span className="text-sm font-bold">History</span>
            </button>
            
            <button
              onClick={() => {
                setActiveMobileSidebar('transcript');
                setHistorySidebarOpen(false);
                setRightSidebarOpen(true);
                setMobileDrawerOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105"
              style={{
                background: activeMobileSidebar === 'transcript' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
                color: activeMobileSidebar === 'transcript' ? 'white' : 'var(--text-primary)'
              }}
            >
              <MessageSquare size={18} />
              <span className="text-sm font-bold">Transcript</span>
            </button>
            
            <button
              onClick={() => {
                setActiveMobileSidebar('performance');
                setLeftSidebarOpen(true);
                setMobileDrawerOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105"
              style={{
                background: activeMobileSidebar === 'performance' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
                color: activeMobileSidebar === 'performance' ? 'white' : 'var(--text-primary)'
              }}
            >
              <Activity size={18} />
              <span className="text-sm font-bold">Performance</span>
            </button>
          </div>
        </div>

        {/* Left Diagnostics Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-40 
          transform transition-transform duration-300 ease-in-out
          ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-90 md:w-96 rounded-3xl overflow-hidden shadow-xl
        `}>
          {/* Mobile Close Button */}
          <button
            onClick={() => {
              setLeftSidebarOpen(false);
              setActiveMobileSidebar(null);
            }}
            className="md:hidden absolute top-4 right-4 z-50 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid var(--border-light)`,
              color: 'var(--text-primary)'
            }}
          >
            <X size={16} />
          </button>
          <PerformanceSidebar metrics={metrics} logs={systemLogs} />
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {(leftSidebarOpen || rightSidebarOpen || mobileDrawerOpen) && (
          <div
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
              setMobileDrawerOpen(false);
              setActiveMobileSidebar(null);
            }}
          />
        )}

        {/* Center Main Stage */}
        <div className="flex-1 w-full md:w-auto h-full p-0">
          <VoiceInterface
            isListening={isListening}
            status={status}
            audioData={audioData}
            onToggle={toggleListening}
            websocket={ws.current}
          />
        </div>

        {/* Right Transcript Sidebar or History Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 right-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${rightSidebarOpen || historySidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          w-80 md:w-96 rounded-3xl overflow-hidden shadow-xl
        `}>
          {/* Mobile Close Button */}
          <button
            onClick={() => {
              setRightSidebarOpen(false);
              setHistorySidebarOpen(false);
              setActiveMobileSidebar(null);
            }}
            className="md:hidden absolute top-4 left-4 z-50 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all"
            style={{
              background: 'var(--bg-card)',
              border: `1px solid var(--border-light)`,
              color: 'var(--text-primary)'
            }}
          >
            <X size={16} />
          </button>
          {historySidebarOpen ? (
            <HistorySidebar
              isOpen={historySidebarOpen}
              onClose={() => {
                setHistorySidebarOpen(false);
                setActiveMobileSidebar(null);
              }}
              currentSessionId={currentSessionId}
              onSessionSelect={loadSession}
            />
          ) : (
            <TranscriptSidebar
              messages={messages}
              isTyping={isTyping}
              onSendMessage={sendMessage}
              onNewSession={createNewSession}
              theme={theme}
              isConnected={isConnected}
            />
          )}
        </div>
      </main>

      <Footer />

      <SessionsModal
        isOpen={sessionsModalOpen}
        onClose={() => setSessionsModalOpen(false)}
        currentSessionId={currentSessionId}
        onSessionSelect={loadSession}
        onNewSession={createNewSession}
      />
    </div>
  );
};

export default App;
