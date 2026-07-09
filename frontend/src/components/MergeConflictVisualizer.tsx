import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Check, 
  Code, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  BookOpen, 
  Columns, 
  Rows,
  Activity,
  X,
  Edit,
  FileCode,
  CheckSquare
} from 'lucide-react';

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
  resolution?: 'our' | 'their' | 'both' | 'manual' | null;
  manualContent?: string;
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
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>('side-by-side');
  
  // Tab within the file workspace: editor or full-file preview
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Manual editing input buffer
  const [manualText, setManualText] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Educational handbook toggle
  const [showHandbook, setShowHandbook] = useState(false);

  // Animated Merge state
  const [isMergingAnimated, setIsMergingAnimated] = useState(false);
  const [mergeStepText, setMergeStepText] = useState('');

  const activeFile = conflictingFiles[selectedFileIdx];

  // Parse files into resolution blocks when files load
  useEffect(() => {
    const newMap: Record<string, ConflictBlock[]> = {};
    conflictingFiles.forEach(file => {
      newMap[file.filename] = parseConflictMarkers(file.mergedMarkerContent);
    });
    setFileBlocksMap(newMap);
    setActiveTab('editor');
    setEditingBlockId(null);
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
          resolution: null,
          manualContent: ''
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

  // Set resolution choice
  const resolveBlock = (blockId: string, choice: 'our' | 'their' | 'both' | 'manual', contentStr?: string) => {
    if (!activeFile) return;
    
    setFileBlocksMap(prev => {
      const blocks = prev[activeFile.filename] || [];
      const updated = blocks.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            resolution: choice,
            manualContent: choice === 'manual' ? (contentStr !== undefined ? contentStr : `<<<<<<< ${targetBranch}\n${b.ourContent}\n=======\n${b.theirContent}\n>>>>>>> ${sourceBranch}`) : ''
          };
        }
        return b;
      });
      return { ...prev, [activeFile.filename]: updated };
    });
  };

  // Check if manual edit contains Git conflict symbols
  const hasConflictMarkers = (text: string) => {
    return text.includes('<<<<<<<') || text.includes('=======') || text.includes('>>>>>>>');
  };

  // Pre-calculate Global Resolve Progress
  const globalProgress = useMemo(() => {
    let total = 0;
    let resolved = 0;

    Object.keys(fileBlocksMap).forEach(filename => {
      const blocks = fileBlocksMap[filename] || [];
      blocks.forEach(b => {
        if (b.type === 'conflict') {
          total++;
          if (b.resolution !== null) {
            if (b.resolution === 'manual' && b.manualContent && hasConflictMarkers(b.manualContent)) {
              // Manual resolved but markers still present is considered unresolved
            } else {
              resolved++;
            }
          }
        }
      });
    });

    return { total, resolved, percent: total > 0 ? Math.round((resolved / total) * 100) : 100 };
  }, [fileBlocksMap]);

  const isAllResolved = globalProgress.resolved === globalProgress.total;

  // Compile final code content
  const compileResolvedContent = (filename: string): string => {
    const blocks = fileBlocksMap[filename] || [];
    return blocks.map(b => {
      if (b.type === 'normal') {
        return b.content;
      }
      if (b.resolution === 'our') return b.ourContent || '';
      if (b.resolution === 'their') return b.theirContent || '';
      if (b.resolution === 'both') return `${b.ourContent}\n${b.theirContent}`;
      if (b.resolution === 'manual') return b.manualContent || '';
      return '';
    }).join('\n');
  };

  // Merge animation sequence
  const handleCompleteMerge = () => {
    if (!isAllResolved) return;

    setIsMergingAnimated(true);
    setMergeStepText('Lifting LCA checkpoint diffs...');

    setTimeout(() => {
      setMergeStepText('Injecting resolved file buffers...');
    }, 1000);

    setTimeout(() => {
      setMergeStepText('Applying checkout commit. Merging successful!');
    }, 2000);

    setTimeout(() => {
      const resolutions = conflictingFiles.map(file => ({
        filename: file.filename,
        content: compileResolvedContent(file.filename)
      }));
      onResolve(resolutions);
      setIsMergingAnimated(false);
    }, 3200);
  };

  // Syntax highlighting helper
  const highlightSyntax = (code: string) => {
    if (!code) return '';
    const keywords = /\b(const|let|var|function|return|import|export|from|if|else|for|while|class|interface|type|default|async|await|try|catch)\b/g;
    const strings = /(["'`])(.*?)\1/g;
    const comments = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
    
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    html = html.replace(comments, '<span class="text-gray-500">$1</span>');
    html = html.replace(strings, '<span class="text-amber-300">$&</span>');
    html = html.replace(keywords, '<span class="text-indigo-400 font-bold">$1</span>');
    
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const activeBlocks = fileBlocksMap[activeFile?.filename] || [];
  const totalConflictsInActive = activeBlocks.filter(b => b.type === 'conflict').length;
  const resolvedConflictsInActive = activeBlocks.filter(b => {
    if (b.type !== 'conflict') return false;
    if (b.resolution === null) return false;
    if (b.resolution === 'manual' && b.manualContent && hasConflictMarkers(b.manualContent)) return false;
    return true;
  }).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#06080e]/95 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden select-none">
      
      {/* ANIMATED MERGE OVERLAY */}
      <AnimatePresence>
        {isMergingAnimated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 bg-[#06080e] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="relative w-72 h-44 flex items-center justify-between mb-8">
              
              {/* Target Branch Dot */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full bg-purple-500 border border-purple-400 flex items-center justify-center text-white text-xs font-bold font-mono">
                  M
                </div>
                <span className="text-[10px] text-purple-300 font-mono mt-1">{targetBranch}</span>
              </div>

              {/* Merging path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <motion.path
                  d="M 36 88 Q 144 20, 252 88"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="8 4"
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
                
                <motion.circle
                  r="6"
                  fill="#fbbf24"
                  animate={{
                    cx: [36, 144, 252],
                    cy: [88, 54, 88],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                />
              </svg>

              {/* Source Branch Dot */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-white text-xs font-bold font-mono">
                  S
                </div>
                <span className="text-[10px] text-emerald-300 font-mono mt-1">{sourceBranch}</span>
              </div>

            </div>

            <Activity className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
            <h3 className="text-md font-bold text-gray-200 font-mono">{mergeStepText}</h3>
            <p className="text-[10px] text-dark-muted font-mono mt-1">Please wait while simulator compiles changes.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[90vh] bg-[#080d16]/90">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-red-500/[0.02] flex items-center justify-between flex-shrink-0 text-left flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
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

          {/* Global Progress Bar */}
          <div className="hidden md:flex flex-col w-48 text-[10px] font-mono gap-1 text-left">
            <div className="flex justify-between text-dark-muted">
              <span>Resolving files...</span>
              <span className="font-bold text-purple-300">{globalProgress.resolved}/{globalProgress.total}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${globalProgress.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 select-none ml-auto">
            
            {/* View Mode */}
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setViewMode('unified')}
                className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] font-bold ${
                  viewMode === 'unified' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Rows className="w-3.5 h-3.5" />
                Unified
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] font-bold ${
                  viewMode === 'side-by-side' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                Side-by-Side
              </button>
            </div>

            <button
              onClick={() => setShowHandbook(!showHandbook)}
              className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Conflict Explanation Handbook"
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
            >
              Abort Merge
            </button>

            <button
              onClick={handleCompleteMerge}
              disabled={!isAllResolved}
              className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAllResolved ? 'shadow-glow border border-purple-400/20 animate-pulse' : 'disabled:shadow-none'
              }`}
            >
              <Check className="w-4 h-4" />
              Complete Merge
            </button>

          </div>
        </div>

        {/* Workspace Layout */}
        <div className="flex flex-grow min-h-0 relative">
          
          {/* HANDBOOK SIDEBAR */}
          <AnimatePresence>
            {showHandbook && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-[#090d16] border-l border-white/10 shadow-2xl p-5 z-40 overflow-y-auto text-left"
              >
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    Conflict Handbook
                  </span>
                  <X className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" onClick={() => setShowHandbook(false)} />
                </div>

                <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                  <div>
                    <h4 className="font-bold text-purple-400 font-mono">What causes conflicts?</h4>
                    <p className="mt-1 text-dark-muted leading-normal">
                      A conflict happens when two branches make changes to the same line in a file.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-400 font-mono">Understanding markers</h4>
                    <p className="mt-1 text-dark-muted leading-normal">
                      Git inserts conflict markers to highlight the overlapping revisions:
                    </p>
                    <pre className="p-2 bg-[#05080f] rounded-lg border border-white/5 font-mono text-[9px] text-gray-400 mt-2 select-text">
{`<<<<<<< ${targetBranch}
Current changes (on main)
=======
Incoming changes (from branch)
>>>>>>> ${sourceBranch}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-400 font-mono">Manual Edit Mode</h4>
                    <p className="mt-1 text-dark-muted leading-normal">
                      Click <strong>"Manual Edit"</strong> to type custom resolutions. Note that you must remove all Git symbols (`&lt;&lt;&lt;&lt;&lt;&lt;&lt;`, `=======`, `&gt;&gt;&gt;&gt;&gt;&gt;&gt;`) before saving.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left Sidebar - Files List */}
          <div className="w-64 border-r border-white/5 p-4 flex flex-col gap-2 flex-shrink-0 bg-[#080d17]/40 text-left">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-2 font-mono">
              Conflicting Files
            </span>
            {conflictingFiles.map((file, idx) => {
              const blocks = fileBlocksMap[file.filename] || [];
              const fileConflicts = blocks.filter(b => b.type === 'conflict');
              const fileResolved = fileConflicts.filter(b => {
                if (b.resolution === null) return false;
                if (b.resolution === 'manual' && b.manualContent && hasConflictMarkers(b.manualContent)) return false;
                return true;
              });
              const isDone = fileConflicts.length === fileResolved.length;

              return (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    idx === selectedFileIdx
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 font-bold'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/5 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium truncate font-mono">{file.filename}</span>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                    isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {fileResolved.length}/{fileConflicts.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Section - Resolution Workspace */}
          <div className="flex-grow flex flex-col min-w-0 bg-[#04070d]/60">
            {activeFile ? (
              <>
                {/* File Workspace Header with Tab Selector */}
                <div className="px-6 py-2 border-b border-white/5 flex justify-between items-center bg-[#070b13] text-left flex-wrap gap-2">
                  <span className="text-xs font-mono text-gray-300 font-semibold">{activeFile.filename}</span>
                  
                  <div className="flex items-center gap-4">
                    {/* Tab switches */}
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[10px] font-mono font-bold select-none">
                      <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-3 py-1 rounded-md flex items-center gap-1 ${
                          activeTab === 'editor' ? 'bg-purple-500/20 border border-purple-500/10 text-purple-300' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Edit className="w-3 h-3" /> Conflict Editor
                      </button>
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 rounded-md flex items-center gap-1 ${
                          activeTab === 'preview' ? 'bg-purple-500/20 border border-purple-500/10 text-purple-300' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" /> File Merge Preview
                      </button>
                    </div>

                    <div className="text-[10px] font-mono text-dark-muted flex items-center gap-1">
                      <span>Conflicts:</span>
                      <span className="text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded font-bold">
                        {totalConflictsInActive - resolvedConflictsInActive} remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* WORKSPACE CONTENT BODY */}
                <div className="flex-grow overflow-y-auto p-6">
                  
                  {/* PREVIEW TAB CONTENT */}
                  {activeTab === 'preview' && (
                    <div className="space-y-4 text-left">
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] text-indigo-300 font-mono">
                        💡 Below is a preview of the final merged file based on your active selections.
                      </div>
                      <div className="font-mono text-xs text-gray-400 bg-black/20 p-4 rounded-xl border border-white/5 leading-relaxed overflow-x-auto whitespace-pre select-text">
                        {highlightSyntax(compileResolvedContent(activeFile.filename))}
                      </div>
                    </div>
                  )}

                  {/* EDITOR TAB CONTENT */}
                  {activeTab === 'editor' && (
                    <div className="space-y-8 text-left">
                      {activeBlocks.map((block) => {
                        if (block.type === 'normal') {
                          return (
                            <div key={block.id} className="font-mono text-xs text-gray-400 bg-[#05080f]/20 p-4 rounded-xl border border-white/[0.02] leading-relaxed select-text">
                              <pre>{highlightSyntax(block.content)}</pre>
                            </div>
                          );
                        }

                        const isManualEditingThis = editingBlockId === block.id;

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
                            {/* Card title bar */}
                            <div className={`px-4 py-2 border-b flex justify-between items-center text-[10px] font-mono font-medium ${
                              block.resolution
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                CONFLICT BLOCK
                              </span>
                              <span>
                                {block.resolution === 'manual' ? 'Manual Editor Resolved' : block.resolution ? 'Resolution Selected' : 'Choose version or click manual edit'}
                              </span>
                            </div>

                            {/* MANUAL RESOLVE EDITOR VIEW */}
                            {isManualEditingThis ? (
                              <div className="p-4 bg-[#05080e]/95 space-y-3">
                                <div className="text-[10px] text-dark-muted font-mono flex justify-between items-center">
                                  <span>Modify conflict markers and lines below manually:</span>
                                  {hasConflictMarkers(manualText) ? (
                                    <span className="text-red-400 font-bold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Remove markers to save
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckSquare className="w-3 h-3" /> Code ready
                                    </span>
                                  )}
                                </div>
                                <textarea
                                  value={manualText}
                                  onChange={(e) => setManualText(e.target.value)}
                                  rows={8}
                                  className="w-full bg-[#030509] border border-white/10 rounded-lg p-3 font-mono text-xs text-gray-300 focus:outline-none focus:border-purple-500/40 focus:ring-0 leading-relaxed"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBlockId(null)}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={hasConflictMarkers(manualText)}
                                    onClick={() => {
                                      resolveBlock(block.id, 'manual', manualText);
                                      setEditingBlockId(null);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-40"
                                  >
                                    Save Resolution
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* NORMAL ACCEPT PRESETS VIEWS */
                              <>
                                {viewMode === 'unified' ? (
                                  /* Unified vertical stack */
                                  <div className="p-4 bg-[#05080e]/95 space-y-4">
                                    <div className={`rounded-xl border border-purple-500/20 overflow-hidden ${
                                      block.resolution === 'our' ? 'ring-1 ring-purple-500 bg-purple-500/[0.02]' : ''
                                    }`}>
                                      <div className="px-3.5 py-1.5 bg-purple-500/10 flex justify-between items-center text-[10px] font-mono text-purple-400 font-bold border-b border-purple-500/10">
                                        <span>{targetBranch} (Current Changes)</span>
                                        <button
                                          type="button"
                                          onClick={() => resolveBlock(block.id, 'our')}
                                          className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[9px] font-bold animate-none"
                                        >
                                          Accept Current
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-black/25 font-mono text-xs text-gray-300 leading-normal overflow-x-auto whitespace-pre-wrap select-text text-left">
                                        {highlightSyntax(block.ourContent || '')}
                                      </pre>
                                    </div>

                                    <div className="flex justify-center text-dark-muted font-bold font-mono text-[10px] uppercase select-none">
                                      ======= vs =======
                                    </div>

                                    <div className={`rounded-xl border border-emerald-500/20 overflow-hidden ${
                                      block.resolution === 'their' ? 'ring-1 ring-emerald-500 bg-emerald-500/[0.02]' : ''
                                    }`}>
                                      <div className="px-3.5 py-1.5 bg-emerald-500/10 flex justify-between items-center text-[10px] font-mono text-emerald-400 font-bold border-b border-emerald-500/10">
                                        <span>{sourceBranch} (Incoming Changes)</span>
                                        <button
                                          type="button"
                                          onClick={() => resolveBlock(block.id, 'their')}
                                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold animate-none"
                                        >
                                          Accept Incoming
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-black/25 font-mono text-xs text-gray-300 leading-normal overflow-x-auto whitespace-pre-wrap select-text text-left">
                                        {highlightSyntax(block.theirContent || '')}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  /* Side by Side split layout */
                                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-[#05080e]/90">
                                    <div className={`p-4 flex flex-col h-[220px] transition-all ${
                                      block.resolution === 'our' ? 'bg-purple-500/[0.03]' : ''
                                    }`}>
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] text-purple-400 font-semibold font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                          {targetBranch} (Current)
                                        </span>
                                        <button
                                          onClick={() => resolveBlock(block.id, 'our')}
                                          className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${
                                            block.resolution === 'our'
                                              ? 'bg-purple-600 text-white'
                                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                          }`}
                                        >
                                          {block.resolution === 'our' ? 'Active Choice' : 'Accept Current'}
                                        </button>
                                      </div>
                                      <pre className="font-mono text-xs leading-relaxed overflow-y-auto text-gray-300 flex-grow bg-black/25 p-3 rounded-lg border border-white/5 select-text text-left">
                                        {highlightSyntax(block.ourContent || '')}
                                      </pre>
                                    </div>

                                    <div className={`p-4 flex flex-col h-[220px] transition-all ${
                                      block.resolution === 'their' ? 'bg-emerald-500/[0.03]' : ''
                                    }`}>
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] text-emerald-400 font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                          {sourceBranch} (Incoming)
                                        </span>
                                        <button
                                          onClick={() => resolveBlock(block.id, 'their')}
                                          className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${
                                            block.resolution === 'their'
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                          }`}
                                        >
                                          {block.resolution === 'their' ? 'Active Choice' : 'Accept Incoming'}
                                        </button>
                                      </div>
                                      <pre className="font-mono text-xs leading-relaxed overflow-y-auto text-gray-300 flex-grow bg-black/25 p-3 rounded-lg border border-white/5 select-text text-left">
                                        {highlightSyntax(block.theirContent || '')}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Card Footer Actions */}
                                <div className="px-4 py-2 border-t border-white/5 bg-[#080c14] flex justify-between items-center text-xs">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => resolveBlock(block.id, 'both')}
                                      className={`px-3 py-1 rounded transition-all font-mono font-medium text-[10px] ${
                                        block.resolution === 'both'
                                          ? 'bg-indigo-600 text-white border border-indigo-500/20 font-bold'
                                          : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 text-dark-muted hover:text-gray-300'
                                      }`}
                                    >
                                      Accept Both Changes
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const initialVal = block.resolution === 'manual' && block.manualContent 
                                          ? block.manualContent 
                                          : `<<<<<<< ${targetBranch}\n${block.ourContent}\n=======\n${block.theirContent}\n>>>>>>> ${sourceBranch}`;
                                        setManualText(initialVal);
                                        setEditingBlockId(block.id);
                                      }}
                                      className={`px-3 py-1 rounded transition-all font-mono font-medium text-[10px] flex items-center gap-1 ${
                                        block.resolution === 'manual'
                                          ? 'bg-purple-500/20 border border-purple-500/20 text-purple-300 font-bold'
                                          : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 text-dark-muted hover:text-gray-300'
                                      }`}
                                    >
                                      <Edit className="w-3 h-3" /> Manual Edit Code
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-dark-muted font-mono">
                                    {block.resolution && (
                                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Resolved
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-grow text-dark-muted select-none">
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
