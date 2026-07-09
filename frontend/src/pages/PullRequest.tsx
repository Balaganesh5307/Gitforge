import React, { useState, useEffect, useMemo } from 'react';
import { PullRequest, Branch, Commit, PRComment } from '../types';
import {
  GitPullRequest,
  CheckCircle2,
  GitMerge,
  AlertOctagon,
  MessageSquare,
  FileCode,
  ListOrdered,
  Plus,
  Send,
  Eye,
  X,
  FileCode2,
  ShieldCheck,
  Check,
  Play,
  RotateCw,
  Tag,
  User,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PullRequestProps {
  repoId: string;
  branches: Branch[];
  currentBranch: string;
  onRefreshRepo: () => void;
  onTriggerConflictVisualizer: (conflictInfo: {
    sourceBranch: string;
    targetBranch: string;
    conflictingFiles: any[];
    prId: string;
  }) => void;
}

// Available labels
const AVAILABLE_LABELS = [
  { name: 'bug', color: 'bg-red-500/10 border-red-500/30 text-red-400' },
  { name: 'enhancement', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { name: 'documentation', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { name: 'refactor', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' }
];

export const PullRequestPage: React.FC<PullRequestProps> = ({
  repoId,
  branches,
  currentBranch,
  onRefreshRepo,
  onTriggerConflictVisualizer
}) => {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [activePrId, setActivePrId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'conversation' | 'commits' | 'files'>('conversation');
  
  // Creation States
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBranch, setSourceBranch] = useState(currentBranch);
  const [targetBranch, setTargetBranch] = useState('main');

  // General conversation comment state
  const [commentText, setCommentText] = useState('');
  
  // Inline comment state
  const [activeInlineCommentKey, setActiveInlineCommentKey] = useState<string | null>(null);
  const [inlineCommentText, setInlineCommentText] = useState('');

  // Submit Review state
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'changes_requested' | 'comment'>('approved');
  const [reviewBody, setReviewBody] = useState('');

  // Labels selection simulation
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['enhancement']);

  // PR Commits & Diff states
  const [prCommits, setPrCommits] = useState<Commit[]>([]);
  const [loadingPrDetails, setLoadingPrDetails] = useState(false);

  // Time state for CI check loader simulation
  const [timeSinceCreation, setTimeSinceCreation] = useState(0);

  // Fetch PRs list
  const fetchPRs = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls`);
      if (response.ok) {
        const data = await response.json();
        setPrs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, [repoId]);

  const activePR = prs.find(p => p.id === activePrId);

  // Simulated CI Check interval tick
  useEffect(() => {
    if (!activePR) return;
    
    const interval = setInterval(() => {
      const diffSeconds = Math.floor((Date.now() - new Date(activePR.createdAt).getTime()) / 1000);
      setTimeSinceCreation(diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePR]);

  // Fetch commits and files when PR becomes active
  useEffect(() => {
    if (!activePR) return;

    const fetchPRDetails = async () => {
      setLoadingPrDetails(true);
      try {
        const srcRes = await fetch(`http://localhost:5000/api/repos/${repoId}/commits/branch/${activePR.sourceBranch}`);
        const tgtRes = await fetch(`http://localhost:5000/api/repos/${repoId}/commits/branch/${activePR.targetBranch}`);
        
        if (srcRes.ok && tgtRes.ok) {
          const srcCommits: Commit[] = await srcRes.json();
          const tgtCommits: Commit[] = await tgtRes.json();
          
          const tgtHashes = new Set(tgtCommits.map(c => c.hash));
          const diffCommits = srcCommits.filter(c => !tgtHashes.has(c.hash));
          setPrCommits(diffCommits);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPrDetails(false);
      }
    };

    fetchPRDetails();
  }, [activePrId, prs]);

  // Create PR
  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          sourceBranch,
          targetBranch,
          author: 'you'
        })
      });

      if (response.ok) {
        setIsCreating(false);
        setTitle('');
        setDescription('');
        await fetchPRs();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close PR
  const handleClosePR = async () => {
    if (!activePrId) return;
    if (!confirm('Are you sure you want to close this pull request without merging?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'you' })
      });

      if (response.ok) {
        await fetchPRs();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent, filename?: string, line?: number) => {
    e.preventDefault();
    const text = filename ? inlineCommentText : commentText;
    if (!text.trim() || !activePrId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'you',
          body: text,
          filename,
          line
        })
      });

      if (response.ok) {
        if (filename) {
          setInlineCommentText('');
          setActiveInlineCommentKey(null);
        } else {
          setCommentText('');
        }
        await fetchPRs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Review Panel
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePrId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'you',
          status: reviewStatus,
          body: reviewBody || (reviewStatus === 'approved' ? 'Approved these changes!' : 'Please review requested modifications.')
        })
      });

      if (response.ok) {
        setReviewBody('');
        setShowReviewPanel(false);
        await fetchPRs();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Merge PR
  const handleMergePR = async () => {
    if (!activePrId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'you' })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchPRs();
          onRefreshRepo();
        } else if (result.status === 'conflict') {
          onTriggerConflictVisualizer({
            sourceBranch: activePR!.sourceBranch,
            targetBranch: activePR!.targetBranch,
            conflictingFiles: result.conflictingFiles,
            prId: activePrId
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Review Bot Simulation
  const handleTriggerBotReview = async () => {
    if (!activePrId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/simulation/${repoId}/review/${activePrId}`, {
        method: 'POST'
      });
      if (response.ok) {
        await fetchPRs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle labels simulation helper
  const handleLabelToggle = (labelName: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelName) 
        ? prev.filter(l => l !== labelName) 
        : [...prev, labelName]
    );
  };

  // Resolve conflict trigger helper
  const handleResolveConflictsClick = async () => {
    if (!activePrId || !activePR) return;
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'you' })
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'conflict') {
          onTriggerConflictVisualizer({
            sourceBranch: activePR.sourceBranch,
            targetBranch: activePR.targetBranch,
            conflictingFiles: result.conflictingFiles,
            prId: activePrId
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compile modified files list
  const filesChangedList = useMemo(() => {
    const filesMap = new Map<string, { filename: string; status: string; additions: number; deletions: number; content: string }>();
    const ordered = [...prCommits].reverse();
    ordered.forEach(commit => {
      commit.filesChanged.forEach(f => {
        filesMap.set(f.filename, f);
      });
    });
    return Array.from(filesMap.values());
  }, [prCommits]);

  const hasConflictComment = activePR?.comments.some(c => c.body.toLowerCase().includes('conflict'));

  return (
    <div className="space-y-6">
      
      {/* Header controls */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-100 flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-purple-400" />
            Pull Requests
          </h1>
          <p className="text-xs text-dark-muted font-mono mt-0.5">
            Submit code reviews, inspect diffs, and merge branches.
          </p>
        </div>

        {!isCreating && !activePrId && (
          <button
            onClick={() => {
              setIsCreating(true);
              setSourceBranch(currentBranch);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold shadow-glow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Pull Request
          </button>
        )}
      </div>

      {/* 1. CREATION SCREEN */}
      {isCreating && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
          <h2 className="text-md font-bold text-gray-200">Open a New Pull Request</h2>
          <form onSubmit={handleCreatePR} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                  Base Branch (Target)
                </label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                  Compare Branch (Source)
                </label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5 font-mono">
                PR Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="feat: add JWT auth middleware"
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
                placeholder="Explain the changes you completed in this branch..."
                rows={4}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all animate-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-glow"
              >
                Create Pull Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. PR DETAILS VIEW */}
      {activePR && (
        <div className="space-y-6 text-left">
          
          {/* Back button & Status header */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <button
              onClick={() => {
                setActivePrId(null);
                setActiveTab('conversation');
              }}
              className="text-xs text-purple-400 hover:underline mb-3 flex items-center gap-1 font-mono"
            >
              &larr; Back to list
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  {activePR.title} <span className="text-gray-500 font-mono">#{activePR.id.replace('pr-', '')}</span>
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                    activePR.status === 'open'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : activePR.status === 'merged'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {activePR.status === 'open' && <GitPullRequest className="w-3 h-3" />}
                    {activePR.status === 'merged' && <GitMerge className="w-3 h-3" />}
                    {activePR.status === 'closed' && <AlertOctagon className="w-3 h-3" />}
                    {activePR.status.toUpperCase()}
                  </span>
                  
                  <span className="text-xs text-dark-muted font-mono">
                    <strong>{activePR.author}</strong> wants to merge into{' '}
                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-300">{activePR.targetBranch}</span>{' '}
                    from{' '}
                    <span className="bg-purple-500/5 border border-purple-500/10 px-1.5 py-0.5 rounded text-purple-300">{activePR.sourceBranch}</span>
                  </span>
                </div>
              </div>

              {/* Controls if open */}
              {activePR.status === 'open' && (
                <div className="flex flex-wrap gap-2 relative">
                  
                  <button
                    onClick={handleTriggerBotReview}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all animate-none"
                  >
                    Request Bot Review
                  </button>

                  <button
                    onClick={() => setShowReviewPanel(!showReviewPanel)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/15 border border-purple-500/20 hover:bg-purple-600 hover:text-white text-purple-300 transition-all flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Submit Review
                  </button>

                  <button
                    onClick={handleMergePR}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-glow flex items-center gap-1 transition-all"
                  >
                    <GitMerge className="w-4 h-4" /> Merge
                  </button>

                  <button
                    onClick={handleClosePR}
                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-400 text-xs font-semibold rounded-lg transition-all"
                  >
                    Close PR
                  </button>

                  {/* SUBMIT REVIEW POPUP PANEL */}
                  <AnimatePresence>
                    {showReviewPanel && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-10 w-72 glass-panel premium-navbar rounded-xl border border-white/10 p-4 shadow-2xl z-45 bg-[#090d16]"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest font-mono">Code Review Board</span>
                          <X className="w-3.5 h-3.5 text-gray-400 hover:text-white cursor-pointer" onClick={() => setShowReviewPanel(false)} />
                        </div>
                        
                        <form onSubmit={handleSubmitReview} className="space-y-3">
                          <div>
                            <span className="text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider block mb-1.5">Action Status</span>
                            <div className="flex flex-col gap-1.5 text-xs">
                              <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-400">
                                <input
                                  type="radio"
                                  name="review_status"
                                  checked={reviewStatus === 'approved'}
                                  onChange={() => setReviewStatus('approved')}
                                  className="text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#05080f] border-white/10 cursor-pointer"
                                />
                                Approve
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-400">
                                <input
                                  type="radio"
                                  name="review_status"
                                  checked={reviewStatus === 'changes_requested'}
                                  onChange={() => setReviewStatus('changes_requested')}
                                  className="text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#05080f] border-white/10 cursor-pointer"
                                />
                                Request Changes
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-300">
                                <input
                                  type="radio"
                                  name="review_status"
                                  checked={reviewStatus === 'comment'}
                                  onChange={() => setReviewStatus('comment')}
                                  className="text-purple-600 focus:ring-0 focus:ring-offset-0 bg-[#05080f] border-white/10 cursor-pointer"
                                />
                                Comment Feedback
                              </label>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider block mb-1">Review Summary</span>
                            <textarea
                              value={reviewBody}
                              onChange={(e) => setReviewBody(e.target.value)}
                              placeholder="Review description details..."
                              rows={3}
                              className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-purple-500/40"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs transition-all"
                          >
                            Submit Review
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 border-t border-white/5 mt-5 pt-3">
              {[
                { id: 'conversation', label: 'Conversation', icon: MessageSquare },
                { id: 'commits', label: 'Commits', icon: ListOrdered, count: prCommits.length },
                { id: 'files', label: 'Files Changed', icon: FileCode, count: filesChangedList.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 pb-2.5 border-b-2 text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-dark-muted hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="text-[10px] bg-white/5 px-1.5 py-0.2 rounded-full text-dark-muted border border-white/5">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* TAB CONTENTS */}
          <div className="space-y-4">
            
            {/* CONVERSATION TAB */}
            {activeTab === 'conversation' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 space-y-6">
                  {/* PR Description card */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 relative bg-[#0d1321]/30">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-gray-300">{activePR.author} commented</span>
                      <span className="text-[10px] text-dark-muted font-mono">{new Date(activePR.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                      {activePR.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Reviews & comments timeline */}
                  <div className="space-y-4">
                    {(() => {
                      const timeline: any[] = [];
                      activePR.comments.forEach(c => timeline.push({ type: 'comment', data: c }));
                      activePR.reviews.forEach(r => timeline.push({ type: 'review', data: r }));
                      
                      const sortedTimeline = timeline.sort((a, b) => 
                        new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime()
                      );

                      if (sortedTimeline.length === 0) {
                        return (
                          <div className="text-center py-6 text-dark-muted font-mono text-xs">
                            No reviews or comments yet.
                          </div>
                        );
                      }

                      return sortedTimeline.map((item, idx) => {
                        const formattedTime = new Date(item.data.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        
                        if (item.type === 'comment') {
                          const comment: PRComment = item.data;
                          return (
                            <div key={`c-${idx}`} className="glass-panel p-4 rounded-xl border border-white/5 bg-[#090d16]/40">
                              <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                                <span className="font-semibold text-gray-300">{comment.author === 'you' ? 'You' : comment.author}</span>
                                <span className="text-dark-muted">{formattedTime}</span>
                              </div>
                              {comment.filename && (
                                <div className="text-[10px] font-mono text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10 mb-2 w-max">
                                  Commented on: {comment.filename} : Line {comment.line}
                                </div>
                              )}
                              <p className="text-sm text-gray-300">{comment.body}</p>
                            </div>
                          );
                        } else {
                          const review = item.data;
                          const isApproved = review.status === 'approved';
                          return (
                            <div key={`r-${idx}`} className={`p-4 rounded-xl border flex gap-3 ${
                              isApproved 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                                : 'bg-red-500/5 border-red-500/20 text-red-300'
                            }`}>
                              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isApproved ? 'text-emerald-400' : 'text-red-400'}`} />
                              <div>
                                <h4 className="text-xs font-bold font-mono">
                                  {review.author} reviewed and {isApproved ? 'approved' : 'requested changes'}
                                </h4>
                                <p className="text-xs mt-1 text-gray-300">{review.body}</p>
                                <span className="text-[10px] text-dark-muted font-mono block mt-1">{formattedTime}</span>
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>

                  {/* Add feedback Form */}
                  <form onSubmit={(e) => handleAddComment(e)} className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Leave a comment or code review feedback..."
                      rows={3}
                      className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-glow"
                      >
                        <Send className="w-3.5 h-3.5" /> Comment
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Side Checklists & Sidebar Panels */}
                <div className="space-y-4">
                  
                  {/* PR Health & Conflict details */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Merge Checklist</h3>
                    <div className="space-y-4">
                      
                      {/* Automated CI Build check */}
                      <div className="flex items-start gap-2.5 text-xs">
                        <span className="mt-0.5">
                          {timeSinceCreation < 15 ? (
                            <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px]">✓</div>
                          )}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-200">Simulated CI Build Actions</h4>
                          <p className="text-[11px] text-dark-muted mt-0.5">
                            {timeSinceCreation < 15 
                              ? 'Running unit-tests & code linter configurations (1 pending)...'
                              : 'All build checks succeeded. Passed in 14 seconds.'}
                          </p>
                        </div>
                      </div>

                      {/* Conflict check */}
                      <div className="flex items-start gap-2.5 text-xs">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono text-[9px] mt-0.5 ${
                          hasConflictComment ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {hasConflictComment ? '!' : '✓'}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-200">Conflict Marker Verification</h4>
                          <p className="text-[11px] text-dark-muted mt-0.5 leading-relaxed">
                            {hasConflictComment 
                              ? 'Merge overlaps flagged on target branches.' 
                              : 'No automatic conflicts detected. Branch is merge ready.'}
                          </p>
                          {hasConflictComment && (
                            <button
                              onClick={handleResolveConflictsClick}
                              className="mt-2 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold font-mono transition-all"
                            >
                              Resolve Conflicts Inline
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bot Review checks */}
                      <div className="flex items-start gap-2.5 text-xs">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono text-[9px] mt-0.5 ${
                          activePR.reviews.some(r => r.status === 'changes_requested')
                            ? 'bg-red-500/20 text-red-400'
                            : activePR.reviews.some(r => r.status === 'approved')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {activePR.reviews.some(r => r.status === 'changes_requested') ? '!' : activePR.reviews.some(r => r.status === 'approved') ? '✓' : '?'}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-200">Code Quality Reviews</h4>
                          <p className="text-[11px] text-dark-muted mt-0.5">
                            {activePR.reviews.some(r => r.status === 'changes_requested')
                              ? 'Bob-reviewer requested modifications.'
                              : activePR.reviews.some(r => r.status === 'approved')
                              ? 'Approved review present.'
                              : 'No official reviewer approvals. Request a bot review!'}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Labels list selection panel */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                    <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Pull Request Labels
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_LABELS.map(lbl => {
                        const isSelected = selectedLabels.includes(lbl.name);
                        return (
                          <span
                            key={lbl.name}
                            onClick={() => handleLabelToggle(lbl.name)}
                            className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold cursor-pointer transition-all ${
                              isSelected 
                                ? lbl.color + ' border-purple-500' 
                                : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-400'
                            }`}
                          >
                            {lbl.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assignees panel */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
                    <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Assignees
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=you" className="w-5.5 h-5.5 rounded-full bg-slate-900 border border-white/10" alt="you" />
                      <span className="text-gray-300 font-bold">you (Owner)</span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* COMMITS TAB */}
            {activeTab === 'commits' && (
              <div className="glass-panel p-5 rounded-2xl border border-white/5">
                {loadingPrDetails ? (
                  <div className="py-6 text-center text-xs text-dark-muted animate-pulse">Loading commits list...</div>
                ) : prCommits.length === 0 ? (
                  <div className="py-6 text-center text-xs text-dark-muted font-mono">No new commits on this branch.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {prCommits.map(commit => (
                      <div key={commit.hash} className="py-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-purple-400 font-semibold">{commit.hash.substring(0, 8)}</span>
                          <h4 className="text-sm font-semibold text-gray-200 mt-0.5">{commit.message}</h4>
                          <span className="text-[10px] text-dark-muted font-mono">by {commit.author} on {new Date(commit.timestamp).toLocaleDateString()}</span>
                        </div>
                        <span className="text-xs text-dark-muted font-mono">{commit.filesChanged.length} files changed</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FILES CHANGED TAB & INLINE COMMENTS */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                {loadingPrDetails ? (
                  <div className="py-6 text-center text-xs text-dark-muted animate-pulse">Loading file diffs...</div>
                ) : filesChangedList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-dark-muted">No modified files.</div>
                ) : (
                  filesChangedList.map((file: any) => {
                    const lines = file.content.split('\n');
                    const fileComments = activePR.comments.filter(c => c.filename === file.filename);

                    return (
                      <div key={file.filename} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                        
                        <div className="px-5 py-3 bg-[#0b0f19] border-b border-white/5 flex justify-between items-center">
                          <span className="text-xs font-mono text-gray-300 font-semibold flex items-center gap-1.5">
                            <FileCode2 className="w-4 h-4 text-purple-400" />
                            {file.filename}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 capitalize font-bold">
                            {file.status}
                          </span>
                        </div>

                        {/* Code Lines */}
                        <div className="bg-[#05070c]/90 overflow-x-auto font-mono text-sm leading-relaxed p-4 select-text">
                          <div className="space-y-0.5 min-w-[500px]">
                            {lines.map((line: string, idx: number) => {
                              const lineNumber = idx + 1;
                              const isAddition = line.includes('import') || line.includes('export') || line.includes('const') || line.trim().startsWith('//');
                              
                              const lineComments = fileComments.filter(c => c.line === lineNumber);
                              const commentKey = `${file.filename}:${lineNumber}`;
                              const isCommentInputOpen = activeInlineCommentKey === commentKey;

                              return (
                                <div key={idx} className="flex flex-col border-b border-white/[0.01]">
                                  
                                  <div className="flex group hover:bg-white/5 px-2.5 py-0.5 rounded transition-all items-center relative">
                                    <span className="text-dark-muted text-xs pr-4 border-r border-white/5 w-8 select-none text-left relative flex items-center justify-between">
                                      {lineNumber}
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveInlineCommentKey(isCommentInputOpen ? null : commentKey);
                                          setInlineCommentText('');
                                        }}
                                        className="opacity-0 group-hover:opacity-100 absolute left-8 top-0 p-0.5 rounded bg-purple-600 text-white z-10 hover:bg-purple-500 transition-opacity"
                                        title="Add inline review comment"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </span>
                                    
                                    <pre className={`pl-4 flex-grow text-xs text-left ${
                                      isAddition ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-300'
                                    }`}>
                                      {line || ' '}
                                    </pre>
                                  </div>

                                  {/* Inline Comments */}
                                  {lineComments.length > 0 && (
                                    <div className="pl-12 pr-6 py-2 bg-purple-500/[0.01] border-l-2 border-purple-500 space-y-2 select-text text-left">
                                      {lineComments.map((comment) => (
                                        <div key={comment.id} className="p-2.5 rounded-lg bg-[#0b0f19] border border-white/5 text-[11px]">
                                          <div className="flex justify-between items-center text-dark-muted font-mono mb-1">
                                            <span className="font-bold text-gray-300">{comment.author === 'you' ? 'You' : comment.author}</span>
                                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <p className="text-gray-200">{comment.body}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Comment Input */}
                                  {isCommentInputOpen && (
                                    <div className="pl-12 pr-6 py-3 border-l-2 border-indigo-500 bg-indigo-500/[0.01]">
                                      <form
                                        onSubmit={(e) => handleAddComment(e, file.filename, lineNumber)}
                                        className="space-y-2 bg-[#090d16] p-3 rounded-lg border border-white/5"
                                      >
                                        <div className="text-[10px] text-indigo-400 font-mono font-bold flex items-center justify-between">
                                          <span>📝 Add Review Comment (Line {lineNumber})</span>
                                          <X className="w-3 h-3 hover:text-white cursor-pointer" onClick={() => setActiveInlineCommentKey(null)} />
                                        </div>
                                        
                                        <textarea
                                          value={inlineCommentText}
                                          onChange={(e) => setInlineCommentText(e.target.value)}
                                          placeholder="Type line revision request..."
                                          rows={2}
                                          className="w-full bg-[#05080f] border border-white/10 rounded-md p-2 text-xs focus:outline-none focus:border-indigo-500/40 text-gray-300"
                                        />

                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setActiveInlineCommentKey(null)}
                                            className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded text-[10px] font-bold"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="submit"
                                            disabled={!inlineCommentText.trim()}
                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                                          >
                                            Save Comment
                                          </button>
                                        </div>
                                      </form>
                                    </div>
                                  )}

                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* 3. DEFAULT LIST OF PRS */}
      {!isCreating && !activePrId && (
        <div className="glass-panel p-5 rounded-2xl border border-white/5 text-left">
          {prs.length === 0 ? (
            <div className="py-12 text-center text-dark-muted font-mono text-xs">
              No pull requests created. Create a branch, commit files, and click "New Pull Request" to collaborate!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {prs.map(pr => (
                <div
                  key={pr.id}
                  onClick={() => {
                    setActivePrId(pr.id);
                    setActiveTab('conversation');
                  }}
                  className="py-4 flex items-center justify-between hover:bg-white/[0.01] px-4 -mx-4 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex gap-3.5 items-start">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      pr.status === 'open'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : pr.status === 'merged'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      <GitPullRequest className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 group-hover:text-purple-400 transition-colors">
                        {pr.title} <span className="text-gray-500 font-mono">#{pr.id.replace('pr-', '')}</span>
                      </h4>
                      <p className="text-xs text-dark-muted mt-1 font-mono">
                        by {pr.author} &bull; {pr.sourceBranch} &rarr; {pr.targetBranch} &bull;{' '}
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {pr.reviews.length > 0 && (
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                        pr.reviews.some(r => r.status === 'changes_requested')
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {pr.reviews.some(r => r.status === 'changes_requested') ? 'Changes Requested' : 'Approved'}
                      </span>
                    )}

                    <span className="text-xs text-dark-muted font-mono group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                      View details
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
