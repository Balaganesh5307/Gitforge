import React, { useState, useEffect, useMemo } from 'react';
import { PullRequest, Branch, Commit, PRComment, Member } from '../types';
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
  ArrowRight
} from 'lucide-react';

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

  // Comment state
  const [commentText, setCommentText] = useState('');
  
  // PR Commits & Diff states
  const [prCommits, setPrCommits] = useState<Commit[]>([]);
  const [loadingPrDetails, setLoadingPrDetails] = useState(false);

  // Fetch PRs
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

  // Fetch commits and files when PR becomes active
  useEffect(() => {
    if (!activePR) return;

    const fetchPRDetails = async () => {
      setLoadingPrDetails(true);
      try {
        // Fetch commits for source branch
        const srcRes = await fetch(`http://localhost:5000/api/repos/${repoId}/commits/branch/${activePR.sourceBranch}`);
        // Fetch commits for target branch
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

  const handleAddComment = async (e: React.FormEvent, filename?: string, line?: number) => {
    e.preventDefault();
    if (!commentText.trim() || !activePrId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/pulls/${activePrId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'you',
          body: commentText,
          filename,
          line
        })
      });

      if (response.ok) {
        setCommentText('');
        // Refresh local PR list
        await fetchPRs();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
          // Trigger conflict resolution screen
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

  // Compile all files changed across the commits on this PR
  const filesChangedList = useMemo(() => {
    const filesMap = new Map<string, { filename: string; status: string; additions: number; deletions: number; content: string }>();
    
    // Sort oldest first to compile changes
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
      
      {/* Page Title / Trigger creation */}
      <div className="flex items-center justify-between">
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
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-md font-bold text-gray-200">Open a New Pull Request</h2>
          <form onSubmit={handleCreatePR} className="space-y-4">
            
            {/* Branch Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Base Branch (Target)
                </label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Compare Branch (Source)
                </label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                PR Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="feat: add JWT auth middleware"
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
                placeholder="Explain the changes you completed in this branch..."
                rows={4}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-glow"
              >
                Create Pull Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. PR DETAILS VIEW */}
      {activePR && (
        <div className="space-y-6">
          
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
                <h2 className="text-lg font-bold text-gray-100">
                  {activePR.title} <span className="text-gray-500">#{activePR.id.replace('pr-', '')}</span>
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${
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

              {/* Merge Controls if open */}
              {activePR.status === 'open' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerBotReview}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all flex items-center gap-1.5"
                  >
                    Request Bot Review
                  </button>
                  <button
                    onClick={handleMergePR}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-glow flex items-center gap-1.5 transition-all"
                  >
                    <GitMerge className="w-4 h-4" />
                    Merge Pull Request
                  </button>
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
                    <span className="text-[10px] bg-white/5 px-1 py-0.2 rounded-full text-dark-muted border border-white/5">
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
                
                {/* Comments & Reviews Timeline */}
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
                    {/* Combine comments and reviews sorted by time */}
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
                            No reviews or comments yet. Run a Bot Review or write a feedback message!
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
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-glow disabled:shadow-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Comment
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Side: Status Banners / Review Checklist */}
                <div className="space-y-4">
                  
                  {/* PR Health & Conflict details */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Merge Checklist</h3>
                    
                    <div className="space-y-3">
                      
                      {/* Conflict checks */}
                      <div className="flex items-start gap-2.5 text-xs">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono text-[9px] mt-0.5 ${
                          hasConflictComment ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {hasConflictComment ? '!' : '✓'}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-200">Conflict Marker Verification</h4>
                          <p className="text-[11px] text-dark-muted mt-0.5">
                            {hasConflictComment 
                              ? 'Overlap changes flagged. Attempting merge will open Conflict resolver.' 
                              : 'No automatic conflicts detected. Branch is merge ready.'}
                          </p>
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

                </div>

              </div>
            )}

            {/* COMMITS TAB */}
            {activeTab === 'commits' && (
              <div className="glass-panel p-5 rounded-2xl border border-white/5">
                {loadingPrDetails ? (
                  <div className="py-6 text-center text-xs text-dark-muted animate-pulse">Loading commits list...</div>
                ) : prCommits.length === 0 ? (
                  <div className="py-6 text-center text-xs text-dark-muted font-mono">No new commits on this branch since parent branching.</div>
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

            {/* FILES CHANGED TAB */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                {loadingPrDetails ? (
                  <div className="py-6 text-center text-xs text-dark-muted animate-pulse">Loading file diffs...</div>
                ) : filesChangedList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-dark-muted">No modified files.</div>
                ) : (
                  filesChangedList.map((file: any) => {
                    const lines = file.content.split('\n');
                    return (
                      <div key={file.filename} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                        
                        {/* File details banner */}
                        <div className="px-5 py-3 bg-[#0b0f19] border-b border-white/5 flex justify-between items-center">
                          <span className="text-xs font-mono text-gray-300 font-semibold">{file.filename}</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 capitalize">
                            {file.status}
                          </span>
                        </div>

                        {/* File code view with simulated Diff colors */}
                        <div className="bg-[#05070c]/90 overflow-x-auto font-mono text-sm leading-relaxed p-4 select-text">
                          <div className="space-y-0.5 min-w-[500px]">
                            {lines.map((line: string, idx: number) => {
                              // Simulate diff line styles based on content
                              // Green background/text for additions, red for edits or just style them nicely
                              const isAddition = line.includes('import') || line.includes('export') || line.includes('const') || line.trim().startsWith('//');
                              
                              return (
                                <div
                                  key={idx}
                                  className={`flex group hover:bg-white/5 px-2.5 py-0.5 rounded transition-all`}
                                >
                                  <span className="text-dark-muted text-xs pr-4 border-r border-white/5 w-8 select-none">{idx + 1}</span>
                                  <pre className={`pl-4 flex-grow ${
                                    isAddition ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-300'
                                  }`}>
                                    {line || ' '}
                                  </pre>
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
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
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
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        pr.reviews.some(r => r.status === 'changes_requested')
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        Reviewed ({pr.reviews[pr.reviews.length - 1].status === 'approved' ? 'Approved' : 'Changes Requested'})
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
