import { useState, useEffect } from 'react';
import { X, MessageSquare, Trash2, Plus } from 'lucide-react';

const SessionsModal = ({ isOpen, onClose, currentSessionId, onSessionSelect, onNewSession }) => {
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
            if (id === currentSessionId) {
                onNewSession();
            }
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

    const handleNewSession = () => {
        onNewSession();
        // Refresh sessions list after creating new session
        setTimeout(() => {
            fetchSessions();
        }, 500);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="relative w-96 max-h-[80vh] rounded-2xl flex flex-col transition-all duration-300" style={{ background: 'var(--bg-secondary)', border: `1px solid var(--border-light)` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>All Conversations</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-opacity-10 transition-all"
                        style={{ background: 'var(--bg-card)' }}
                    >
                        <X size={20} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <button
                        onClick={handleNewSession}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                    >
                        <Plus size={18} />
                        New Chat
                    </button>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No conversations yet</div>
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

                {/* Delete Confirmation Popup - Centered overlay on top of entire modal */}
                {deleteConfirmId && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center z-50 rounded-2xl"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCancelDelete(e);
                        }}
                    >
                        <div 
                            className="px-6 py-4 rounded-xl shadow-xl"
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
            </div>
        </div>
    );
};

export default SessionsModal;
