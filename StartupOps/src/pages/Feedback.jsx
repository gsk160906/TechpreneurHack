import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRole, ROLES } from '../contexts/RoleContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MessageSquare, ThumbsUp, ThumbsDown, User, ExternalLink, Plus, Loader2, X } from 'lucide-react';

export default function Feedback() {
    const { userProfile } = useAuth();
    const { role } = useRole();
    const [activeTab, setActiveTab] = useState('internal'); // internal, external
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [teamMap, setTeamMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newFeedback, setNewFeedback] = useState({ content: '', type: 'internal' });

    useEffect(() => {
        if (!userProfile?.startupId) {
            setLoading(false);
            return;
        }

        // Feedback Subscription
        const q = query(collection(db, 'feedback'), where('startupId', '==', userProfile.startupId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setFeedbackItems(list);
            setLoading(false);
        });

        // Team Subscription (for roles)
        const teamQ = query(collection(db, 'users'), where('startupId', '==', userProfile.startupId));
        const unsubscribeTeam = onSnapshot(teamQ, (snapshot) => {
            const map = {};
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            setTeamMap(map);
        });

        return () => {
            unsubscribe();
            unsubscribeTeam();
        };
    }, [userProfile]);

    const handleAddFeedback = async (e) => {
        e.preventDefault();
        if (!newFeedback.content) return;

        try {
            await addDoc(collection(db, 'feedback'), {
                ...newFeedback,
                status: 'Open',
                startupId: userProfile.startupId,
                authorId: userProfile.uid,
                authorName: userProfile.displayName || 'Team Member',
                authorRole: userProfile.role || 'TEAM',
                createdAt: serverTimestamp()
            });
            setShowModal(false);
            setNewFeedback({ content: '', type: 'internal' });
        } catch (error) {
            console.error("Error adding feedback:", error);
        }
    };

    const isInternal = activeTab === 'internal';
    const filteredFeedback = feedbackItems.filter(f => f.type === activeTab);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-2xl font-bold">Feedback & Validation</h1>
                    <p className="text-muted">Validate ideas and gather insights.</p>
                </div>
                <Button icon={Plus} onClick={() => setShowModal(true)}>New Insight</Button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                <button
                    className={activeTab === 'internal' ? 'active-tab' : ''}
                    style={{
                        padding: '0.75rem 1rem',
                        borderBottom: activeTab === 'internal' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'internal' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 500
                    }}
                    onClick={() => setActiveTab('internal')}
                >
                    Internal & Mentor
                </button>
                <button
                    className={activeTab === 'external' ? 'active-tab' : ''}
                    style={{
                        padding: '0.75rem 1rem',
                        borderBottom: activeTab === 'external' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'external' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 500
                    }}
                    onClick={() => setActiveTab('external')}
                >
                    External Validation
                </button>
            </div>

            {/* Feedback List */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredFeedback.length === 0 ? (
                    <div className="text-center p-12 border border-dashed rounded-lg">
                        <p className="text-muted">No feedback recorded yet.</p>
                    </div>
                ) : (
                    filteredFeedback.map(item => (
                        <Card key={item.id}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: 'var(--bg-body)', borderRadius: '50%', height: 'fit-content' }}>
                                    <User size={24} color="var(--text-secondary)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h4 style={{ fontWeight: 600 }}>{item.authorName}</h4>
                                            {(() => {
                                                const rawRole = teamMap[item.authorId]?.role || item.authorRole || 'TEAM';
                                                const displayRole = rawRole === 'TEAM' ? 'Team Member' :
                                                    rawRole === 'CO_FOUNDER' ? 'Co-Founder' :
                                                        rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase().replace('_', ' ');
                                                return <Badge variant="gray" className="text-[10px] py-0 px-2">{displayRole}</Badge>;
                                            })()}
                                        </div>
                                        <span className="text-sm text-muted">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>{item.content}</p>

                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <Badge variant={item.status === 'Open' ? 'yellow' : item.status === 'In Progress' ? 'blue' : 'green'}>{item.status}</Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-start mb-6" style={{ position: 'relative' }}>
                            <h2 className="text-xl font-bold">New Feedback / Insight</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    position: 'absolute',
                                    right: '-1rem',
                                    top: '-1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.5rem'
                                }}
                            >
                                <X size={24} color="#EF4444" />
                            </button>
                        </div>
                        <form onSubmit={handleAddFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label className="block text-sm font-medium" style={{ marginBottom: '0.5rem', display: 'block' }}>Type</label>
                                <select
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'var(--bg-card)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                    value={newFeedback.type}
                                    onChange={(e) => setNewFeedback({ ...newFeedback, type: e.target.value })}
                                >
                                    <option value="internal" style={{ color: 'black' }}>Internal / Mentor</option>
                                    <option value="external" style={{ color: 'black' }}>External Validation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium" style={{ marginBottom: '0.5rem', display: 'block' }}>Content</label>
                                <textarea
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        color: 'white',
                                        outline: 'none',
                                        minHeight: '100px'
                                    }}
                                    placeholder="What's the feedback?"
                                    value={newFeedback.content}
                                    onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                                />
                            </div>
                            <Button type="submit">Submit Insight</Button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
