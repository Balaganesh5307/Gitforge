import React, { useState, useMemo } from 'react';
import { Commit, Branch, Member } from '../types';
import { 
  GitCommit, 
  Search, 
  User as UserIcon, 
  Calendar, 
  FileText, 
  Check, 
  Copy, 
  X, 
  Clock, 
  GitBranch, 
  Plus, 
  Minus,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BranchGraph } from '../components/BranchGraph';

interface CommitsPageProps {
  commits: Commit[];
  branches: Branch[];
  currentBranchName: string;
  members: Member[];
  onSelectPage: (page: string) => void;
}

export const CommitsPage: React.FC<CommitsPageProps> = ({
  commits,
  branches,
  currentBranchName,
  members,
  onSelectPage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(currentBranchName);
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  // Selected commit for the detail modal
  const [activeCommit, setActiveCommit] = useState<Commit | null>(null);

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // 1. Get reachable commits for the selected filter branch
  const branchCommits = useMemo(() => {
    const branch = branches.find(b => b.name === selectedBranch);
    if (!branch) return commits;

    const commitsMap = new Map<string, Commit>();
    commits.forEach(c => commitsMap.set(c.hash, c));

    const result: Commit[] = [];
    const visited = new Set<string>();
    const queue = [branch.headCommitHash];

    while (queue.length > 0) {
      const hash = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);

      const commit = commitsMap.get(hash);
      if (commit) {
        result.push(commit);
        queue.push(...commit.parentHashes);
      }
    }
    return result;
  }, [commits, branches, selectedBranch]);

  // 2. Apply author and text query filtering
  const filteredCommits = useMemo(() => {
    return branchCommits.filter(c => {
      const matchesSearch = c.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.hash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAuthor = selectedAuthor === 'all' || 
                            c.author === selectedAuthor || 
                            (selectedAuthor === 'you' && c.author === 'you');
      return matchesSearch && matchesAuthor;
    });
  }, [branchCommits, searchQuery, selectedAuthor]);

  // 3. Group commits by date for standard GitHub display
  const groupedCommits = useMemo(() => {
    const groups: Record<string, Commit[]> = {};
    filteredCommits.forEach(c => {
      const date = new Date(c.timestamp).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(c);
    });
    return groups;
  }, [filteredCommits]);

  // Resolve author avatar helper
  const getAuthorAvatar = (authorName: string) => {
    const member = members.find(m => m.username === authorName || (authorName === 'you' && m.id === 'you'));
    return member?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${authorName}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between text-left">
        
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-dark-muted" />
          <input
            type="text"
            placeholder="Search commits by message or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#05080f] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Branch filter */}
          <div className="flex items-center gap-1.5 bg-[#05080f] border border-white/5 px-3 py-1.5 rounded-xl flex-1 md:flex-initial">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer text-gray-200"
            >
              {branches.map(b => (
                <option key={b.name} value={b.name} className="bg-[#080d16] text-gray-200 font-bold">{b.name}</option>
              ))}
            </select>
          </div>

          {/* Author filter */}
          <div className="flex items-center gap-1.5 bg-[#05080f] border border-white/5 px-3 py-1.5 rounded-xl flex-1 md:flex-initial">
            <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer text-gray-200"
            >
              <option value="all" className="bg-[#080d16] text-gray-200">All Authors</option>
              <option value="you" className="bg-[#080d16] text-gray-200">You (Owner)</option>
              {members.filter(m => m.role === 'bot').map(m => (
                <option key={m.id} value={m.username} className="bg-[#080d16] text-gray-200">{m.username}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Grid: Graph on top, list below or split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Left Side: Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel p-5 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="border-b border-white/5 pb-4">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-purple-400" />
                Commit History Timeline
              </h3>
            </div>

            <div className="space-y-6 relative border-l border-white/5 pl-4 ml-3.5">
              
              {Object.entries(groupedCommits).map(([date, commitList]) => (
                <div key={date} className="space-y-3 relative">
                  
                  {/* Date Header Indicator */}
                  <div className="flex items-center gap-2 -ml-[23px] bg-[#060a12] py-1 text-xs font-semibold text-dark-muted font-mono tracking-wide">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500/20 border border-purple-500/35 flex-shrink-0" />
                    <span>{date}</span>
                  </div>

                  {/* Date Commit Cards */}
                  <div className="space-y-3">
                    {commitList.map(commit => {
                      const avatar = getAuthorAvatar(commit.author);
                      return (
                        <motion.div
                          key={commit.hash}
                          whileHover={{ scale: 1.01, x: 2 }}
                          onClick={() => setActiveCommit(commit)}
                          className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4 cursor-pointer hover:border-purple-500/20 hover:bg-white/[0.01] transition-all text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={avatar}
                              alt={commit.author}
                              className="w-8 h-8 rounded-full border border-white/5 bg-slate-900 flex-shrink-0"
                            />
                            
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-200 hover:text-purple-300 transition-colors block truncate">
                                {commit.message}
                              </span>
                              <span className="text-[10px] text-dark-muted font-mono mt-1 block">
                                <strong className="text-gray-300 font-semibold">{commit.author === 'you' ? 'You' : commit.author}</strong> committed {new Date(commit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[10px] select-none">
                            <span className="hidden sm:inline-flex items-center gap-1 text-dark-muted bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              <FileText className="w-3 h-3" /> {commit.filesChanged.length} files
                            </span>
                            
                            <button
                              onClick={(e) => handleCopyHash(commit.hash, e)}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded border border-white/10 flex items-center gap-1 transition-all"
                            >
                              <span>{commit.hash.substring(0, 7)}</span>
                              {copiedHash === commit.hash ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                </div>
              ))}

              {filteredCommits.length === 0 && (
                <div className="text-center text-xs text-dark-muted font-mono py-12">No commits match search settings.</div>
              )}

            </div>
          </div>

        </div>

        {/* Right Side: Graph view & details */}
        <div className="space-y-6">
          
          {/* Commit graph */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-purple-400" />
              Branch Graph Connection
            </h3>
            
            <BranchGraph
              commits={commits}
              branches={branches}
              currentBranch={selectedBranch}
              onCommitSelect={(commit) => setActiveCommit(commit)}
            />
          </div>

        </div>

      </div>

      {/* COMMIT DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {activeCommit && (
          <div className="fixed inset-0 z-50 bg-[#06080e]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl glass-panel premium-navbar rounded-2xl border border-white/10 shadow-2xl bg-[#090d16] flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-mono font-bold text-gray-200">Commit Details</span>
                </div>
                <button
                  onClick={() => setActiveCommit(null)}
                  className="p-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-300">
                
                {/* Author Info */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                  <img
                    src={getAuthorAvatar(activeCommit.author)}
                    alt={activeCommit.author}
                    className="w-10 h-10 rounded-full border border-white/5 bg-slate-900"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {activeCommit.author === 'you' ? 'You (Owner)' : activeCommit.author}
                    </h4>
                    <span className="text-[10px] text-dark-muted font-mono block mt-0.5">
                      committed on {new Date(activeCommit.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Commit Msg */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider block">Message</span>
                  <div className="p-3 bg-[#05080f] rounded-xl border border-white/5 font-mono text-gray-200 leading-normal">
                    {activeCommit.message}
                  </div>
                </div>

                {/* Parent Checkpoints */}
                <div className="grid grid-cols-2 gap-3.5 font-mono text-[9px]">
                  <div>
                    <span className="text-dark-muted uppercase font-bold tracking-wider block mb-1">Commit Hash</span>
                    <span className="bg-white/5 border border-white/5 text-purple-300 px-2 py-1 rounded block select-all">
                      {activeCommit.hash}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-muted uppercase font-bold tracking-wider block mb-1">Parent Hash</span>
                    <span className="bg-white/5 border border-white/5 text-gray-400 px-2 py-1 rounded block select-all">
                      {activeCommit.parentHashes.join(', ') || 'none (root)'}
                    </span>
                  </div>
                </div>

                {/* Files Changed & Mock Diffs */}
                <div className="space-y-3">
                  <span className="text-[9px] font-bold font-mono text-dark-muted uppercase tracking-wider block">
                    Files Changed ({activeCommit.filesChanged.length})
                  </span>
                  
                  <div className="space-y-2.5">
                    {activeCommit.filesChanged.map((file, idx) => (
                      <div key={idx} className="rounded-xl border border-white/5 overflow-hidden">
                        
                        {/* File header banner */}
                        <div className="bg-[#080d16]/80 px-3.5 py-2 flex items-center justify-between text-[10px] font-mono text-dark-muted border-b border-white/5">
                          <span className="flex items-center gap-1.5 font-bold text-gray-200">
                            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                            {file.filename}
                          </span>
                          <span className="bg-purple-500/10 px-1.5 rounded text-[8px] font-bold uppercase text-purple-400">
                            {file.additions} additions
                          </span>
                        </div>

                        {/* Visual mockup code diff changes */}
                        <div className="bg-[#05080f] p-3 font-mono text-[9px] text-gray-400 leading-relaxed overflow-x-auto whitespace-pre space-y-0.5 text-left select-none">
                          <div className="text-dark-muted font-bold pb-1">// Diff preview generated in simulator</div>
                          <div className="flex items-center text-red-400/80 bg-red-950/10 px-2 rounded">
                            <Minus className="w-3 h-3 flex-shrink-0 text-red-500 mr-1" />
                            <span>{`- const oldConfig = loadOldParameters();`}</span>
                          </div>
                          <div className="flex items-center text-emerald-400/80 bg-emerald-950/10 px-2 rounded">
                            <Plus className="w-3 h-3 flex-shrink-0 text-emerald-500 mr-1" />
                            <span>{`+ const newConfig = loadAuthSessionTokenDetails();`}</span>
                          </div>
                          <div className="px-2">{`  return processEngine(newConfig);`}</div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-white/5 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setActiveCommit(null)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Close Details
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
