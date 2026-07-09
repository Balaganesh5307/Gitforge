import React, { useState, useMemo } from 'react';
import { Commit, Branch } from '../types';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  GitCommit,
  GitMerge,
  Search,
  Check,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BranchGraph } from '../components/BranchGraph';

interface BranchesPageProps {
  repoId: string;
  branches: Branch[];
  currentBranchName: string;
  commits: Commit[];
  onCheckoutBranch: (branchName: string) => void;
  onRefreshData: () => void;
  showNotification: (text: string, type: 'success' | 'info' | 'error') => void;
}

export const BranchesPage: React.FC<BranchesPageProps> = ({
  repoId,
  branches,
  currentBranchName,
  commits,
  onCheckoutBranch,
  onRefreshData,
  showNotification
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  
  // Form input states
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranchName, setSourceBranchName] = useState('main');
  const [renameInput, setRenameInput] = useState('');
  
  // Compare branch selection states
  const [compareSource, setCompareSource] = useState('');
  const [compareTarget, setCompareTarget] = useState('main');
  
  // Compare results states
  const [isComparing, setIsComparing] = useState(false);
  const [compareResults, setCompareResults] = useState<{
    mergeStatus: {
      status: 'clean' | 'conflict' | 'up_to_date';
      description?: string;
      conflictingFiles?: string[];
      message?: string;
    };
    commits: Commit[];
  } | null>(null);

  // Active branch protections states
  const [restrictDirectPush, setRestrictDirectPush] = useState(true);
  const [requirePR, setRequirePR] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Expand conflict files details
  const [expandedConflictFile, setExpandedConflictFile] = useState<string | null>(null);

  // Reusable Git Graph traversal helper to get reachable commits for a branch
  const getReachableCommitsSet = (branchName: string): Set<string> => {
    const branch = branches.find(b => b.name === branchName);
    if (!branch) return new Set();

    const visited = new Set<string>();
    const queue = [branch.headCommitHash];
    const commitsMap = new Map<string, Commit>();
    commits.forEach(c => commitsMap.set(c.hash, c));

    while (queue.length > 0) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);

      const commit = commitsMap.get(hash);
      if (commit) {
        queue.push(...commit.parentHashes);
      }
    }
    return visited;
  };

  // Pre-calculate Ahead/Behind stats compared to default branch 'main'
  const branchMetrics = useMemo(() => {
    const mainSet = getReachableCommitsSet('main');
    const metrics: Record<string, { ahead: number; behind: number }> = {};

    branches.forEach(b => {
      if (b.name === 'main') {
        metrics[b.name] = { ahead: 0, behind: 0 };
        return;
      }

      const branchSet = getReachableCommitsSet(b.name);
      
      // Ahead = commits in this branch that are NOT in main
      const ahead = [...branchSet].filter(h => !mainSet.has(h)).length;
      
      // Behind = commits in main that are NOT in this branch
      const behind = [...mainSet].filter(h => !branchSet.has(h)).length;

      metrics[b.name] = { ahead, behind };
    });

    return metrics;
  }, [branches, commits]);

  // 1. Create Branch API Trigger
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBranch: sourceBranchName, newBranch: newBranchName.trim() })
      });
      const data = await response.json();

      if (response.ok) {
        showNotification(`Branch "${newBranchName}" created successfully!`, 'success');
        setNewBranchName('');
        setShowCreateModal(false);
        onRefreshData();
      } else {
        showNotification(data.error || 'Failed to create branch', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
    }
  };

  // 2. Rename Branch API Trigger
  const handleRenameBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenameModal || !renameInput.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/branches/${showRenameModal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: renameInput.trim() })
      });
      const data = await response.json();

      if (response.ok) {
        showNotification(`Renamed branch to "${renameInput}"`, 'success');
        if (currentBranchName === showRenameModal) {
          onCheckoutBranch(renameInput.trim());
        }
        setShowRenameModal(null);
        setRenameInput('');
        onRefreshData();
      } else {
        showNotification(data.error || 'Failed to rename branch', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
    }
  };

  // 3. Delete Branch API Trigger
  const handleDeleteBranch = async (branchName: string) => {
    if (branchName === 'main') return;
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/branches/${branchName}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        showNotification(`Deleted branch "${branchName}"`, 'success');
        if (currentBranchName === branchName) {
          onCheckoutBranch('main');
        }
        onRefreshData();
      } else {
        showNotification(data.error || 'Failed to delete branch', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
    }
  };

  // 4. Compare Branches API Trigger
  const handleCompare = async () => {
    if (!compareSource || !compareTarget) return;
    if (compareSource === compareTarget) {
      setCompareResults({
        mergeStatus: { status: 'up_to_date', message: 'Identical source and target branches.' },
        commits: []
      });
      return;
    }

    setIsComparing(true);
    setExpandedConflictFile(null);
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/compare?source=${compareSource}&target=${compareTarget}`);
      const data = await response.json();

      if (response.ok) {
        setCompareResults(data);
      } else {
        showNotification(data.error || 'Failed to compare branches', 'error');
      }
    } catch (err) {
      showNotification('Network connection error', 'error');
    } finally {
      setIsComparing(false);
    }
  };

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    return branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [branches, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Branch Summary Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-dark-muted uppercase font-mono tracking-wider block">Total Branches</span>
            <h3 className="text-2xl font-black text-gray-200 mt-1">{branches.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-dark-muted uppercase font-mono tracking-wider block">Active Checkout</span>
            <h3 className="text-lg font-mono font-bold text-purple-300 mt-1.5 truncate max-w-[150px]">{currentBranchName}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-dark-muted uppercase font-mono tracking-wider block">Default Track</span>
            <h3 className="text-lg font-mono font-bold text-emerald-400 mt-1.5">main</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Branches Table (Left) & Compare / Git Graph (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* LEFT COLUMN: Branch table & search */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Branch Table Card */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            
            {/* Header controls */}
            <div className="p-4 bg-[#080d16]/50 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-dark-muted" />
                <input
                  type="text"
                  placeholder="Search branch name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#05080f] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <button
                onClick={() => {
                  setSourceBranchName(currentBranchName);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Branch
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-white/5">
              {filteredBranches.map(branch => {
                const isActive = branch.name === currentBranchName;
                const metrics = branchMetrics[branch.name] || { ahead: 0, behind: 0 };
                return (
                  <div key={branch.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <GitBranch className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                        <span className="font-mono text-xs font-bold text-gray-200">{branch.name}</span>
                        
                        {branch.isDefault && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                            default
                          </span>
                        )}
                        {isActive && (
                          <span className="px-1.5 py-0.2 bg-purple-500/15 border border-purple-500/25 text-purple-300 rounded text-[8px] font-mono font-bold uppercase tracking-wider animate-pulse">
                            active
                          </span>
                        )}

                        {/* Ahead/Behind Commit markers */}
                        {branch.name !== 'main' && (
                          <div className="flex gap-1.5 text-[9px] font-mono select-none">
                            <span className="text-emerald-400 bg-emerald-500/5 px-1 rounded" title="Commits ahead of main">
                              +{metrics.ahead}
                            </span>
                            <span className="text-amber-500 bg-amber-500/5 px-1 rounded" title="Commits behind main">
                              -{metrics.behind}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-dark-muted font-mono mt-1 truncate max-w-sm">
                        HEAD: <span className="text-gray-400">{branch.headCommitHash.substring(0, 8)}</span> • {new Date(branch.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 select-none">
                      {!isActive && (
                        <button
                          onClick={() => onCheckoutBranch(branch.name)}
                          className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold font-mono transition-colors"
                        >
                          Checkout
                        </button>
                      )}
                      
                      {!branch.isDefault && (
                        <>
                          <button
                            onClick={() => {
                              setRenameInput(branch.name);
                              setShowRenameModal(branch.name);
                            }}
                            className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Rename Branch"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteBranch(branch.name)}
                            disabled={isActive}
                            className={`p-1.5 rounded border transition-colors ${
                              isActive
                                ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                                : 'bg-red-500/10 border-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300'
                            }`}
                            title="Delete Branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
              {filteredBranches.length === 0 && (
                <div className="p-8 text-center text-xs text-dark-muted font-mono">No matching branches found.</div>
              )}
            </div>

          </div>

          {/* Git Graph Visualizer panel */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-purple-400" />
              Interactive Commit Graph
            </h3>
            <BranchGraph
              commits={commits}
              branches={branches}
              currentBranch={currentBranchName}
              onCommitSelect={(commit) => {
                alert(`Commit Details:\n\nHash: ${commit.hash}\nAuthor: ${commit.author}\nMessage: ${commit.message}\nDate: ${new Date(commit.timestamp).toLocaleString()}\nReachable on: ${commit.branchName}`);
              }}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: Branch Compare & protections */}
        <div className="space-y-6">
          
          {/* Branch Protections rules panel */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 text-left">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Branch Protection Rules
            </h3>
            <p className="text-[10px] text-dark-muted leading-relaxed">
              Define push settings to protect the default branch configuration checks.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={restrictDirectPush}
                  onChange={(e) => setRestrictDirectPush(e.target.checked)}
                  className="mt-0.5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-bold text-gray-200 group-hover:text-purple-300 transition-colors">Lock Direct Push to main</span>
                  <p className="text-[9px] text-dark-muted leading-normal mt-0.5">Blocks direct commits to main. Require PR merging checks instead.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={requirePR}
                  onChange={(e) => setRequirePR(e.target.checked)}
                  className="mt-0.5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div>
                  <span className="text-[11px] font-bold text-gray-200 group-hover:text-purple-300 transition-colors">Require Pull Request reviews</span>
                  <p className="text-[9px] text-dark-muted leading-normal mt-0.5">Requires reviews approvals on PRs before they can merge.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Branch Compare Widget */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <GitMerge className="w-4 h-4 text-purple-400" />
              Compare & Merge Preview
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider mb-1.5">
                  Source Branch (Changes From)
                </label>
                <select
                  value={compareSource}
                  onChange={(e) => {
                    setCompareSource(e.target.value);
                    setCompareResults(null);
                  }}
                  className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-purple-500/40"
                >
                  <option value="">Select branch...</option>
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center py-1">
                <ArrowRight className="w-4 h-4 text-dark-muted rotate-90 lg:rotate-0" />
              </div>

              <div>
                <label className="block text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider mb-1.5">
                  Target Branch (Merge Into)
                </label>
                <select
                  value={compareTarget}
                  onChange={(e) => {
                    setCompareTarget(e.target.value);
                    setCompareResults(null);
                  }}
                  className="w-full bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-purple-500/40"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCompare}
                disabled={!compareSource || isComparing}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {isComparing ? 'Comparing...' : 'Compare Branches'}
              </button>
            </div>

            {/* Compare Results view */}
            <AnimatePresence mode="wait">
              {compareResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="pt-4 border-t border-white/5 space-y-4"
                >
                  {/* Status Indicator */}
                  {compareResults.mergeStatus.status === 'clean' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-2 text-[10px] text-emerald-400">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Able to merge automatically.</strong>
                        <p className="text-[9px] text-dark-muted mt-0.5 font-mono">{compareResults.mergeStatus.description}</p>
                      </div>
                    </div>
                  )}

                  {compareResults.mergeStatus.status === 'conflict' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex flex-col gap-2.5 text-[10px] text-red-400">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />
                        <div className="min-w-0">
                          <strong>Merge Conflicts Detected.</strong>
                          <p className="text-[9px] text-dark-muted mt-1 font-mono">Conflicting Files (Click to Preview Conflict):</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {compareResults.mergeStatus.conflictingFiles?.map(f => {
                          const isExpanded = expandedConflictFile === f;
                          return (
                            <div key={f} className="rounded-lg border border-red-500/20 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setExpandedConflictFile(isExpanded ? null : f)}
                                className="w-full px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 flex items-center justify-between text-[10px] font-mono font-bold"
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <FileCode className="w-3.5 h-3.5 text-red-400" />
                                  {f}
                                </span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              
                              {isExpanded && (
                                <div className="bg-[#05080f] p-2.5 font-mono text-[9px] text-gray-400 leading-normal border-t border-red-500/10 text-left overflow-x-auto whitespace-pre">
                                  <span>{`<<<<<<< ${compareTarget}
// local changes in files
=======
// incoming source changes
>>>>>>> ${compareSource}`}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {compareResults.mergeStatus.status === 'up_to_date' && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl flex items-start gap-2 text-[10px] text-indigo-400">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Up to Date.</strong>
                        <p className="text-[9px] text-dark-muted mt-0.5 font-mono">{compareResults.mergeStatus.message || 'No commits to merge.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Commits list difference */}
                  {compareResults.commits.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider block">
                        Commits Difference ({compareResults.commits.length})
                      </span>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                        {compareResults.commits.map(c => (
                          <div key={c.hash} className="p-2 rounded bg-white/[0.01] border border-white/5 flex items-start justify-between gap-2 text-[10px] font-mono">
                            <div className="min-w-0 text-left">
                              <span className="text-gray-300 font-bold block truncate">{c.message}</span>
                              <span className="text-[8px] text-dark-muted mt-0.5 block">{c.author}</span>
                            </div>
                            <span className="text-[8px] text-purple-400 bg-purple-500/5 px-1 rounded flex-shrink-0">{c.hash.substring(0, 6)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* CREATE BRANCH DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-[#06080e]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel premium-navbar rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4 bg-[#090d16] text-left"
            >
              <div>
                <h3 className="text-md font-bold text-gray-200">Create New Branch</h3>
                <p className="text-xs text-dark-muted mt-0.5">Define branch tracks based off checkpoints.</p>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                    Source Base Branch
                  </label>
                  <select
                    value={sourceBranchName}
                    onChange={(e) => setSourceBranchName(e.target.value)}
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/40 cursor-pointer font-mono"
                  >
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                    New Branch Name
                  </label>
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. feature/auth-helpers"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/40 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewBranchName('');
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Create Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENAME BRANCH DIALOG MODAL */}
      <AnimatePresence>
        {showRenameModal && (
          <div className="fixed inset-0 z-50 bg-[#06080e]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-panel premium-navbar rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4 bg-[#090d16] text-left"
            >
              <div>
                <h3 className="text-md font-bold text-gray-200">Rename Branch</h3>
                <p className="text-xs text-dark-muted mt-0.5">Rename local track branch: <span className="text-purple-300 font-mono">{showRenameModal}</span></p>
              </div>

              <form onSubmit={handleRenameBranch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                    New Branch Name
                  </label>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="e.g. bugfix/login-styles"
                    className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500/40 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenameModal(null);
                      setRenameInput('');
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Rename Track
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
