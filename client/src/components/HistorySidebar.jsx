import { useState, useEffect } from 'react';
import { X, MessageSquare, Trash2, Clock } from 'lucide-react';

const HistorySidebar = ({ isOpen, onClose, currentSessionId, onSessionSelect }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchSessions();
        }
    }, [isOpen]);

    // Listen for session creation events
    useEffect(() => {
        const handleSessionCreated = () => {
            fetchSessions();
        };
        window.addEventListener('sessionCreated', handleSessionCreated);
        return () => window.removeEventListener('sessionCreated', handleSessionCreated);
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/sessions');
            const data = await res.json();
            setSessions(data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            await fetch(`http://localhost:8000/api/sessions/${id}`, { method: 'DELETE' });
            fetchSessions();
            setDeleteConfirmId(null);
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    const handleDeleteClick = (id, e) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const handleCancelDelete = (e) => {
        e.stopPropagation();
        setDeleteConfirmId(null);
    };

    const handleSelectSession = (sessionId) => {
        onSessionSelect(sessionId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <aside className="glass-card w-full h-full flex flex-col overflow-hidden transition-all duration-300 relative">
            {/* Header */}
            <div className="px-6 py-5 flex items-start justify-between border-b" style={{ borderColor: 'var(--border-light)' }}>
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Session History
                    </h2>
                    <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {sessions.length} conversations
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-all hover:bg-black/5 active:scale-95"
                    style={{ color: 'var(--text-muted)' }}
                    title="Close history"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center opacity-50">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center rotate-12" style={{ background: 'var(--bg-secondary)', border: `2px solid var(--border-light)` }}>
                                <Clock size={24} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Loading...</p>
                        </div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center opacity-50">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center rotate-12" style={{ background: 'var(--bg-secondary)', border: `2px solid var(--border-light)` }}>
                                <MessageSquare size={24} style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No conversations yet</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Start a new session</p>
                        </div>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => handleSelectSession(session.id)}
                            className="group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                            style={{
                                background: session.id === currentSessionId ? 'var(--bg-card)' : 'transparent',
                                border: `1px solid ${session.id === currentSessionId ? 'var(--border-light)' : 'transparent'}`
                            }}
                        >
                            <MessageSquare size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {session.title || 'New Chat'}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                        {session.message_count} messages
                                    </p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {session.created_at_display}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteClick(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation Popup */}
            {deleteConfirmId && (
                <div 
                    className="absolute inset-0 flex items-center justify-center z-50 rounded-3xl"
                    style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCancelDelete(e);
                    }}
                >
                    <div 
                        className="px-6 py-4 rounded-xl shadow-2xl"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Delete this chat?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => handleCancelDelete(e)}
                                className="px-4 py-2 text-sm rounded-lg transition-all hover:opacity-80"
                                style={{ 
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-light)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => handleDelete(deleteConfirmId, e)}
                                className="px-4 py-2 text-sm rounded-lg transition-all hover:opacity-90"
                                style={{ 
                                    background: '#ef4444',
                                    color: 'white'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default HistorySidebar;
