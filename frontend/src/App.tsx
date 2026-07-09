import { useState, useEffect } from 'react';
import { Member, Repository, Branch, Commit, PullRequest, Issue, Activity } from './types';
import { Dashboard } from './pages/Dashboard';
import { PullRequestPage } from './pages/PullRequest';
import { IssuesPage } from './pages/Issues';
import { KanbanBoard } from './pages/KanbanBoard';
import { Insights } from './pages/Insights';
import { ReleasesPage } from './pages/Releases';
import { BranchGraph } from './components/BranchGraph';
import { TerminalSimulator } from './components/TerminalSimulator';
import { MergeConflictVisualizer } from './components/MergeConflictVisualizer';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import {
  LayoutDashboard,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  ListTodo,
  BarChart2,
  Rocket,
  Plus,
  Trash2,
  Bot,
  Activity as ActivityIcon,
  Menu,
  Bell,
  GitCommit
} from 'lucide-react';

const REPO_ID = 'gitforge-demo';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [latency, setLatency] = useState(3);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Sync state latency
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 5) + 2);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Fetch logged in user profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (response.ok) {
          setUser(data.user);
        } else {
          // Reset session
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session authentication failed:', err);
      }
    };
    fetchProfile();
  }, [token]);

  // Protected route guard redirecting unauthenticated sessions
  useEffect(() => {
    const publicPages = ['landing', 'login', 'signup'];
    if (!publicPages.includes(currentPage) && !token) {
      setCurrentPage('login');
    }
  }, [currentPage, token]);
  
  // Repo States
  const [repo, setRepo] = useState<Repository | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // GUI Interaction States
  const [currentBranchName, setCurrentBranchName] = useState('main');
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranchName, setSourceBranchName] = useState('main');

  // Conflict Resolution Overlay State
  const [conflictOverlay, setConflictOverlay] = useState<{
    sourceBranch: string;
    targetBranch: string;
    conflictingFiles: any[];
    prId: string;
  } | null>(null);

  // Notifications State
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch all repository data from backend
  const refreshAllData = async () => {
    try {
      // 0. Fetch All Repositories
      const reposRes = await fetch('http://localhost:5000/api/repos');
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepositories(reposData);
      }

      // 1. Fetch Repository Details
      const repoRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}`);
      if (repoRes.ok) {
        const repoData: Repository = await repoRes.json();
        setRepo(repoData);
        if (repoData.currentBranch) {
          setCurrentBranchName(repoData.currentBranch);
        }
      }

      // 2. Fetch Branches
      const branchesRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/branches`);
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData);
      }

      // 3. Fetch Commits
      const commitsRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/commits`);
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        setCommits(commitsData);
      }

      // 4. Fetch PRs
      const prsRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/pulls`);
      if (prsRes.ok) {
        const prsData = await prsRes.json();
        setPrs(prsData);
      }

      // 5. Fetch Issues
      const issuesRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/issues`);
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData);
      }

      // 6. Fetch Activities
      const activitiesRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/activities`);
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }

      // 7. Fetch Members
      const membersRes = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

    } catch (err) {
      console.error('Error refreshing GitForge simulator data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Handle Checkout Branch via GUI
  const handleCheckoutBranch = async (branchName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName })
      });

      if (response.ok) {
        setCurrentBranchName(branchName);
        showNotification(`Checked out branch: ${branchName}`, 'success');
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Create Branch via GUI
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBranch: sourceBranchName,
          newBranch: newBranchName.trim()
        })
      });

      if (response.ok) {
        showNotification(`Created branch: ${newBranchName}`, 'success');
        setShowCreateBranchModal(false);
        setNewBranchName('');
        // Checkout new branch
        await handleCheckoutBranch(newBranchName.trim());
      } else {
        const err = await response.json();
        showNotification(err.error || 'Failed to create branch', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Branch via GUI
  const handleDeleteBranch = async (branchName: string) => {
    if (branchName === 'main') {
      showNotification('Cannot delete default branch', 'error');
      return;
    }
    if (!window.confirm(`Delete branch ${branchName} permanently?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/branches/${branchName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification(`Deleted branch: ${branchName}`, 'info');
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger simulated bot activities
  const handleTriggerBotAction = async (type: 'commit' | 'issue' | 'conflict') => {
    try {
      let endpoint = '';
      let body = {};

      if (type === 'commit') {
        endpoint = 'commit';
        body = { branchName: currentBranchName };
      } else if (type === 'issue') {
        endpoint = 'issue';
      } else {
        endpoint = 'conflict';
      }

      const response = await fetch(`http://localhost:5000/api/simulation/${REPO_ID}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (response.ok) {
        if (type === 'commit') {
          showNotification('Bot collaborator pushed a new commit!', 'success');
        } else if (type === 'issue') {
          showNotification('Bot collaborator logged a new issue!', 'info');
        } else {
          showNotification('Bot collaborator triggered a merge conflict scenario. Head to Pull Requests!', 'error');
          setCurrentPage('prs');
        }
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Conflict resolved and merged callback
  const handleConflictResolved = async (resolvedFiles: { filename: string; content: string }[]) => {
    if (!conflictOverlay) return;

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${REPO_ID}/pulls/${conflictOverlay.prId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'you',
          resolvedFiles
        })
      });

      if (response.ok) {
        showNotification('Conflicts resolved successfully! Pull Request merged.', 'success');
        setConflictOverlay(null);
        setCurrentPage('prs');
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (currentPage === 'landing') {
    return (
      <LandingPage
        onLaunch={() => {
          if (token) {
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('login');
          }
        }}
      />
    );
  }

  if (currentPage === 'login' || currentPage === 'signup') {
    return (
      <AuthPage
        initialView={currentPage}
        onAuthSuccess={(t, u) => {
          localStorage.setItem('token', t);
          setToken(t);
          setUser(u);
          setCurrentPage('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#060a12] text-gray-100 select-none relative">
      
      {/* Mobile Sidebar backdrop overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#080d17] border-r border-white/5 flex flex-col justify-between z-35 transition-transform duration-300 lg:static lg:translate-x-0 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          {/* Logo Brand (Clickable to return to Landing Page) */}
          <button
            onClick={() => setCurrentPage('landing')}
            className="w-full p-6 border-b border-white/5 flex items-center gap-3 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all focus:outline-none group"
            title="Return to Landing Page"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 group-hover:text-purple-400 transition-colors">
                GitForge
              </h2>
              <span className="text-[10px] text-purple-400 font-mono font-medium tracking-wide uppercase block">
                Collab Simulator
              </span>
            </div>
          </button>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'branches', label: 'Branches & Graph', icon: GitBranch },
              { id: 'prs', label: 'Pull Requests', icon: GitPullRequest, badge: prs.filter(p => p.status === 'open').length },
              { id: 'issues', label: 'Issue Tracker', icon: AlertCircle, badge: issues.filter(i => i.status !== 'done').length },
              { id: 'kanban', label: 'Kanban Board', icon: ListTodo },
              { id: 'insights', label: 'Insights & Analytics', icon: BarChart2 },
              { id: 'releases', label: 'Releases & Tags', icon: Rocket }
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-purple-600/15 border border-purple-500/20 text-purple-300 shadow-sm'
                      : 'border border-transparent text-dark-muted hover:bg-white/[0.02] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4.5 h-4.5 ${isActive ? 'text-purple-400' : 'text-dark-muted'}`} />
                    {item.label}
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Context & Info */}
        <div className="p-4 border-t border-white/5 bg-[#090e19] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username || 'you'}`}
              alt="You"
              className="w-8 h-8 rounded-full border border-white/10 bg-slate-900"
            />
            <div className="min-w-0 flex-1 text-left">
              <h4 className="text-xs font-bold text-gray-200 truncate">{user?.username || 'User Developer'}</h4>
              <span className="text-[9px] text-dark-muted font-mono truncate block">{user?.email || 'Role: Project Owner'}</span>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              setCurrentPage('landing');
            }}
            className="w-full py-1.5 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-gray-400 rounded-lg text-[10px] font-bold font-mono transition-all uppercase tracking-wider"
          >
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="flex-grow flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-white/5 bg-[#080d17]/80 backdrop-blur-md flex items-center justify-between px-6 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-dark-muted hover:text-purple-300 lg:hidden rounded-lg bg-white/5 border border-white/10"
              title="Open Navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium text-dark-muted hidden sm:inline">Active Branch:</span>
            <select
              value={currentBranchName}
              onChange={(e) => handleCheckoutBranch(e.target.value)}
              className="bg-[#0b0f19] border border-white/10 rounded-lg px-3 py-1 text-xs font-mono text-purple-300 font-semibold focus:outline-none focus:border-purple-500/40"
            >
              {branches.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>

            {/* Quick Counters Widget */}
            <div className="hidden xl:flex items-center gap-3.5 border-l border-white/5 pl-4 ml-2 text-[11px] text-dark-muted font-mono select-none">
              <span className="flex items-center gap-1" title="Total Commits">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                {commits.length}
              </span>
              <span className="flex items-center gap-1" title="Open Pull Requests">
                <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
                {prs.filter(p => p.status === 'open').length}
              </span>
              <span className="flex items-center gap-1" title="Open Issues">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                {issues.filter(i => i.status !== 'done').length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Sync Latency Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>Synced: {latency}ms</span>
            </div>

            {/* Bot Avatar stack in header */}
            <div className="hidden sm:flex items-center -space-x-1.5 mr-1 select-none">
              {members.filter(m => m.role === 'bot').map(m => (
                <img
                  key={m.id}
                  src={m.avatarUrl}
                  alt={m.username}
                  className="w-5.5 h-5.5 rounded-full border border-[#080d17] bg-slate-900 shadow-sm"
                  title={`${m.username} (Bot Collaborator)`}
                />
              ))}
            </div>

            <button
              onClick={() => handleTriggerBotAction('commit')}
              className="px-3.5 py-1.5 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Bot className="w-3.5 h-3.5" />
              Bot Commit
            </button>

            {/* Interactive Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-dark-muted hover:text-purple-300 rounded-lg bg-white/5 border border-white/10 relative transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-72 glass-panel border border-white/10 rounded-2xl shadow-2xl p-4 z-40 bg-[#090e18]/95 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-2 text-left">
                  <h4 className="font-bold text-gray-200 border-b border-white/5 pb-2 mb-2 uppercase text-[9px] tracking-wider">Repository Live Notifications</h4>
                  {activities.slice(0, 5).map(act => (
                    <div key={act.id} className="p-2 rounded bg-white/[0.01] border border-white/[0.02]">
                      <strong className="text-gray-300">{act.user}</strong> {act.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content Container */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8 grid-bg relative">
          
          {/* Notifications Toast */}
          {notification && (
            <div className="absolute top-4 right-4 z-40">
              <div className={`px-4 py-3 rounded-xl border shadow-lg text-xs font-medium flex items-center gap-2 max-w-sm animate-slide-in ${
                notification.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : notification.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{notification.text}</span>
              </div>
            </div>
          )}

          {/* Page Routing */}
          {currentPage === 'dashboard' && (
            <Dashboard
              repoId={REPO_ID}
              repoName={repo?.name || 'GitForge-Simulator-Project'}
              repoDesc={repo?.description || 'Interactive developer collaboration simulator repository.'}
              commits={commits}
              branches={branches}
              prs={prs}
              issues={issues}
              activities={activities}
              members={members}
              repositories={repositories}
              onTriggerBotAction={handleTriggerBotAction}
              onSelectPage={setCurrentPage}
            />
          )}

          {currentPage === 'prs' && (
            <PullRequestPage
              repoId={REPO_ID}
              branches={branches}
              currentBranch={currentBranchName}
              onRefreshRepo={refreshAllData}
              onTriggerConflictVisualizer={setConflictOverlay}
            />
          )}

          {currentPage === 'issues' && (
            <IssuesPage
              repoId={REPO_ID}
              members={members}
              onRefreshRepo={refreshAllData}
            />
          )}

          {currentPage === 'kanban' && (
            <KanbanBoard
              repoId={REPO_ID}
              members={members}
              onRefreshRepo={refreshAllData}
              onSelectPage={setCurrentPage}
            />
          )}

          {currentPage === 'insights' && (
            <Insights
              commits={commits}
              branches={branches}
              prs={prs}
              issues={issues}
              members={members}
            />
          )}

          {currentPage === 'releases' && (
            <ReleasesPage
              repoId={REPO_ID}
              commits={commits}
              branches={branches}
            />
          )}

          {currentPage === 'branches' && (
            <div className="space-y-6">
              
              {/* Branch list controls */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Branches Management</h3>
                    <p className="text-[11px] text-dark-muted font-mono mt-0.5">Toggle default tracks and delete outdated sub-branches.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSourceBranchName(currentBranchName);
                      setShowCreateBranchModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Branch
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {branches.map(b => (
                    <div
                      key={b.name}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        b.name === currentBranchName
                          ? 'bg-purple-500/10 border-purple-500/35 text-purple-300'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold font-mono truncate flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                          {b.name}
                        </h4>
                        <span className="text-[9px] text-dark-muted font-mono block mt-1">HEAD: {b.headCommitHash.substring(0, 8)}</span>
                      </div>

                      <div className="flex gap-2">
                        {b.name !== currentBranchName && (
                          <button
                            onClick={() => handleCheckoutBranch(b.name)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-semibold rounded border border-white/10"
                          >
                            Checkout
                          </button>
                        )}
                        {!b.isDefault && (
                          <button
                            onClick={() => handleDeleteBranch(b.name)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphical representation */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                  Interactive Branch Graph Visualizer
                </h3>
                <BranchGraph
                  commits={commits}
                  branches={branches}
                  currentBranch={currentBranchName}
                  onCommitSelect={(commit) => {
                    alert(`Commit Summary:\n\nHash: ${commit.hash}\nAuthor: ${commit.author}\nMessage: ${commit.message}\nTime: ${new Date(commit.timestamp).toLocaleString()}\nBranch: ${commit.branchName}\nFiles: ${commit.filesChanged.map(f => f.filename).join(', ')}`);
                  }}
                />
              </div>

              {/* Terminal Simulator Console */}
              <div>
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-3.5">
                  Git Simulation Command Line Terminal
                </h3>
                <TerminalSimulator
                  repoId={REPO_ID}
                  currentBranch={currentBranchName}
                  onCommandExecuted={(output, status, newBranch) => {
                    // Update active checkout branch automatically if checking out
                    setCurrentBranchName(newBranch);
                    // Refresh data to reflect state modifications in the visual graph
                    refreshAllData();
                  }}
                />
              </div>

            </div>
          )}

        </div>
      </main>

      {/* CREATE BRANCH POPUP MODAL */}
      {showCreateBranchModal && (
        <div className="fixed inset-0 z-50 bg-[#06080e]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-md font-bold text-gray-200">Create New Branch</h3>
              <p className="text-xs text-dark-muted mt-0.5">Specify name and starting checkpoint hash point.</p>
            </div>
            
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-muted uppercase tracking-wider mb-1.5">
                  Source Branch Base
                </label>
                <select
                  value={sourceBranchName}
                  onChange={(e) => setSourceBranchName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none"
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
                  placeholder="e.g. feature/api-routes"
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBranchModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-glow"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN MERGE CONFLICT RESOLUTION OVERLAY */}
      {conflictOverlay && (
        <MergeConflictVisualizer
          conflictingFiles={conflictOverlay.conflictingFiles}
          sourceBranch={conflictOverlay.sourceBranch}
          targetBranch={conflictOverlay.targetBranch}
          onCancel={() => setConflictOverlay(null)}
          onResolve={handleConflictResolved}
        />
      )}

    </div>
  );
}

export default App;
