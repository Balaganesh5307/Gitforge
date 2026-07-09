import React, { useMemo } from 'react';
import { Commit, Branch, PullRequest, Issue, Member } from '../types';
import { BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart2, PieChart as PieIcon, LineChart as LineIcon, Info } from 'lucide-react';

interface InsightsProps {
  commits: Commit[];
  branches: Branch[];
  prs: PullRequest[];
  issues: Issue[];
  members: Member[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export const Insights: React.FC<InsightsProps> = ({
  commits,
  branches,
  prs,
  issues,
  members
}) => {
  // Chart 1: Commits per Branch
  const commitsPerBranchData = useMemo(() => {
    const counts: Record<string, number> = {};
    branches.forEach(b => { counts[b.name] = 0; });
    
    commits.forEach(c => {
      if (c.branchName in counts) {
        counts[c.branchName]++;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name: name.length > 15 ? name.substring(0, 12) + '...' : name,
      commits: count
    }));
  }, [commits, branches]);

  // Chart 2: Issues status breakdown
  const issueStatusData = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    issues.forEach(i => {
      if (i.status in counts) {
        counts[i.status]++;
      }
    });

    return [
      { name: 'To Do', value: counts.todo, color: '#3b82f6' },
      { name: 'In Progress', value: counts.in_progress, color: '#f59e0b' },
      { name: 'Review', value: counts.review, color: '#8b5cf6' },
      { name: 'Done', value: counts.done, color: '#10b981' }
    ].filter(item => item.value > 0);
  }, [issues]);

  // Chart 3: Contributions per member
  const memberContributionsData = useMemo(() => {
    return members.map(m => {
      const commitCount = commits.filter(c => c.author === m.username || (m.id === 'you' && c.author === 'you')).length;
      return {
        name: m.username === 'you' ? 'you' : m.username,
        commits: commitCount
      };
    }).sort((a, b) => b.commits - a.commits);
  }, [commits, members]);

  // Chart 4: Simulated PR Cycle Time (days to merge)
  const prCycleTimeData = useMemo(() => {
    const mergedPRs = prs.filter(p => p.status === 'merged' && p.mergedAt);
    return mergedPRs.map((pr, idx) => {
      const openTime = new Date(pr.createdAt).getTime();
      const closeTime = new Date(pr.mergedAt!).getTime();
      const diffHours = Math.max(2, Math.round((closeTime - openTime) / (1000 * 60 * 60)));
      
      return {
        name: `PR #${pr.id.replace('pr-', '')}`,
        hours: diffHours
      };
    });
  }, [prs]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-100 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-purple-400" />
          Repository Insights & Analytics
        </h1>
        <p className="text-xs text-dark-muted font-mono mt-0.5">
          Real-time metrics visualizer reflecting simulator states.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Commits per branch */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[280px]">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            Commits Per Branch
          </h3>
          <div className="flex-grow min-h-0 w-full">
            {commitsPerBranchData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-dark-muted font-mono">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitsPerBranchData} margin={{ left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                    labelStyle={{ color: '#9ca3af', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Issue status ratio */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[280px]">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            Issue Status Ratio
          </h3>
          <div className="flex-grow min-h-0 w-full flex items-center justify-center">
            {issueStatusData.length === 0 ? (
              <div className="text-xs text-dark-muted font-mono">No data</div>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="w-1/2 h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={issueStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {issueStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 text-xs">
                  {issueStatusData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300 font-medium">{item.name}:</span>
                      <span className="text-dark-muted font-mono font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contributor Profile */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[280px]">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            Contributor Activity Profiles
          </h3>
          <div className="flex-grow min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberContributionsData} layout="vertical" margin={{ left: -15, right: 10 }}>
                <XAxis type="number" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                />
                <Bar dataKey="commits" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {memberContributionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PR cycle lead times */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col h-[280px]">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <LineIcon className="w-4 h-4 text-blue-400" />
            Pull Request Merge Duration
          </h3>
          <div className="flex-grow min-h-0 w-full">
            {prCycleTimeData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-dark-muted font-mono text-center p-4">
                <Info className="w-6 h-6 text-gray-600 mb-1" />
                No merged PRs. Merge a pull request to populate cycle times.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prCycleTimeData} margin={{ left: -20, right: 10 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
