import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRole, ROLES } from '../contexts/RoleContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Send, User, Lock, Loader2 } from 'lucide-react';

export default function Chats() {
    const { userProfile } = useAuth();
    const { role } = useRole();
    const [channel, setChannel] = useState('common'); // common, mentor
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    const canAccessMentorChat = [ROLES.FOUNDER, ROLES.MENTOR].includes(role);

    useEffect(() => {
        if (!userProfile?.startupId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'chats'),
            where('startupId', '==', userProfile.startupId),
            where('channel', '==', channel)
            // Removed orderBy to prevent indexing errors
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side
            msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

            setMessages(msgs);
            setLoading(false);
            // Scroll to bottom
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 100);
        });

        return () => unsubscribe();
    }, [userProfile, channel]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !userProfile?.startupId) return;

        try {
            await addDoc(collection(db, 'chats'), {
                text: newMessage,
                author: userProfile.displayName || 'User',
                authorId: userProfile.uid,
                role: role,
                startupId: userProfile.startupId,
                channel: channel,
                createdAt: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex flex-col gap-6" style={{
            position: 'fixed',
            top: '64px',
            left: '250px',
            right: 0,
            bottom: 0,
            background: 'var(--bg-body)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            width: 'auto' // Let left/right determine width
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1.5rem 1.5rem 0 1.5rem' }}>
                <h1 className="text-2xl font-bold">Team Chat</h1>
            </div>

            <div style={{ display: 'flex', height: '100%', gap: '1.5rem', width: '100%', minWidth: 0, padding: '0 0 1.5rem 1.5rem' }}>

                {/* Sidebar / Channel List */}
                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={() => setChannel('common')}
                        style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: channel === 'common' ? 'var(--bg-surface)' : 'transparent',
                            border: channel === 'common' ? '1px solid var(--border)' : 'none',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: channel === 'common' ? 'var(--primary)' : 'inherit'
                        }}
                    >
                        # General
                    </button>

                    {canAccessMentorChat && (
                        <button
                            onClick={() => setChannel('mentor')}
                            style={{
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                background: channel === 'mentor' ? 'var(--bg-surface)' : 'transparent',
                                border: channel === 'mentor' ? '1px solid var(--border)' : 'none',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: channel === 'mentor' ? 'var(--primary)' : 'inherit',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <Lock size={16} /> Mentor Private
                        </button>
                    )}
                </div>

                {/* Chat Area - Replaced Card with raw div to ensure no max-width constraints */}
                <div
                    className="flex flex-col"
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        minWidth: 0,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRight: 'none', // Full bleed
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        borderTopLeftRadius: 'var(--radius-lg)',
                        borderBottomLeftRadius: 'var(--radius-lg)'
                    }}
                >


                    {/* Messages */}
                    <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading && <div className="text-center p-4"><Loader2 className="animate-spin inline" /></div>}
                        {!loading && messages.length === 0 && (
                            <div className="text-center p-8 text-muted">
                                {channel === 'common' ? 'Welcome to the team chat! Say hello to everyone.' : 'Private space for mentor discussions.'}
                            </div>
                        )}
                        {messages.map(msg => {
                            const isMe = msg.authorId === userProfile.uid;
                            const isMentor = msg.role === ROLES.MENTOR;
                            const isFounder = msg.role === ROLES.FOUNDER;
                            const isCoFounder = msg.role === ROLES.CO_FOUNDER;
                            const isTeam = msg.role === ROLES.TEAM;

                            return (
                                <div key={msg.id} style={{
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '70%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{msg.author}</span>
                                        {isMentor && <Badge variant="blue" className="text-[10px] py-0 px-1">Mentor</Badge>}
                                        {isFounder && <Badge variant="yellow" className="text-[10px] py-0 px-1">Founder</Badge>}
                                        {isCoFounder && <Badge variant="yellow" className="text-[10px] py-0 px-1">Co-Founder</Badge>}
                                        {isTeam && <Badge variant="gray" className="text-[10px] py-0 px-1">Team Member</Badge>}
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        background: isMe ? 'var(--primary)' : '#334155', // Slate-700 for others
                                        color: 'white',
                                        borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                        border: isMentor && !isMe ? '1px solid #60A5FA' : '1px solid transparent' // Blue-400 border for mentor
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input */}
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            style={{
                                flex: 1,
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #CBD5E1',
                                outline: 'none'
                            }}
                        />
                        <Button icon={Send} onClick={handleSendMessage}>Send</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
