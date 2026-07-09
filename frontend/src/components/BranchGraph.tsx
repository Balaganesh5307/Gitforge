import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Commit, Branch } from '../types';
import { GitCommit, GitBranch, Calendar, User } from 'lucide-react';

interface BranchGraphProps {
  commits: Commit[];
  branches: Branch[];
  currentBranch: string;
  onCommitSelect?: (commit: Commit) => void;
}

const BRANCH_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#a855f7', // purple
  '#f97316', // orange
];

export const BranchGraph: React.FC<BranchGraphProps> = ({
  commits,
  branches,
  currentBranch,
  onCommitSelect
}) => {
  // 1. Sort commits chronologically (oldest to newest) to lay out from bottom to top,
  // or newest to oldest to lay out from top to bottom.
  // Laying out newest at the top, oldest at the bottom is highly readable.
  const orderedCommits = useMemo(() => {
    return [...commits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [commits]);

  // 2. Map branch names to unique column indices & colors
  const branchMeta = useMemo(() => {
    const meta: Record<string, { col: number; color: string }> = {};
    let colIndex = 0;

    // Default branch (main/master) always gets Column 0
    const defaultBranch = branches.find(b => b.isDefault)?.name || 'main';
    meta[defaultBranch] = { col: 0, color: BRANCH_COLORS[0] };

    branches.forEach(b => {
      if (b.name !== defaultBranch) {
        colIndex++;
        meta[b.name] = {
          col: colIndex,
          color: BRANCH_COLORS[colIndex % BRANCH_COLORS.length]
        };
      }
    });

    // Make sure we have metadata even for branches without explicit Branch models
    commits.forEach(c => {
      if (!(c.branchName in meta)) {
        colIndex++;
        meta[c.branchName] = {
          col: colIndex,
          color: BRANCH_COLORS[colIndex % BRANCH_COLORS.length]
        };
      }
    });

    return meta;
  }, [branches, commits]);

  // Dimensions
  const nodeRadius = 7;
  const colWidth = 36;
  const rowHeight = 60;
  const paddingX = 24;
  const paddingY = 30;

  // 3. Compute (x, y) coordinates for each commit
  const commitCoords = useMemo(() => {
    const coords: Record<string, { x: number; y: number; color: string; col: number }> = {};
    
    orderedCommits.forEach((commit, idx) => {
      const branchInfo = branchMeta[commit.branchName] || { col: 0, color: BRANCH_COLORS[0] };
      coords[commit.hash] = {
        x: paddingX + branchInfo.col * colWidth,
        y: paddingY + idx * rowHeight,
        color: branchInfo.color,
        col: branchInfo.col
      };
    });

    return coords;
  }, [orderedCommits, branchMeta]);

  // Total SVG dimensions
  const svgWidth = Math.max(160, (Object.keys(branchMeta).length) * colWidth + paddingX * 2);
  const svgHeight = Math.max(120, orderedCommits.length * rowHeight + paddingY * 2);

  // 4. Generate SVG connections (paths) between children and parents
  const connections = useMemo(() => {
    const paths: { key: string; d: string; color: string; isMerge: boolean }[] = [];

    orderedCommits.forEach(commit => {
      const currentCoord = commitCoords[commit.hash];
      if (!currentCoord) return;

      commit.parentHashes.forEach((parentHash, pIdx) => {
        const parentCoord = commitCoords[parentHash];
        if (!parentCoord) return; // Parent might not be loaded yet

        const isMerge = commit.parentHashes.length > 1;
        // Use parent branch's color for branching line, and current branch color for direct line
        const pathColor = isMerge && pIdx > 0 ? parentCoord.color : currentCoord.color;

        // Draw a smooth bezier curve from parent (lower down in SVG index, so higher y index)
        // to current commit (higher up in SVG index, so lower y index)
        const x1 = parentCoord.x;
        const y1 = parentCoord.y;
        const x2 = currentCoord.x;
        const y2 = currentCoord.y;

        // S-curve anchors
        const controlY1 = y1 - rowHeight / 2;
        const controlY2 = y2 + rowHeight / 2;
        const d = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;

        paths.push({
          key: `${parentHash}-${commit.hash}`,
          d,
          color: pathColor,
          isMerge: isMerge && pIdx > 0
        });
      });
    });

    return paths;
  }, [orderedCommits, commitCoords]);

  // 5. Gather branch tags to render next to commits
  const branchLabels = useMemo(() => {
    const labels: Record<string, { name: string; isCurrent: boolean; color: string }[]> = {};
    branches.forEach(b => {
      if (b.headCommitHash) {
        if (!labels[b.headCommitHash]) {
          labels[b.headCommitHash] = [];
        }
        labels[b.headCommitHash].push({
          name: b.name,
          isCurrent: b.name === currentBranch,
          color: branchMeta[b.name]?.color || '#ffffff'
        });
      }
    });
    return labels;
  }, [branches, currentBranch, branchMeta]);

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-dark-muted">
        <GitCommit className="w-12 h-12 mb-2 stroke-1 animate-pulse text-purple-500/50" />
        <p className="text-sm">No commits in this repository yet.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto select-none">
      <div className="flex" style={{ minHeight: `${svgHeight}px` }}>
        {/* SVG Graph Columns */}
        <div className="relative flex-shrink-0" style={{ width: `${svgWidth}px` }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              {/* Drop shadow glow filter for active tags */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connections */}
            {connections.map(path => (
              <motion.path
                key={path.key}
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth={path.isMerge ? 2 : 3}
                strokeDasharray={path.isMerge ? "4 4" : "none"}
                opacity={0.65}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </svg>

          {/* Commits Nodes */}
          {orderedCommits.map((commit) => {
            const coord = commitCoords[commit.hash];
            if (!coord) return null;

            const isHead = branches.some(b => b.headCommitHash === commit.hash);
            const headLabels = branchLabels[commit.hash] || [];

            return (
              <div
                key={commit.hash}
                className="absolute"
                style={{
                  left: `${coord.x}px`,
                  top: `${coord.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Visual Circle Node */}
                <motion.button
                  whileHover={{ scale: 1.3 }}
                  onClick={() => onCommitSelect?.(commit)}
                  className="relative flex items-center justify-center w-5 h-5 rounded-full z-20 focus:outline-none"
                  style={{
                    backgroundColor: '#080c14',
                    border: `3.5px solid ${coord.color}`
                  }}
                  title={`Commit ${commit.hash.substring(0, 7)}: ${commit.message}`}
                >
                  {isHead && (
                    <span
                      className="absolute -inset-1 rounded-full animate-ping opacity-40 z-0"
                      style={{ backgroundColor: coord.color }}
                    />
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* Commits Meta Timeline List */}
        <div className="flex-grow pl-2 pr-4 relative">
          {orderedCommits.map((commit, idx) => {
            const coord = commitCoords[commit.hash];
            if (!coord) return null;

            const headLabels = branchLabels[commit.hash] || [];

            return (
              <div
                key={commit.hash}
                className="absolute left-0 right-0 flex items-center justify-between group cursor-pointer hover:bg-white/[0.02] px-3 py-1.5 rounded-lg border border-transparent hover:border-white/[0.04] transition-all"
                style={{
                  top: `${coord.y}px`,
                  transform: 'translateY(-50%)',
                  height: `${rowHeight - 10}px`
                }}
                onClick={() => onCommitSelect?.(commit)}
              >
                {/* Left side: Message & Hash */}
                <div className="flex flex-col min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      {commit.hash.substring(0, 7)}
                    </span>
                    <span className="text-sm font-medium text-gray-200 truncate group-hover:text-purple-400 transition-colors">
                      {commit.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {commit.author === 'you' ? 'You' : commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(commit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="hidden md:inline-block border border-white/5 bg-white/[0.02] px-1 rounded-sm text-[10px]">
                      {commit.branchName}
                    </span>
                  </div>
                </div>

                {/* Right side: Branch Tags */}
                <div className="flex flex-wrap gap-1.5 items-center justify-end max-w-[200px] md:max-w-none">
                  {headLabels.map(lbl => (
                    <div
                      key={lbl.name}
                      className={`flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-full border shadow-sm transition-all ${
                        lbl.isCurrent
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 ring-1 ring-purple-500/20 glow-active'
                          : 'bg-white/[0.02] border-white/10 text-gray-400'
                      }`}
                      style={lbl.isCurrent ? {} : { borderColor: `${lbl.color}40`, color: lbl.color, backgroundColor: `${lbl.color}08` }}
                    >
                      <GitBranch className="w-3 h-3" />
                      {lbl.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
