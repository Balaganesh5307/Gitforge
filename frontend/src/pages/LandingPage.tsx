import React from 'react';
import { Bot, Terminal, GitBranch, GitPullRequest, ListTodo, BarChart2, ShieldAlert } from 'lucide-react';
import heroImage from '../assets/hero.png';

interface LandingPageProps {
  onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#060a12] text-gray-100 grid-bg relative overflow-x-hidden selection:bg-purple-500/30">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 bg-[#080d17]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-white block">GitForge</span>
            <span className="text-[9px] text-purple-400 font-mono tracking-wider uppercase -mt-1 block">Collab Simulator</span>
          </div>
        </div>
        
        <button
          onClick={onLaunch}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 transition-all"
        >
          Launch Simulator
        </button>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center relative z-10 flex flex-col items-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono mb-6 select-none animate-fade-in">
          <Bot className="w-3.5 h-3.5 animate-pulse" />
          <span>Interactive Visual Sandbox Environment</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-none max-w-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-400">
          Master Git & GitHub Workflows Visually
        </h1>

        {/* Subtitle */}
        <p className="text-sm md:text-base text-dark-muted max-w-2xl mt-6 leading-relaxed">
          Practice branch checkouts, commits, pull request approvals, and merge conflict resolutions in a gorgeous interactive workspace alongside simulated AI developer bots.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-10">
          <button
            onClick={onLaunch}
            className="px-7 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-glow hover:-translate-y-0.5 transition-all"
          >
            Launch Simulator Sandbox
          </button>
          
          <a
            href="https://github.com/Balaganesh5307/Gitforge.git"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold flex items-center gap-2 hover:-translate-y-0.5 transition-all"
          >
            Explore Repository
          </a>
        </div>

        {/* Graphic Mockup Showcase */}
        <div className="mt-16 w-full max-w-4xl glass-panel rounded-2xl border border-white/10 p-2 shadow-2xl relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className="bg-[#0b0f19] rounded-xl overflow-hidden aspect-[16/10] relative">
            <img
              src={heroImage}
              alt="GitForge Simulator Mockup"
              className="w-full h-full object-cover opacity-85 group-hover:scale-[1.01] transition-transform duration-700"
              onError={(e) => {
                // Fallback graphic if image is missing or corrupted
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-transparent to-transparent opacity-90" />
            
            {/* Centered Graphic Detail in case image fails */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-purple-950/5">
              <GitBranch className="w-16 h-16 text-purple-400 mb-4 stroke-1 animate-pulse" />
              <h3 className="text-xl font-bold text-gray-100">Live Branch Graph & Terminal Simulator</h3>
              <p className="text-xs text-dark-muted mt-2 max-w-md">
                Interactive nodes update dynamically as you type standard git commands or click simulator quick-actions.
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* Features Grid Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5 relative z-10">
        <h2 className="text-xl font-bold text-gray-200 uppercase tracking-widest text-center mb-12">
          Simulator Capabilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: GitBranch,
              title: 'Visual Git Tree Graph',
              desc: 'SVG commits plot out on branch tracks in real time. Hover nodes to view parent links, author details, and file diff lists.',
              color: 'text-purple-400 bg-purple-500/10'
            },
            {
              icon: Terminal,
              title: 'Interactive Bash Console',
              desc: 'Type standard commands like git commit, branch, or checkout. Visual graphs update instantly upon command execution.',
              color: 'text-emerald-400 bg-emerald-500/10'
            },
            {
              icon: ShieldAlert,
              title: 'Merge Conflict Visualizer',
              desc: 'Get hands-on experience handling overlapping file lines. Select and compile resolutions inside a split-screen conflict view.',
              color: 'text-red-400 bg-red-500/10'
            },
            {
              icon: GitPullRequest,
              title: 'Pull Request Review System',
              desc: 'Submit PR requests, post line reviews, and coordinate approvals alongside automated bot review responses.',
              color: 'text-blue-400 bg-blue-500/10'
            },
            {
              icon: ListTodo,
              title: 'Kanban Project Board',
              desc: 'Drag issues and cards between todo, progress, and review lists to coordinate project updates in a unified workspace.',
              color: 'text-amber-400 bg-amber-500/10'
            },
            {
              icon: BarChart2,
              title: 'Insight Statistics Charts',
              desc: 'Analyze commit counts, issue status ratios, code contributions, and PR cycles using interactive dashboards.',
              color: 'text-indigo-400 bg-indigo-500/10'
            }
          ].map((feat, idx) => {
            const FeatIcon = feat.icon;
            return (
              <div
                key={idx}
                className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-purple-500/20 hover:shadow-glow hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feat.color}`}>
                    <FeatIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-100">{feat.title}</h3>
                  <p className="text-xs text-dark-muted mt-2 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-dark-muted font-mono bg-[#080d17]/40 relative z-10">
        <p>&copy; 2026 GitForge Simulator. Built for Developer Visual Training.</p>
      </footer>

    </div>
  );
};
