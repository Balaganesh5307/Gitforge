import React, { useState, useEffect } from 'react';
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
  MessageSquare
} from 'lucide-react';

interface IssuesProps {
  repoId: string;
  members: Member[];
  onRefreshRepo: () => void;
}

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

  // Comment state
  const [commentText, setCommentText] = useState('');

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
          labels: selectedLabels
        })
      });

      if (response.ok) {
        setIsCreating(false);
        setTitle('');
        setDescription('');
        setSelectedLabels([]);
        setAssignee('');
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
  const filteredIssues = issues.filter(issue => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && issue.status !== 'done') ||
      (statusFilter === 'done' && issue.status === 'done');

    const matchesPriority =
      priorityFilter === 'all' || issue.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-100 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-indigo-400" />
            Issue Tracker
          </h1>
          <p className="text-xs text-dark-muted font-mono mt-0.5">
            Log glitches, request assets, and organize deliverables.
          </p>
        </div>

        {!isCreating && !activeIssueId && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold shadow-glow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Issue
          </button>
        )}
      </div>

      {/* 1. CREATION SCREEN */}
      {isCreating && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-md font-bold text-gray-200">Log a New Issue</h2>
          <form onSubmit={handleCreateIssue} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                Issue Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Database pool connection exhaustion warning..."
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe details, steps to reproduce, or requirements..."
                rows={3}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
            </div>

            {/* Priority & Assignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.username} value={m.username}>
                      {m.username === 'you' ? 'You' : m.username} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Labels Creator */}
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                Issue Labels
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  placeholder="e.g. bug, performance, ui"
                  className="flex-grow bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-1.5 text-sm text-gray-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLabel}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-lg border border-white/10"
                >
                  Add Label
                </button>
              </div>

              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {selectedLabels.map(lbl => (
                    <span key={lbl} className="flex items-center gap-1 text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                      {lbl}
                      <button type="button" onClick={() => handleRemoveLabel(lbl)}>
                        <X className="w-3 h-3 hover:text-red-400" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-glow"
              >
                Submit Issue
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 2. ISSUE DETAILS PANEL */}
      {activeIssue && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveIssueId(null)}
              className="text-xs text-purple-400 hover:underline mb-3 flex items-center gap-1 font-mono"
            >
              &larr; Back to all issues
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100">
                  {activeIssue.title} <span className="text-gray-500 font-mono">#{activeIssue.id.replace('iss-', '')}</span>
                </h2>

                <div className="flex flex-wrap items-center gap-2.5 mt-2">
                  {/* Status */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${
                    activeIssue.status === 'done'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    {activeIssue.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {activeIssue.status.replace('_', ' ').toUpperCase()}
                  </span>

                  {/* Priority */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                    activeIssue.priority === 'high'
                      ? 'bg-red-500/10 border-red-500/25 text-red-400'
                      : activeIssue.priority === 'medium'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                      : 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                  }`}>
                    {activeIssue.priority} Priority
                  </span>

                  {/* Date */}
                  <span className="text-xs text-dark-muted font-mono">
                    Created on {new Date(activeIssue.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status modifiers / Delete */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={activeIssue.status}
                  onChange={(e) => handleUpdateIssueStatus(e.target.value as any)}
                  className="bg-[#0b0f19] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done / Closed</option>
                </select>

                <button
                  onClick={() => handleDeleteIssue(activeIssue.id)}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Delete Issue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description body */}
            <div className="mt-5 pt-4 border-t border-white/5">
              <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">Description</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-[#05070c]/50 p-4 rounded-xl border border-white/5 select-text">
                {activeIssue.description || 'No description provided.'}
              </p>
            </div>

            {/* Labels and Assignees details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider block mb-1">Labels</span>
                {activeIssue.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {activeIssue.labels.map(l => (
                      <span key={l} className="text-[10px] font-mono bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {l}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-600 italic">None</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider block mb-1">Assignees</span>
                {activeIssue.assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {activeIssue.assignees.map(a => (
                      <span key={a} className="text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-600 italic">Unassigned</span>
                )}
              </div>
            </div>

          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comments Timeline</h3>
            
            <div className="space-y-3">
              {activeIssue.comments.length === 0 ? (
                <p className="text-xs text-dark-muted font-mono text-center py-4 bg-[#080d16]/20 rounded-xl border border-white/[0.02]">
                  No comments logged on this issue yet.
                </p>
              ) : (
                activeIssue.comments.map(c => (
                  <div key={c.id} className="glass-panel p-4 rounded-xl border border-white/5 bg-[#090d16]/30">
                    <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                      <span className="font-semibold text-gray-300">{c.author === 'you' ? 'You' : c.author}</span>
                      <span className="text-dark-muted">{new Date(c.createdAt).toLocaleDateString() + ' ' + new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-gray-300 select-text">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Log comments or updates on progress..."
                rows={2}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-glow"
                >
                  <Send className="w-3.5 h-3.5" />
                  Post Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DEFAULT LIST OF ISSUES */}
      {!isCreating && !activeIssueId && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="glass-panel px-4 py-3 rounded-xl border border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-dark-muted" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#090d16] border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-xs text-gray-300 outline-none focus:border-purple-500/40"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              
              {/* Status Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-dark-muted" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent border-none text-gray-300 font-medium focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open Issues</option>
                  <option value="done">Closed / Done</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1 text-xs border-l border-white/5 pl-3">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent border-none text-gray-300 font-medium focus:ring-0 cursor-pointer animate-fade"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

            </div>
          </div>

          {/* List Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            {filteredIssues.length === 0 ? (
              <div className="py-12 text-center text-dark-muted font-mono text-xs">
                No issues match your criteria. Log an issue or trigger a simulated bot issue!
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredIssues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => setActiveIssueId(issue.id)}
                    className="py-3.5 flex items-center justify-between hover:bg-white/[0.01] px-4 -mx-4 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex gap-3 items-start min-w-0 pr-4">
                      {issue.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          issue.priority === 'high' ? 'text-red-400 animate-pulse' : 'text-indigo-400'
                        }`} />
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-200 group-hover:text-purple-400 transition-colors truncate">
                          {issue.title} <span className="text-gray-500 font-mono">#{issue.id.replace('iss-', '')}</span>
                        </h4>
                        
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {/* Priority Badge */}
                          <span className={`text-[9px] font-mono font-semibold px-1.5 rounded uppercase ${
                            issue.priority === 'high'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : issue.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {issue.priority}
                          </span>

                          {/* Assignee Badge */}
                          {issue.assignees.map(a => (
                            <span key={a} className="text-[9px] font-mono bg-purple-500/5 text-purple-300 border border-purple-500/10 px-1.5 rounded">
                              {a === 'you' ? 'you' : a}
                            </span>
                          ))}

                          {/* Labels */}
                          {issue.labels.map(l => (
                            <span key={l} className="text-[9px] font-mono bg-white/5 text-gray-400 border border-white/5 px-1.5 rounded">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-dark-muted font-mono flex-shrink-0">
                      {issue.comments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {issue.comments.length}
                        </span>
                      )}
                      <span className="group-hover:translate-x-1.5 transition-transform">
                        &rarr;
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
