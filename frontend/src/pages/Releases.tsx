import React, { useState } from 'react';
import { Commit, Branch } from '../types';
import {
  Tag,
  Download,
  Folder,
  Plus,
  Rocket,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

interface Release {
  tagName: string;
  title: string;
  body: string;
  targetBranch: string;
  createdAt: string;
  author: string;
}

interface ReleasesProps {
  repoId: string;
  commits: Commit[];
  branches: Branch[];
}

export const ReleasesPage: React.FC<ReleasesProps> = ({
  repoId,
  commits,
  branches
}) => {
  const [releases, setReleases] = useState<Release[]>([
    {
      tagName: 'v1.0.0',
      title: 'Initial Production Build Release',
      body: '## Description\nInitial baseline framework rollout containing core Express capabilities, Mongoose definitions, and basic routing mechanics.\n\n## Changes\n- feat: setup core web server framework\n- docs: initialize repository readme guidelines\n',
      targetBranch: 'main',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      author: 'you'
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  
  // Creation States
  const [tagName, setTagName] = useState('v1.1.0');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');

  const handleGenerateChangelog = () => {
    // Collect last 10 commits on targetBranch to dump as notes
    const branchCommits = commits
      .filter(c => c.branchName === targetBranch)
      .slice(0, 5);

    if (branchCommits.length === 0) {
      setBody('## Changelog\n- No recent changes found on selected branch.');
      return;
    }

    const compiled = 
      `## Description\nProvide brief summary details of this build deployment.\n\n` +
      `## Automated Changelog\n` +
      branchCommits.map(c => `- ${c.message} (${c.hash.substring(0, 7)}) by ${c.author}`).join('\n') + 
      '\n';
      
    setBody(compiled);
  };

  const handleCreateRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim() || !title.trim()) return;

    const newRelease: Release = {
      tagName: tagName.trim(),
      title: title.trim(),
      body,
      targetBranch,
      createdAt: new Date().toISOString(),
      author: 'you'
    };

    setReleases([newRelease, ...releases]);
    setIsCreating(false);
    
    // Clear form
    setTagName('');
    setTitle('');
    setBody('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-100 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-purple-400" />
            Releases & Tags
          </h1>
          <p className="text-xs text-dark-muted font-mono mt-0.5">
            Deliver builds, specify semantic versioning, and export assets.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold shadow-glow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Draft a New Release
          </button>
        )}
      </div>

      {/* 1. CREATION SCREEN */}
      {isCreating && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-md font-bold text-gray-200">Draft a New Build Release</h2>
          <form onSubmit={handleCreateRelease} className="space-y-4">
            
            {/* Version and Branch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Tag Version (Semantic)
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. v1.1.0"
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Target Branch
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
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                Release Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="v1.1.0 - Auth features online"
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
            </div>

            {/* Description Notes */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider">
                  Changelog / Release Notes
                </label>
                <button
                  type="button"
                  onClick={handleGenerateChangelog}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-bold"
                >
                  Generate Notes From Commits
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write release notes in Markdown..."
                rows={5}
                className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 font-mono placeholder-gray-600"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-glow"
              >
                Publish Release
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 2. RELEASES TIMELINE LIST */}
      <div className="space-y-6">
        {releases.map((rel) => {
          const dateStr = new Date(rel.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
          return (
            <div key={rel.tagName} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column Version Tag Info */}
              <div className="lg:col-span-1 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">{rel.tagName}</h3>
                    <span className="text-[10px] text-dark-muted font-mono block">tag checkout</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-dark-muted font-mono">
                  <div>Date: <span className="text-gray-400">{dateStr}</span></div>
                  <div>Branch: <span className="text-gray-400">{rel.targetBranch}</span></div>
                  <div>Author: <span className="text-gray-400">{rel.author === 'you' ? 'You' : rel.author}</span></div>
                </div>
              </div>

              {/* Right Column Release contents */}
              <div className="lg:col-span-3 glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h2 className="text-base font-extrabold text-gray-100">{rel.title}</h2>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 mt-1 inline-block">
                    ✓ Verified Stable Build
                  </span>
                </div>

                {/* Body Details (Markdown format) */}
                <div className="text-sm text-gray-300 leading-relaxed bg-[#05070c]/50 p-4 rounded-xl border border-white/5 font-mono select-text whitespace-pre-wrap">
                  {rel.body}
                </div>

                {/* Assets downloads */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <h4 className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider">Downloads Assets</h4>
                  <div className="flex flex-wrap gap-2.5">
                    
                    {/* Zip package */}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); alert('Downloading simulated source zip folder...'); }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      Source code (zip)
                      <Download className="w-3 h-3 text-dark-muted" />
                    </a>

                    {/* Tar package */}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); alert('Downloading simulated tar.gz archive...'); }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Source code (tar.gz)
                      <Download className="w-3 h-3 text-dark-muted" />
                    </a>

                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
