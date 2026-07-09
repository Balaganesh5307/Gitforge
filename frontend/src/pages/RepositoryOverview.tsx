import React, { useMemo } from 'react';
import { Commit, Branch, PullRequest, Issue, Activity, Member } from '../types';
import { 
  Folder, 
  FileText, 
  GitBranch, 
  GitCommit, 
  Users, 
  Rocket, 
  Tag, 
  BookOpen, 
  Code,
  FolderOpen,
  ArrowRight,
  Database,
  Star,
  Eye,
  GitFork,
  AlertCircle,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RepositoryOverviewProps {
  repoId: string;
  repoName: string;
  repoDesc: string;
  commits: Commit[];
  branches: Branch[];
  currentBranchName: string;
  onCheckoutBranch: (branchName: string) => void;
  activities: Activity[];
  members: Member[];
  prs: PullRequest[];
  issues: Issue[];
  onSelectPage: (page: string) => void;
}

export const RepositoryOverview: React.FC<RepositoryOverviewProps> = ({
  repoId,
  repoName,
  repoDesc,
  commits,
  branches,
  currentBranchName,
  onCheckoutBranch,
  activities,
  members,
  prs,
  issues,
  onSelectPage
}) => {
  
  // Calculate stats based on active commits/branches
  const activeBranchCommits = useMemo(() => {
    // Filter commits reachable on current checked out branch
    const branch = branches.find(b => b.name === currentBranchName);
    if (!branch) return commits;
    
    const commitsMap = new Map<string, Commit>();
    commits.forEach(c => commitsMap.set(c.hash, c));

    const result: Commit[] = [];
    const visited = new Set<string>();
    const queue = [branch.headCommitHash];

    while (queue.length > 0) {
      const currentHash = queue.shift()!;
      if (visited.has(currentHash)) continue;
      visited.add(currentHash);

      const commit = commitsMap.get(currentHash);
      if (commit) {
        result.push(commit);
        queue.push(...commit.parentHashes);
      }
    }
    return result;
  }, [commits, branches, currentBranchName]);

  const latestCommit = useMemo(() => {
    return activeBranchCommits[0] || null;
  }, [activeBranchCommits]);

  // Extract simulated files list from commits
  const mockFiles = [
    { name: 'backend', isFolder: true, size: '--', lastCommit: 'feat: setup express routes', date: '2 days ago' },
    { name: 'frontend', isFolder: true, size: '--', lastCommit: 'style: design repository dashboard', date: '3 days ago' },
    { name: '.gitignore', isFolder: false, size: '230 B', lastCommit: 'first commit', date: '7 days ago' },
    { name: 'package.json', isFolder: false, size: '1.2 KB', lastCommit: 'build: update scripts configurations', date: '4 hours ago' },
    { name: 'README.md', isFolder: false, size: '4.5 KB', lastCommit: 'docs: update repository readme guides', date: '10 mins ago' },
    { name: 'tsconfig.json', isFolder: false, size: '420 B', lastCommit: 'first commit', date: '7 days ago' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Repository Header Details */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden text-left">
        <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-purple-600/10 blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 rounded-full bg-indigo-600/10 blur-[70px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <FolderOpen className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                {repoName}
              </h1>
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-[9px] font-bold font-mono tracking-wide uppercase">
                public
              </span>
            </div>
            <p className="text-xs md:text-sm text-dark-muted mt-2 max-w-2xl leading-relaxed">
              {repoDesc}
            </p>
          </div>

          {/* Social Stars & Forks Mockup */}
          <div className="flex items-center gap-2 select-none">
            <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono text-gray-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Stars 12
            </span>
            <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono text-gray-300">
              <GitFork className="w-3.5 h-3.5 text-purple-400" /> Forks 4
            </span>
            <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono text-gray-300">
              <Eye className="w-3.5 h-3.5 text-indigo-400" /> Watching 3
            </span>
          </div>
        </div>

        {/* Dynamic Animated Statistics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-white/5 pt-6">
          {[
            { label: 'Commits', value: activeBranchCommits.length, icon: GitCommit, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { label: 'Branches', value: branches.length, icon: GitBranch, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: 'Open PRs', value: prs.filter(p => p.status === 'open').length, icon: GitCommit, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Issues', value: issues.filter(i => i.status !== 'done').length, icon: AlertCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20' }
          ].map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02, y: -1 }}
                className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex items-center justify-between select-none"
              >
                <div>
                  <span className="text-[10px] text-dark-muted font-bold font-mono uppercase tracking-wider block">{stat.label}</span>
                  <h3 className="text-xl font-extrabold mt-1 text-gray-200">{stat.value}</h3>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.color}`}>
                  <StatIcon className="w-4.5 h-4.5" />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Action Bar (Branch Selector & Latest Commit Message) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-dark-muted">Active Branch:</span>
          <select
            value={currentBranchName}
            onChange={(e) => onCheckoutBranch(e.target.value)}
            className="bg-[#0b0f19] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-purple-300 font-semibold focus:outline-none focus:border-purple-500/40 cursor-pointer"
          >
            {branches.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Latest Commit Details Banner */}
        {latestCommit && (
          <div className="flex-1 md:max-w-md bg-white/[0.01] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-gray-300">
            <div className="min-w-0">
              <span className="text-purple-400 font-bold block truncate">
                {latestCommit.author === 'you' ? 'You' : latestCommit.author}: {latestCommit.message}
              </span>
              <span className="text-[10px] text-dark-muted mt-0.5 block">
                {new Date(latestCommit.timestamp).toLocaleString()}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-gray-400 select-all ml-4">
              {latestCommit.hash.substring(0, 8)}
            </span>
          </div>
        )}
      </div>

      {/* Split Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* LEFT COLUMN: File tree & README preview (65%) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* File Explorer list */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="bg-[#080d16]/70 border-b border-white/5 px-4 py-3 flex items-center justify-between text-xs font-mono text-dark-muted font-bold select-none">
              <span>File Explorer</span>
              <span>Reconstructed Tree</span>
            </div>
            
            <div className="divide-y divide-white/5 font-mono text-xs">
              {mockFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.01] transition-all">
                  <div className="flex items-center gap-3">
                    {file.isFolder ? (
                      <Folder className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-purple-400" />
                    )}
                    <span className={`font-semibold cursor-pointer ${file.isFolder ? 'text-indigo-300 hover:text-indigo-200' : 'text-purple-300 hover:text-purple-200'}`}>
                      {file.name}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-dark-muted">
                    <span className="truncate max-w-[200px]" title={file.lastCommit}>{file.lastCommit}</span>
                    <span className="w-16 text-right">{file.size}</span>
                    <span className="w-24 text-right">{file.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* README rendered markdown preview */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="bg-[#080d16]/70 border-b border-white/5 px-4 py-3.5 flex items-center gap-2 text-xs font-mono text-dark-muted font-bold select-none">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>README.md</span>
            </div>

            {/* Readme styled wrapper */}
            <div className="p-6 md:p-8 space-y-6 text-gray-300 text-sm leading-relaxed">
              
              <div className="border-b border-white/5 pb-4">
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Bot className="w-7 h-7 text-purple-400" /> GitForge Collab Simulator
                </h1>
                <p className="text-xs text-dark-muted mt-2">
                  Interactive developer visual workspace to practice Git branch merges, conflict resolutions, and review workflows.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-1.5 font-mono">
                  <Code className="w-4.5 h-4.5 text-indigo-400" /> Key Features
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-dark-muted">
                  <li><strong>Live SVG Commit Graph</strong>: Connect commits and track checkout branch nodes with animated bezier hooks.</li>
                  <li><strong>Bash Terminal Simulator</strong>: Execute standard commands like git commit, git checkout, or git merge in a sandbox.</li>
                  <li><strong>Bot Collaborators Network</strong>: Trigger AI workers to push commits, approve PRs, or inject merge conflict files.</li>
                  <li><strong>Split-Screen Resolvers</strong>: Resolve line overlaps (Accept Current vs Accept Incoming) directly inside a visual code editor.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-100 flex items-center gap-1.5 font-mono">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-400" /> Quick-Start Guide
                </h3>
                <div className="bg-[#05080f] border border-white/5 rounded-xl p-4 font-mono text-xs text-purple-300 space-y-1 block">
                  <div># 1. Create a workspace branch</div>
                  <div className="text-gray-400">$ git checkout -b feature/auth</div>
                  <div className="pt-2"># 2. Stage changes and commit changes</div>
                  <div className="text-gray-400">$ git commit -m "feat: add jwt login logic"</div>
                  <div className="pt-2"># 3. Merge branches together</div>
                  <div className="text-gray-400">$ git merge main</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar info (About, Contributors, Releases) (35%) */}
        <div className="space-y-6">
          
          {/* About section */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">About</h3>
            <p className="text-xs text-dark-muted leading-relaxed">
              {repoDesc}
            </p>
            <div className="pt-2 space-y-2 text-xs font-mono text-dark-muted">
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="text-gray-300">July 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span>License:</span>
                <span className="text-gray-300">MIT</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Repository size:</span>
                <span className="text-gray-300">12.5 MB</span>
              </div>
            </div>
          </div>

          {/* Contributors section */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Contributors</h3>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded font-bold font-mono">
                {members.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {members.map((member) => {
                const commitCount = commits.filter(c => c.author === member.username || (member.id === 'you' && c.author === 'you')).length;
                return (
                  <div key={member.id} className="flex items-center justify-between p-1 rounded-xl hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <img src={member.avatarUrl} alt={member.username} className="w-7.5 h-7.5 rounded-full border border-white/5 bg-slate-900" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-200">{member.username === 'you' ? 'You' : member.username}</h4>
                        <span className="text-[9px] text-dark-muted capitalize font-mono">{member.role}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400">{commitCount} commits</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Releases section */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Releases</h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold font-mono">Latest</span>
            </div>

            <div className="text-left font-mono space-y-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-gray-200">v1.0.0 Stable</span>
              </div>
              <p className="text-[11px] text-dark-muted leading-relaxed pl-6">
                Stable release introducing concurrent server runs, SVG branching visualizations, and automated PR review bots.
              </p>
              <div
                onClick={() => onSelectPage('releases')}
                className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors pl-6 pt-1 font-sans"
              >
                View all releases <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Tags section */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'v1.0.0', color: 'bg-purple-500/5 text-purple-400 border-purple-500/10' },
                { name: 'v0.9.0-beta', color: 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10' },
                { name: 'v0.5.0-alpha', color: 'bg-gray-500/5 text-gray-400 border-gray-500/10' }
              ].map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 font-bold ${tag.color}`}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
