import React, { useMemo } from 'react';
import { Commit, Branch, PullRequest, Issue, Activity, Member } from '../types';
import {
  GitCommit,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  Users,
  Activity as ActivityIcon,
  Heart,
  Bot,
  Plus,
  Flame,
  Database,
  GitMerge
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
  repoId: string;
  repoName: string;
  repoDesc: string;
  commits: Commit[];
  branches: Branch[];
  prs: PullRequest[];
  issues: Issue[];
  activities: Activity[];
  members: Member[];
  repositories: any[];
  onTriggerBotAction: (type: 'commit' | 'issue' | 'conflict') => void;
  onSelectPage: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  repoId,
  repoName,
  repoDesc,
  commits,
  branches,
  prs,
  issues,
  activities,
  members,
  repositories,
  onTriggerBotAction,
  onSelectPage
}) => {
  // Widget calculations
  const activeBranchesCount = branches.length;
  const openPrsCount = prs.filter(p => p.status === 'open').length;
  const closedPrsCount = prs.filter(p => p.status === 'merged' || p.status === 'closed').length;
  const openIssuesCount = issues.filter(i => i.status !== 'done').length;

  // Calculate Repository Health %
  const repoHealth = useMemo(() => {
    let health = 100;
    const unresolvedIssues = issues.filter(i => i.status !== 'done' && i.priority === 'high').length;
    const unresolvedPRConflicts = prs.filter(p => p.status === 'open' && p.comments.some(c => c.body.toLowerCase().includes('conflict'))).length;
    
    health -= unresolvedIssues * 8;
    health -= unresolvedPRConflicts * 15;
    return Math.max(30, Math.min(100, health));
  }, [issues, prs]);

  // Weekly commit activity data (last 7 days)
  const chartData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const commitCounts: Record<string, number> = {};
    dates.forEach(d => { commitCounts[d] = 0; });

    commits.forEach(c => {
      const commitDate = c.timestamp.split('T')[0];
      if (commitDate in commitCounts) {
        commitCounts[commitDate]++;
      }
    });

    return dates.map(date => {
      const dayName = new Date(date).toLocaleDateString([], { weekday: 'short' });
      return {
        name: dayName,
        commits: commitCounts[date]
      };
    });
  }, [commits]);

  // Heatmap data (Last 6 months)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const cells: { dateStr: string; count: number; dayOfWeek: number }[] = [];

    for (let i = 120; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const count = commits.filter(c => c.timestamp.split('T')[0] === dateStr).length;
      cells.push({
        dateStr,
        count,
        dayOfWeek: d.getDay()
      });
    }

    return cells;
  }, [commits]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-[#161b22] hover:bg-[#21262d]';
    if (count === 1) return 'bg-emerald-950 text-emerald-300 border border-emerald-900/30';
    if (count === 2) return 'bg-emerald-800 text-emerald-200 border border-emerald-700/30';
    if (count === 3) return 'bg-emerald-600 text-emerald-100 border border-emerald-500/30';
    return 'bg-emerald-400 text-emerald-950 border border-emerald-300/30 glow-active';
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/10 blur-[60px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px]" />

        <div className="z-10 min-w-0 text-left">
          <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-200 to-blue-400">
            {repoName}
          </h1>
          <p className="text-sm text-dark-muted mt-1 max-w-2xl truncate">
            {repoDesc}
          </p>
        </div>

        <button
          onClick={() => onSelectPage('branches')}
          className="flex-shrink-0 z-10 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-glow flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <GitBranch className="w-4 h-4" />
          Manage Code
        </button>
      </div>

      {/* Grid of widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Repositories */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-indigo-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Total Repositories</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{repositories.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Active Branches */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-amber-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Active Branches</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{activeBranchesCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <GitBranch className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Open Pull Requests */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-emerald-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Open PRs</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{openPrsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <GitPullRequest className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Closed Pull Requests */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-purple-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Closed PRs</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{closedPrsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <GitMerge className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Open Issues */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-red-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Open Issues</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{openIssuesCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Contributors */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all hover:border-blue-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Contributors</span>
            <h3 className="text-2xl font-black mt-1.5 text-gray-100">{members.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Repository Health (Spans 2 columns) */}
        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between col-span-1 sm:col-span-2 transition-all hover:border-rose-500/20"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider block font-mono">Repository Health</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-black text-rose-400 flex items-center gap-1.5">
                {repoHealth}%
              </h3>
              <span className="text-[10px] text-dark-muted font-medium font-mono">
                {openIssuesCount === 0 ? 'Healthy codebase' : `${openIssuesCount} unresolved warnings`}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 relative">
            <Heart className="w-5 h-5 animate-pulse" />
          </div>
        </motion.div>

      </div>

      {/* Middle Layout (Charts, Simulation Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Weekly Activity Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <ActivityIcon className="w-4 h-4 text-indigo-400" />
              Weekly Activity
            </h3>
            <span className="text-xs text-dark-muted font-mono">Last 7 Days</span>
          </div>

          <div className="flex-grow min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#a78bfa' }}
                />
                <Area type="monotone" dataKey="commits" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCommits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Simulation Control Room */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between text-left">
          <div>
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Bot className="w-4.5 h-4.5 text-purple-400" />
              Simulation Control Room
            </h3>
            <p className="text-xs text-dark-muted leading-relaxed">
              Use these triggers to simulate collaborator activities like adding features, checking code, or creating conflicts.
            </p>
          </div>

          <div className="space-y-2.5 my-4">
            <button
              onClick={() => onTriggerBotAction('commit')}
              className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 text-gray-300 hover:text-purple-300 flex items-center justify-between text-xs font-semibold transition-all group"
            >
              <span className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                Trigger Bot Push Commit
              </span>
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onTriggerBotAction('issue')}
              className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-gray-300 hover:text-indigo-300 flex items-center justify-between text-xs font-semibold transition-all group"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                Trigger Bot Open Issue
              </span>
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onTriggerBotAction('conflict')}
              className="w-full p-3 rounded-xl bg-white/[0.02] border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 text-gray-300 hover:text-red-400 flex items-center justify-between text-xs font-semibold transition-all group"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 group-hover:animate-shake" />
                Trigger Conflict Scenario
              </span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-dark-muted font-mono">
            <span>Collaborator Bots:</span>
            <div className="flex gap-1">
              {members.filter(m => m.role === 'bot').map(m => (
                <img
                  key={m.id}
                  src={m.avatarUrl}
                  alt={m.username}
                  className="w-5 h-5 rounded-full bg-slate-800 border border-white/10"
                  title={m.username}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Commit Heatmap Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 text-left">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 mb-4">
          <Flame className="w-4 h-4 text-emerald-400" />
          Commit Heatmap
        </h3>

        <div className="overflow-x-auto">
          <div className="flex flex-wrap gap-1.5 min-w-[650px] p-1">
            {heatmapData.map((cell, idx) => (
              <div
                key={cell.dateStr}
                className={`w-3.5 h-3.5 rounded-sm transition-colors ${getHeatmapColor(cell.count)}`}
                title={`${cell.count} commits on ${new Date(cell.dateStr).toLocaleDateString()}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-dark-muted font-mono">
          <span>Commit Contribution Activity Timeline</span>
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-[#161b22]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-950" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-800" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-600" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-400" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Bottom Layout (Activity Feed, Team List) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Activity Feed */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[320px] text-left">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4">
            Recent Event Activity Feed
          </h3>

          <div className="flex-grow overflow-y-auto pr-1 space-y-3">
            {activities.slice(0, 15).map((act) => {
              const formattedTime = new Date(act.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
                ' ' + new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={act.id} className="flex items-start justify-between text-xs p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <div className="flex gap-2.5 items-center">
                    <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${
                      act.type === 'commit'
                        ? 'bg-purple-500'
                        : act.type.startsWith('pr_')
                        ? 'bg-emerald-500'
                        : 'bg-indigo-400'
                    }`} />
                    <span className="text-gray-300 font-mono">
                      <strong className="text-gray-200">{act.user === 'you' ? 'You' : act.user}</strong> {act.message}
                    </span>
                  </div>
                  <span className="text-[10px] text-dark-muted font-mono flex-shrink-0 ml-4">{formattedTime}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contributors List */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[320px] text-left">
          <div className="flex items-center gap-1.5 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
              Project Contributors
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto space-y-3">
            {members.map((member) => {
              const commitCount = commits.filter(c => c.author === member.username || (member.id === 'you' && c.author === 'you')).length;
              return (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={member.avatarUrl} alt={member.username} className="w-8 h-8 rounded-full border border-white/5 bg-slate-900" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-200">{member.username === 'you' ? 'You (Owner)' : member.username}</h4>
                      <span className="text-[10px] text-dark-muted capitalize font-mono">{member.role}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                    {commitCount} Commits
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
