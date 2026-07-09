import React, { useState, useEffect, useMemo } from 'react';
import { Issue, Member, IssueComment } from '../types';
import {
  AlertCircle,
  CheckCircle2,
  Tag,
  User,
  Plus,
  Send,
  Search,
  Filter,
  X,
  Clock,
  Trash2,
  MessageSquare,
  Edit,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Bookmark,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IssuesProps {
  repoId: string;
  members: Member[];
  onRefreshRepo: () => void;
}

// Available Milestone Options
const AVAILABLE_MILESTONES = [
  'Sprint 1 - Authentication Core',
  'Sprint 2 - Code Visualizer Layouts',
  'Sprint 3 - Release Checks',
  'Backlog'
];

export const IssuesPage: React.FC<IssuesProps> = ({
  repoId,
  members,
  onRefreshRepo
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  // Creation form states
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Issue['priority']>('medium');
  const [assignee, setAssignee] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [milestone, setMilestone] = useState('');

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');

  // Comment Reactions State Map (Mapped by commentId -> emoji -> count)
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, number>>>({});

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const fetchIssues = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [repoId]);

  const activeIssue = issues.find(i => i.id === activeIssueId);

  // Apply templates selection helper
  const handleSelectTemplate = (type: 'bug' | 'feature' | 'blank') => {
    if (type === 'bug') {
      setTitle('[BUG] ');
      setDescription(`### Describe the bug\n\n\n### Steps to reproduce\n1. \n2. \n\n### Expected behavior\n`);
    } else if (type === 'feature') {
      setTitle('[FEATURE] ');
      setDescription(`### Problem description\n\n\n### Proposed solution\n`);
    } else {
      setTitle('');
      setDescription('');
    }
  };

  // Trigger local reactions increment helper
  const handleAddReaction = (commentId: string, emoji: string) => {
    setCommentReactions(prev => {
      const reactions = prev[commentId] || { '👍': 0, '🎉': 0, '❤️': 0, '🚀': 0 };
      return {
        ...prev,
        [commentId]: {
          ...reactions,
          [emoji]: (reactions[emoji] || 0) + 1
        }
      };
    });
  };

  // Start Edit Mode
  const handleStartEdit = () => {
    if (!activeIssue) return;
    setEditTitle(activeIssue.title);
    setEditDescription(activeIssue.description);
    setIsEditing(true);
  };

  // Submit Title/Description edits
  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssueId || !editTitle.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim()
        })
      });

      if (response.ok) {
        setIsEditing(false);
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Issue
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          assignees: assignee ? [assignee] : [],
          labels: selectedLabels,
          milestone
        })
      });

      if (response.ok) {
        setIsCreating(false);
        setTitle('');
        setDescription('');
        setSelectedLabels([]);
        setAssignee('');
        setMilestone('');
        await fetchIssues();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLabel = () => {
    const trimmed = newLabelInput.trim().toLowerCase();
    if (trimmed && !selectedLabels.includes(trimmed)) {
      setSelectedLabels([...selectedLabels, trimmed]);
      setNewLabelInput('');
    }
  };

  const handleRemoveLabel = (lbl: string) => {
    setSelectedLabels(selectedLabels.filter(l => l !== lbl));
  };

  // Toggle label directly inside issue sidebar details
  const handleToggleIssueLabel = async (lbl: string) => {
    if (!activeIssue) return;
    const isPresent = activeIssue.labels.includes(lbl);
    const updated = isPresent 
      ? activeIssue.labels.filter(l => l !== lbl) 
      : [...activeIssue.labels, lbl];

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: updated })
      });
      if (response.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Assignee directly inside issue sidebar details
  const handleToggleIssueAssignee = async (username: string) => {
    if (!activeIssue) return;
    const isAssigned = activeIssue.assignees.includes(username);
    const updated = isAssigned 
      ? activeIssue.assignees.filter(u => u !== username) 
      : [...activeIssue.assignees, username];

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignees: updated })
      });
      if (response.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Milestone directly inside issue sidebar details
  const handleUpdateIssueMilestone = async (mName: string) => {
    if (!activeIssue) return;
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone: mName })
      });
      if (response.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeIssueId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'you',
          body: commentText
        })
      });

      if (response.ok) {
        setCommentText('');
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Status
  const handleUpdateIssueStatus = async (newStatus: Issue['status']) => {
    if (!activeIssueId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchIssues();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Priority
  const handleUpdateIssuePriority = async (newPriority: Issue['priority']) => {
    if (!activeIssueId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${activeIssueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      if (response.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Issue
  const handleDeleteIssue = async (id: string) => {
    if (!window.confirm('Delete this issue permanently?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setActiveIssueId(null);
        await fetchIssues();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Perform Client-side Filtering
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && issue.status !== 'done') ||
        (statusFilter === 'done' && issue.status === 'done');

      const matchesPriority =
        priorityFilter === 'all' ||
        issue.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [issues, searchTerm, statusFilter, priorityFilter]);

  // Priority indicator styles helper
  const getPriorityBadgeColor = (pr: Issue['priority']) => {
    switch (pr) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  // Assignee avatar resolver
  const getMemberAvatar = (username: string) => {
    const member = members.find(m => m.username === username || (username === 'you' && m.id === 'you'));
    return member?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. CREATION SCREEN WITH TEMPLATE CHIPS */}
      {isCreating && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
          
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h2 className="text-md font-bold text-gray-200">Open a New Issue</h2>
            
            {/* Template Selector */}
            <div className="flex gap-1.5 text-[9px] font-mono font-bold select-none">
              <button
                type="button"
                onClick={() => handleSelectTemplate('bug')}
                className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
              >
                🐛 Bug Template
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('feature')}
                className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
              >
                💡 Feature Template
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('blank')}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
              >
                General/Blank
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateIssue} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                  Assignee
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="">No assignee</option>
                  <option value="you">You (Owner)</option>
                  {members.filter(m => m.role === 'bot').map(m => (
                    <option key={m.id} value={m.username}>{m.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                  Milestone Target
                </label>
                <select
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="">No milestone</option>
                  {AVAILABLE_MILESTONES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                Issue Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broken authentication routing triggers reload"
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the error/enhancement in details..."
                rows={5}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600 font-mono text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                Add Labels
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  placeholder="e.g. bug, docs"
                  className="bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 flex-1 placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={handleAddLabel}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 text-xs font-bold rounded-xl transition-all"
                >
                  Add Label
                </button>
              </div>

              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {selectedLabels.map(lbl => (
                    <span
                      key={lbl}
                      onClick={() => handleRemoveLabel(lbl)}
                      className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/35 text-purple-400 text-[10px] font-semibold rounded-full flex items-center gap-1 cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                      title="Remove label"
                    >
                      {lbl}
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-glow"
              >
                Submit Issue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. BEAUTIFUL ISSUE DETAILS VIEW */}
      {activeIssue && (
        <div className="space-y-6 text-left">
          
          <div className="glass-panel p-5 rounded-2xl border border-white/5 relative">
            <button
              onClick={() => {
                setActiveIssueId(null);
                setIsEditing(false);
              }}
              className="text-xs text-purple-400 hover:underline mb-4 flex items-center gap-1 font-mono"
            >
              &larr; Back to list
            </button>

            {/* Editable Title Banner */}
            {isEditing ? (
              <form onSubmit={handleSaveEdits} className="space-y-3.5">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-md font-bold text-gray-200 focus:outline-none focus:border-purple-500/40 font-mono"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-purple-500/40 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 flex-wrap">
                    {activeIssue.title}
                    <span className="text-gray-500 font-mono">#{activeIssue.id.replace('iss-', '')}</span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                      activeIssue.status === 'done'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      {activeIssue.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                      {activeIssue.status === 'done' ? 'CLOSED' : 'OPEN'}
                    </span>
                    
                    <span className="text-xs text-dark-muted font-mono">
                      opened on {new Date(activeIssue.createdAt).toLocaleDateString()} &bull; {activeIssue.comments.length} comments
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStartEdit}
                    className="px-3.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Issue
                  </button>

                  <button
                    onClick={() => handleDeleteIssue(activeIssue.id)}
                    className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all"
                    title="Delete issue permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Details grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: Description and Comments Timeline Thread */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Description Body */}
              {!isEditing && (
                <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#0d1321]/30">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 text-xs text-dark-muted">
                    <span><strong>you</strong> opened this issue description</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {activeIssue.description || 'No description provided.'}
                  </p>
                </div>
              )}

              {/* Comments Timeline */}
              <div className="space-y-4">
                {activeIssue.comments.map((comment) => {
                  const reactions = commentReactions[comment.id] || { '👍': 0, '🎉': 0, '❤️': 0, '🚀': 0 };
                  
                  return (
                    <div key={comment.id} className="glass-panel p-4 rounded-xl border border-white/5 bg-[#090d16]/40 text-left space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-dark-muted border-b border-white/[0.03] pb-1.5 mb-2.5">
                        <span className="font-bold text-gray-300">{comment.author === 'you' ? 'You' : comment.author} commented</span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-normal">{comment.body}</p>

                      {/* EMOJI REACTIONS SECTION */}
                      <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-white/[0.02]">
                        {Object.entries(reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(comment.id, emoji)}
                            className={`px-2 py-0.5 rounded border text-[9px] font-bold font-mono transition-all flex items-center gap-1 ${
                              count > 0 
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span>{count}</span>}
                          </button>
                        ))}
                      </div>

                    </div>
                  );
                })}
                
                {activeIssue.comments.length === 0 && (
                  <div className="text-center py-6 text-dark-muted font-mono text-xs">
                    No discussions on this issue yet. Leave a comment to resolve the bug!
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment response feedback..."
                  rows={3}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-xs font-bold transition-all shadow-glow flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Comment
                  </button>
                </div>
              </form>

            </div>

            {/* RIGHT SIDEBAR: Properties Panel */}
            <div className="space-y-4">
              
              {/* Quick status controls */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-dark-muted uppercase tracking-wider font-mono">Status & Controls</h3>
                
                <div className="space-y-3 pt-1">
                  {activeIssue.status === 'done' ? (
                    <button
                      onClick={() => handleUpdateIssueStatus('todo')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> Reopen Issue
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateIssueStatus('done')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Close Issue
                    </button>
                  )}

                  {/* Priority selector */}
                  <div>
                    <label className="block text-[9px] font-bold text-dark-muted uppercase tracking-widest font-mono mb-1">Priority</label>
                    <select
                      value={activeIssue.priority}
                      onChange={(e) => handleUpdateIssuePriority(e.target.value as any)}
                      className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Milestones Select Box */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-dark-muted uppercase tracking-wider font-mono flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-purple-400" /> Milestone
                </h3>
                <select
                  value={activeIssue.milestone || ''}
                  onChange={(e) => handleUpdateIssueMilestone(e.target.value)}
                  className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="">No Milestone</option>
                  {AVAILABLE_MILESTONES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Assignees panel */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-dark-muted uppercase tracking-wider font-mono flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Assignees
                </h3>
                
                <div className="flex flex-col gap-2">
                  {activeIssue.assignees.map(user => (
                    <div key={user} className="flex items-center justify-between p-2 rounded bg-white/[0.01] border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <img src={getMemberAvatar(user)} className="w-5 h-5 rounded-full bg-slate-900 border border-white/5" alt={user} />
                        <span className="text-gray-300 font-bold">{user === 'you' ? 'You' : user}</span>
                      </div>
                      <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-400 cursor-pointer" onClick={() => handleToggleIssueAssignee(user)} />
                    </div>
                  ))}

                  {activeIssue.assignees.length === 0 && (
                    <span className="text-[10px] text-dark-muted italic">No one assigned.</span>
                  )}

                  {/* Quick assign options */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[9px] font-bold text-dark-muted font-mono block mb-1.5 uppercase">Assign Bot:</span>
                    <div className="flex flex-wrap gap-1">
                      {members.map(m => {
                        const mName = m.id === 'you' ? 'you' : m.username;
                        const isAssigned = activeIssue.assignees.includes(mName);
                        if (isAssigned) return null;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleIssueAssignee(mName)}
                            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-300 text-[9px] rounded font-mono font-bold"
                          >
                            + {mName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Labels panel */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-dark-muted uppercase tracking-wider font-mono flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Labels
                </h3>
                
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {activeIssue.labels.map(lbl => (
                      <span
                        key={lbl}
                        className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/35 text-purple-400 text-[10px] font-semibold rounded-full flex items-center gap-1"
                      >
                        {lbl}
                        <X className="w-3 h-3 text-gray-500 hover:text-red-400 cursor-pointer" onClick={() => handleToggleIssueLabel(lbl)} />
                      </span>
                    ))}
                    {activeIssue.labels.length === 0 && (
                      <span className="text-[10px] text-dark-muted italic">No labels tags.</span>
                    )}
                  </div>

                  {/* Add labels input */}
                  <div className="pt-2 border-t border-white/5 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value.trim().toLowerCase();
                          if (val) {
                            await handleToggleIssueLabel(val);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      className="bg-[#05080f] border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none flex-1 font-mono text-gray-300"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 3. DEFAULT LIST OF ISSUES */}
      {!isCreating && !activeIssueId && (
        <div className="space-y-4 text-left select-none">
          
          {/* Filters and search options */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-dark-muted" />
              <input
                type="text"
                placeholder="Search issues by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#05080f] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-purple-500/50 text-gray-300"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              
              {/* Status filter */}
              <div className="flex items-center gap-1 bg-[#05080f] border border-white/5 px-3 py-1.5 rounded-xl flex-1 md:flex-initial">
                <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-semibold text-gray-300 cursor-pointer focus:outline-none font-mono"
                >
                  <option value="all" className="bg-[#080d16] text-gray-200">All Status</option>
                  <option value="open" className="bg-[#080d16] text-gray-200">Open Only</option>
                  <option value="done" className="bg-[#080d16] text-gray-200">Closed Only</option>
                </select>
              </div>

              {/* Priority filter */}
              <div className="flex items-center gap-1 bg-[#05080f] border border-white/5 px-3 py-1.5 rounded-xl flex-1 md:flex-initial">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-300 cursor-pointer focus:outline-none font-mono"
                >
                  <option value="all" className="bg-[#080d16] text-gray-200">All Priorities</option>
                  <option value="low" className="bg-[#080d16] text-gray-200">Low</option>
                  <option value="medium" className="bg-[#080d16] text-gray-200">Medium</option>
                  <option value="high" className="bg-[#080d16] text-gray-200">High</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setIsCreating(true);
                  setAssignee('');
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-glow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Issue
              </button>

            </div>
          </div>

          {/* List panel */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center text-dark-muted font-mono text-xs">
                No matching issues found. Create a new issue to track repository bugs!
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredIssues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setActiveIssueId(issue.id);
                      setIsEditing(false);
                    }}
                    className="py-3.5 flex items-center justify-between hover:bg-white/[0.01] px-4 -mx-4 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex gap-3.5 items-start min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        issue.status === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {issue.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4 animate-pulse" />}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-200 group-hover:text-purple-400 transition-colors flex items-center gap-2 flex-wrap">
                          {issue.title}
                          <span className="text-gray-500 font-mono text-xs font-semibold">#{issue.id.replace('iss-', '')}</span>
                          
                          {/* Priority flag */}
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border font-mono ${getPriorityBadgeColor(issue.priority)}`}>
                            {issue.priority}
                          </span>

                          {/* Milestone flag */}
                          {issue.milestone && (
                            <span className="px-1.5 py-0.2 bg-purple-500/5 border border-purple-500/10 text-[8px] font-mono font-bold text-purple-300 rounded uppercase">
                              🗂️ {issue.milestone}
                            </span>
                          )}
                        </h4>

                        <div className="flex items-center gap-3.5 mt-1 text-[11px] text-dark-muted font-mono flex-wrap">
                          <span>by {issue.assignees.join(', ') || 'unassigned'} &bull; {new Date(issue.createdAt).toLocaleDateString()}</span>
                          
                          {/* Labels list */}
                          {issue.labels.length > 0 && (
                            <div className="flex items-center gap-1">
                              {issue.labels.map(l => (
                                <span key={l} className="px-1.5 bg-white/5 border border-white/5 text-gray-400 rounded text-[9px]">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-dark-muted text-xs font-mono ml-4 flex-shrink-0">
                      {issue.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {issue.comments.length}
                        </span>
                      )}

                      <span className="group-hover:translate-x-1.5 transition-transform flex items-center gap-1 text-[11px]">
                        Open issue
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
export default IssuesPage;
