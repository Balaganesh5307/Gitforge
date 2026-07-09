import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Code, ArrowRight, ShieldCheck } from 'lucide-react';

interface ConflictingFile {
  filename: string;
  ourContent: string;
  theirContent: string;
  mergedMarkerContent: string;
}

interface MergeConflictVisualizerProps {
  conflictingFiles: ConflictingFile[];
  sourceBranch: string;
  targetBranch: string;
  onResolve: (resolvedFiles: { filename: string; content: string }[]) => void;
  onCancel: () => void;
}

interface ConflictBlock {
  id: string;
  type: 'normal' | 'conflict';
  content: string; // Used for normal blocks
  ourContent?: string; // Used for conflict blocks
  theirContent?: string; // Used for conflict blocks
  resolution?: 'our' | 'their' | 'both' | null;
}

export const MergeConflictVisualizer: React.FC<MergeConflictVisualizerProps> = ({
  conflictingFiles,
  sourceBranch,
  targetBranch,
  onResolve,
  onCancel
}) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [fileBlocksMap, setFileBlocksMap] = useState<Record<string, ConflictBlock[]>>({});

  const activeFile = conflictingFiles[selectedFileIdx];

  // Parse files into resolution blocks when files load
  useEffect(() => {
    const newMap: Record<string, ConflictBlock[]> = {};

    conflictingFiles.forEach(file => {
      newMap[file.filename] = parseConflictMarkers(file.mergedMarkerContent);
    });

    setFileBlocksMap(newMap);
  }, [conflictingFiles]);

  // Parser helper
  const parseConflictMarkers = (content: string): ConflictBlock[] => {
    const lines = content.split('\n');
    const blocks: ConflictBlock[] = [];
    let currentNormalLines: string[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        // Push any accumulated normal lines first
        if (currentNormalLines.length > 0) {
          blocks.push({
            id: 'block-' + Math.random().toString(36).substr(2, 9),
            type: 'normal',
            content: currentNormalLines.join('\n')
          });
          currentNormalLines = [];
        }

        // Parse conflict block
        const ourLines: string[] = [];
        const theirLines: string[] = [];
        
        i++; // skip <<<<<<< line
        
        // Accumulate our side
        while (i < lines.length && !lines[i].startsWith('=======')) {
          ourLines.push(lines[i]);
          i++;
        }
        
        i++; // skip ======= line
        
        // Accumulate their side
        while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
          theirLines.push(lines[i]);
          i++;
        }
        
        i++; // skip >>>>>>> line

        blocks.push({
          id: 'block-' + Math.random().toString(36).substr(2, 9),
          type: 'conflict',
          content: '',
          ourContent: ourLines.join('\n'),
          theirContent: theirLines.join('\n'),
          resolution: null
        });
      } else {
        currentNormalLines.push(line);
        i++;
      }
    }

    if (currentNormalLines.length > 0) {
      blocks.push({
        id: 'block-' + Math.random().toString(36).substr(2, 9),
        type: 'normal',
        content: currentNormalLines.join('\n')
      });
    }

    return blocks;
  };

  // Set resolution for a specific block in the active file
  const resolveBlock = (blockId: string, choice: 'our' | 'their' | 'both') => {
    if (!activeFile) return;
    
    setFileBlocksMap(prev => {
      const blocks = prev[activeFile.filename] || [];
      const updated = blocks.map(b => b.id === blockId ? { ...b, resolution: choice } : b);
      return { ...prev, [activeFile.filename]: updated };
    });
  };

  // Check if all conflict blocks are resolved across all files
  const isAllResolved = () => {
    for (const file of conflictingFiles) {
      const blocks = fileBlocksMap[file.filename] || [];
      const hasUnresolved = blocks.some(b => b.type === 'conflict' && b.resolution === null);
      if (hasUnresolved) return false;
    }
    return true;
  };

  // Compile final clean code content based on resolutions
  const compileResolvedContent = (filename: string): string => {
    const blocks = fileBlocksMap[filename] || [];
    return blocks.map(b => {
      if (b.type === 'normal') {
        return b.content;
      }
      // Resolved block
      if (b.resolution === 'our') return b.ourContent || '';
      if (b.resolution === 'their') return b.theirContent || '';
      if (b.resolution === 'both') return `${b.ourContent}\n${b.theirContent}`;
      return '';
    }).join('\n');
  };

  const handleCompleteMerge = () => {
    if (!isAllResolved()) return;

    const resolutions = conflictingFiles.map(file => ({
      filename: file.filename,
      content: compileResolvedContent(file.filename)
    }));

    onResolve(resolutions);
  };

  const activeBlocks = fileBlocksMap[activeFile?.filename] || [];
  const totalConflictsInActive = activeBlocks.filter(b => b.type === 'conflict').length;
  const resolvedConflictsInActive = activeBlocks.filter(b => b.type === 'conflict' && b.resolution !== null).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e]/95 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden grid-bg select-none">
      <div className="w-full max-w-6xl glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-red-500/[0.02] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Resolve Merge Conflicts
              </h2>
              <p className="text-xs text-dark-muted font-mono mt-0.5">
                Merging <span className="text-emerald-400 font-semibold">{sourceBranch}</span> into <span className="text-purple-400 font-semibold">{targetBranch}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all"
            >
              Abort Merge
            </button>
            <button
              onClick={handleCompleteMerge}
              disabled={!isAllResolved()}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-semibold transition-all flex items-center gap-1.5 shadow-glow disabled:shadow-none"
            >
              <Check className="w-4 h-4" />
              Complete Merge
            </button>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="flex flex-grow min-h-0">
          {/* Left Sidebar - Files List */}
          <div className="w-64 border-r border-white/5 p-4 flex flex-col gap-2 flex-shrink-0 bg-[#080d17]/40">
            <span className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-2">
              Conflicting Files
            </span>
            {conflictingFiles.map((file, idx) => {
              const blocks = fileBlocksMap[file.filename] || [];
              const fileConflicts = blocks.filter(b => b.type === 'conflict');
              const fileResolved = fileConflicts.filter(b => b.resolution !== null);
              const isDone = fileConflicts.length === fileResolved.length;

              return (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    idx === selectedFileIdx
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/5 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate font-mono">{file.filename}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {fileResolved.length}/{fileConflicts.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Section - Resolution Panel */}
          <div className="flex-grow flex flex-col min-w-0 bg-[#04070d]/60">
            {activeFile ? (
              <>
                {/* File Header */}
                <div className="px-6 py-3 border-b border-white/5 flex justify-between items-center bg-[#070b13]">
                  <span className="text-sm font-mono text-gray-300 font-semibold">{activeFile.filename}</span>
                  <div className="text-xs font-mono text-dark-muted flex items-center gap-1.5">
                    <span>Active Conflicts:</span>
                    <span className="text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                      {totalConflictsInActive - resolvedConflictsInActive} remaining
                    </span>
                  </div>
                </div>

                {/* Conflict Blocks List */}
                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                  {activeBlocks.map((block) => {
                    if (block.type === 'normal') {
                      return (
                        <div key={block.id} className="font-mono text-sm text-gray-500 bg-[#05080f]/20 p-4 rounded-xl border border-white/[0.02] leading-relaxed select-text">
                          <pre>{block.content}</pre>
                        </div>
                      );
                    }

                    // Render interactive Conflict block card
                    return (
                      <div
                        key={block.id}
                        className={`border rounded-xl overflow-hidden shadow-lg transition-all ${
                          block.resolution
                            ? 'border-emerald-500/40 bg-emerald-500/[0.01]'
                            : 'border-yellow-500/30 bg-yellow-500/[0.01]'
                        }`}
                      >
                        {/* Conflict Card Title */}
                        <div className={`px-4 py-2 border-b flex justify-between items-center text-xs font-mono font-medium ${
                          block.resolution
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            CONFLICT BLOCK DETECTED
                          </span>
                          <span>
                            {block.resolution ? 'Resolution Selected' : 'Choose which version to keep'}
                          </span>
                        </div>

                        {/* Interactive Selector Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-[#05080e]/90">
                          
                          {/* Option A: Current Branch */}
                          <div className={`p-4 flex flex-col h-[200px] transition-all ${
                            block.resolution === 'our' ? 'bg-purple-500/5' : ''
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-purple-400 font-semibold font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                {targetBranch} (Current)
                              </span>
                              <button
                                onClick={() => resolveBlock(block.id, 'our')}
                                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                                  block.resolution === 'our'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                {block.resolution === 'our' ? 'Active Choice' : 'Accept Current'}
                              </button>
                            </div>
                            <pre className="font-mono text-sm leading-relaxed overflow-y-auto text-gray-300 flex-grow bg-black/25 p-3 rounded-lg border border-white/5 select-text">
                              {block.ourContent || <span className="italic text-gray-600">[Empty line additions]</span>}
                            </pre>
                          </div>

                          {/* Option B: Incoming Branch */}
                          <div className={`p-4 flex flex-col h-[200px] transition-all ${
                            block.resolution === 'their' ? 'bg-emerald-500/5' : ''
                          }`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-emerald-400 font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                {sourceBranch} (Incoming)
                              </span>
                              <button
                                onClick={() => resolveBlock(block.id, 'their')}
                                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                                  block.resolution === 'their'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                {block.resolution === 'their' ? 'Active Choice' : 'Accept Incoming'}
                              </button>
                            </div>
                            <pre className="font-mono text-sm leading-relaxed overflow-y-auto text-gray-300 flex-grow bg-black/25 p-3 rounded-lg border border-white/5 select-text">
                              {block.theirContent || <span className="italic text-gray-600">[Empty line additions]</span>}
                            </pre>
                          </div>

                        </div>

                        {/* Card Footer Options */}
                        <div className="px-4 py-2 border-t border-white/5 bg-[#080c14] flex justify-between items-center text-xs">
                          <button
                            onClick={() => resolveBlock(block.id, 'both')}
                            className={`px-3 py-1 rounded transition-all font-mono font-medium ${
                              block.resolution === 'both'
                                ? 'bg-indigo-600 text-white border border-indigo-500/20'
                                : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 text-dark-muted'
                            }`}
                          >
                            Accept Both Changes
                          </button>

                          <div className="flex items-center gap-1.5 text-dark-muted">
                            {block.resolution && (
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Resolved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-grow text-dark-muted">
                <Code className="w-12 h-12 stroke-1 text-gray-700 mb-2 animate-pulse" />
                <p className="text-sm">Select a conflicting file from the left panel.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
