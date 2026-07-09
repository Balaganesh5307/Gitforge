import * as fs from 'fs';
import * as path from 'path';
import { DbData, Member, Repository, Branch, Commit, PullRequest, Issue, Activity } from '../models/types';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper to generate a simulated Git hash
export function generateHash(): string {
  return Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
}

const DEFAULT_MEMBERS: Member[] = [
  { id: 'you', username: 'you', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=you', role: 'owner' },
  { id: 'alice-coder', username: 'alice-coder', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=alice', role: 'bot' },
  { id: 'bob-reviewer', username: 'bob-reviewer', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=bob', role: 'bot' },
  { id: 'clara-automator', username: 'clara-automator', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=clara', role: 'bot' }
];

const DEFAULT_REPOS: Repository[] = [
  {
    id: 'gitforge-demo',
    name: 'GitForge-Simulator-Project',
    description: 'An interactive developer collaboration project to learn Git workflows, conflict resolutions, and project boards.',
    owner: 'you',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  }
];

const INIT_COMMITS: Commit[] = [
  {
    hash: 'fa28b1238910cd4f',
    repoId: 'gitforge-demo',
    branchName: 'main',
    message: 'Initial commit: setup structure and add README.md',
    author: 'you',
    parentHashes: [],
    filesChanged: [
      {
        filename: 'README.md',
        status: 'added',
        additions: 15,
        deletions: 0,
        content: '# GitForge Simulator\nWelcome to the GitForge simulator!\nUse this to learn collaboration workflows, git commands, and code review processes.\n'
      }
    ],
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    hash: 'db38a14fcd821a3b',
    repoId: 'gitforge-demo',
    branchName: 'main',
    message: 'feat: setup core web server framework',
    author: 'you',
    parentHashes: ['fa28b1238910cd4f'],
    filesChanged: [
      {
        filename: 'server.ts',
        status: 'added',
        additions: 25,
        deletions: 0,
        content: 'import express from "express";\nconst app = express();\napp.use(express.json());\napp.get("/", (req, res) => {\n  res.send("Server running!");\n});\napp.listen(3000, () => console.log("Server listening"));\n'
      },
      {
        filename: 'db.ts',
        status: 'added',
        additions: 10,
        deletions: 0,
        content: 'export const connectDb = () => {\n  console.log("Connecting database...");\n  // TODO: Add database driver initialization\n};\n'
      }
    ],
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    hash: 'style89a42cd9a84b',
    repoId: 'gitforge-demo',
    branchName: 'main',
    message: 'style: add global dark theme styling sheet',
    author: 'alice-coder',
    parentHashes: ['db38a14fcd821a3b'],
    filesChanged: [
      {
        filename: 'styles.css',
        status: 'added',
        additions: 18,
        deletions: 0,
        content: ':root {\n  --bg-color: #0b0f19;\n  --text-color: #f3f4f6;\n}\nbody {\n  background: var(--bg-color);\n  color: var(--text-color);\n  font-family: sans-serif;\n}\n'
      }
    ],
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    hash: 'auth783bc2a189f3',
    repoId: 'gitforge-demo',
    branchName: 'feature/auth',
    message: 'feat: add JWT authentication mechanisms',
    author: 'alice-coder',
    parentHashes: ['db38a14fcd821a3b'],
    filesChanged: [
      {
        filename: 'auth.ts',
        status: 'added',
        additions: 15,
        deletions: 0,
        content: 'import jwt from "jsonwebtoken";\nexport const generateToken = (userId: string) => {\n  return jwt.sign({ id: userId }, "SECRET_KEY", { expiresIn: "1h" });\n};\n'
      }
    ],
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    hash: 'auth912bc789fa12',
    repoId: 'gitforge-demo',
    branchName: 'feature/auth',
    message: 'feat: incorporate password hashing in login routes',
    author: 'alice-coder',
    parentHashes: ['auth783bc2a189f3'],
    filesChanged: [
      {
        filename: 'auth.ts',
        status: 'modified',
        additions: 10,
        deletions: 2,
        content: 'import jwt from "jsonwebtoken";\nimport bcrypt from "bcrypt";\n\nexport const hashPassword = async (pwd: string) => {\n  return await bcrypt.hash(pwd, 12);\n};\n\nexport const generateToken = (userId: string) => {\n  return jwt.sign({ id: userId }, "SECRET_KEY", { expiresIn: "1h" });\n};\n'
      }
    ],
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    hash: 'conf78a2cb49d012',
    repoId: 'gitforge-demo',
    branchName: 'bugfix/api-crash',
    message: 'fix: database connection handler safety checks',
    author: 'bob-reviewer',
    parentHashes: ['db38a14fcd821a3b'],
    filesChanged: [
      {
        filename: 'db.ts',
        status: 'modified',
        additions: 7,
        deletions: 3,
        content: 'export const connectDb = () => {\n  console.log("Safe Database Connection Starting...");\n  try {\n    // Simulated safe db launch\n    console.log("Database successfully initialized.");\n  } catch (err) {\n    console.error("Database connection failure:", err);\n  }\n};\n'
      }
    ],
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b-main',
    repoId: 'gitforge-demo',
    name: 'main',
    headCommitHash: 'style89a42cd9a84b',
    isDefault: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'b-auth',
    repoId: 'gitforge-demo',
    name: 'feature/auth',
    headCommitHash: 'auth912bc789fa12',
    isDefault: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'b-crash',
    repoId: 'gitforge-demo',
    name: 'bugfix/api-crash',
    headCommitHash: 'conf78a2cb49d012',
    isDefault: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_PRS: PullRequest[] = [
  {
    id: 'pr-1',
    repoId: 'gitforge-demo',
    title: 'style: global dark theme style definitions',
    description: 'Implements global CSS design tokens for dark theme. This provides a sleek, SaaS-like style to all our user interfaces.',
    sourceBranch: 'feature/dark-mode',
    targetBranch: 'main',
    status: 'merged',
    author: 'alice-coder',
    comments: [
      {
        id: 'c-1',
        author: 'bob-reviewer',
        body: 'Looks clean and respects our typography guideline. Merging.',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
        ],
    reviews: [
      {
        author: 'bob-reviewer',
        status: 'approved',
        body: 'Perfect styling configuration.',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    mergedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pr-2',
    repoId: 'gitforge-demo',
    title: 'feat: robust JWT login validation logic',
    description: 'This PR adds JWT token creation utilities and secure password hashing using bcrypt. Ready for code review.',
    sourceBranch: 'feature/auth',
    targetBranch: 'main',
    status: 'open',
    author: 'alice-coder',
    comments: [
      {
        id: 'c-2',
        author: 'bob-reviewer',
        body: 'Can we increase password security parameters slightly here to avoid weak hashes?',
        filename: 'auth.ts',
        line: 4,
        createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'c-3',
        author: 'alice-coder',
        body: 'Good catch, Bob! I updated the hash rounds to 12 in the latest commit.',
        filename: 'auth.ts',
        line: 4,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    reviews: [
      {
        author: 'bob-reviewer',
        status: 'approved',
        body: 'Code review checks have passed. Good job adapting security settings.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pr-3',
    repoId: 'gitforge-demo',
    title: 'fix: db crash handles safety checks',
    description: 'Adds connection error catching inside `db.ts` to prevent database outage from locking the server start script. Note: This overlaps with changes to `db.ts` made on other branches.',
    sourceBranch: 'bugfix/api-crash',
    targetBranch: 'main',
    status: 'open',
    author: 'bob-reviewer',
    comments: [
      {
        id: 'c-4',
        author: 'clara-automator',
        body: 'Automated test suite finished: warning detected. Overlapping revisions found on `db.ts` file. A merge conflict might occur.',
        createdAt: new Date(Date.now() - 0.9 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    reviews: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_ISSUES: Issue[] = [
  {
    id: 'iss-1',
    repoId: 'gitforge-demo',
    title: 'Fix server websocket memory leak under high request load',
    description: 'Websocket client sockets are not released on sudden disconnect. Memory builds up over 48 hours.',
    status: 'in_progress',
    priority: 'high',
    assignees: ['alice-coder'],
    labels: ['bug', 'performance'],
    comments: [
      {
        id: 'ic-1',
        author: 'clara-automator',
        body: 'Heap snapshot attached: Leak localized in `socket-controller.ts:45`.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'iss-2',
    repoId: 'gitforge-demo',
    title: 'Refactor database connection pool settings',
    description: 'Establish max connections limit and add reconnect logic to prevent connection pool exhaustion.',
    status: 'todo',
    priority: 'medium',
    assignees: ['bob-reviewer'],
    labels: ['refactor', 'database'],
    comments: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'iss-3',
    repoId: 'gitforge-demo',
    title: 'Support responsive sidebar layout toggles',
    description: 'Make repository page navigation accessible on mobile viewport width.',
    status: 'done',
    priority: 'low',
    assignees: ['alice-coder'],
    labels: ['enhancement', 'ui'],
    comments: [
      {
        id: 'ic-2',
        author: 'alice-coder',
        body: 'Implemented flex containers and stateful toggles. Closed.',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'act-1', repoId: 'gitforge-demo', type: 'commit', message: 'pushed commit fa28b1238910cd4f to main', user: 'you', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-2', repoId: 'gitforge-demo', type: 'commit', message: 'pushed commit db38a14fcd821a3b to main', user: 'you', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-3', repoId: 'gitforge-demo', type: 'commit', message: 'pushed commit style89a42cd9a84b to main', user: 'alice-coder', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-4', repoId: 'gitforge-demo', type: 'pr_open', message: 'opened pull request #1: Style/dark theme styling sheet', user: 'alice-coder', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-5', repoId: 'gitforge-demo', type: 'pr_merge', message: 'merged pull request #1 into main', user: 'you', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-6', repoId: 'gitforge-demo', type: 'commit', message: 'pushed commit auth783bc2a189f3 to feature/auth', user: 'alice-coder', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-7', repoId: 'gitforge-demo', type: 'pr_open', message: 'opened pull request #2: JWT login validation logic', user: 'alice-coder', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-8', repoId: 'gitforge-demo', type: 'commit', message: 'pushed commit auth912bc789fa12 to feature/auth', user: 'alice-coder', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'act-9', repoId: 'gitforge-demo', type: 'pr_review', message: 'approved pull request #2', user: 'bob-reviewer', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
];

class StoreService {
  private data: DbData;

  constructor() {
    this.data = {
      members: [],
      repositories: [],
      branches: [],
      commits: [],
      pullRequests: [],
      issues: [],
      activities: []
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        // Pre-populate database
        this.data = {
          members: DEFAULT_MEMBERS,
          repositories: DEFAULT_REPOS,
          branches: DEFAULT_BRANCHES,
          commits: INIT_COMMITS,
          pullRequests: DEFAULT_PRS,
          issues: DEFAULT_ISSUES,
          activities: DEFAULT_ACTIVITIES
        };
        this.save();
      }
    } catch (error) {
      console.error('Error initializing simulated Store database:', error);
      // Fallback in-memory state
      this.data = {
        members: DEFAULT_MEMBERS,
        repositories: DEFAULT_REPOS,
        branches: DEFAULT_BRANCHES,
        commits: INIT_COMMITS,
        pullRequests: DEFAULT_PRS,
        issues: DEFAULT_ISSUES,
        activities: DEFAULT_ACTIVITIES
      };
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write database file:', error);
    }
  }

  // Members
  public getMembers(): Member[] {
    return this.data.members;
  }

  public getMember(id: string): Member | undefined {
    return this.data.members.find(m => m.id === id || m.username === id);
  }

  // Repositories
  public getRepositories(): Repository[] {
    return this.data.repositories;
  }

  public getRepository(id: string): Repository | undefined {
    return this.data.repositories.find(r => r.id === id);
  }

  public createRepository(repo: Repository): Repository {
    this.data.repositories.push(repo);
    this.save();
    return repo;
  }

  // Branches
  public getBranches(repoId: string): Branch[] {
    return this.data.branches.filter(b => b.repoId === repoId);
  }

  public getBranch(repoId: string, name: string): Branch | undefined {
    return this.data.branches.find(b => b.repoId === repoId && b.name === name);
  }

  public saveBranch(branch: Branch): Branch {
    const idx = this.data.branches.findIndex(b => b.repoId === branch.repoId && b.name === branch.name);
    if (idx !== -1) {
      this.data.branches[idx] = branch;
    } else {
      this.data.branches.push(branch);
    }
    this.save();
    return branch;
  }

  public deleteBranch(repoId: string, name: string): boolean {
    const originalLen = this.data.branches.length;
    this.data.branches = this.data.branches.filter(b => !(b.repoId === repoId && b.name === name));
    this.save();
    return this.data.branches.length < originalLen;
  }

  // Commits
  public getCommits(repoId: string): Commit[] {
    return this.data.commits.filter(c => c.repoId === repoId);
  }

  public getCommit(repoId: string, hash: string): Commit | undefined {
    return this.data.commits.find(c => c.repoId === repoId && c.hash === hash);
  }

  public getCommitsForBranch(repoId: string, branchName: string): Commit[] {
    // Collect all commits reachable from head commit
    const branch = this.getBranch(repoId, branchName);
    if (!branch) return [];
    
    const commitsMap = new Map<string, Commit>();
    this.getCommits(repoId).forEach(c => commitsMap.set(c.hash, c));

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
    
    // Return sorted chronologically by timestamp (descending)
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public createCommit(commit: Commit): Commit {
    this.data.commits.push(commit);
    this.save();
    return commit;
  }

  // Pull Requests
  public getPullRequests(repoId: string): PullRequest[] {
    return this.data.pullRequests.filter(pr => pr.repoId === repoId);
  }

  public getPullRequest(id: string): PullRequest | undefined {
    return this.data.pullRequests.find(pr => pr.id === id);
  }

  public savePullRequest(pr: PullRequest): PullRequest {
    const idx = this.data.pullRequests.findIndex(p => p.id === pr.id);
    if (idx !== -1) {
      this.data.pullRequests[idx] = pr;
    } else {
      this.data.pullRequests.push(pr);
    }
    this.save();
    return pr;
  }

  // Issues
  public getIssues(repoId: string): Issue[] {
    return this.data.issues.filter(iss => iss.repoId === repoId);
  }

  public getIssue(id: string): Issue | undefined {
    return this.data.issues.find(iss => iss.id === id);
  }

  public saveIssue(issue: Issue): Issue {
    const idx = this.data.issues.findIndex(i => i.id === issue.id);
    if (idx !== -1) {
      this.data.issues[idx] = issue;
    } else {
      this.data.issues.push(issue);
    }
    this.save();
    return issue;
  }

  public deleteIssue(id: string): boolean {
    const originalLen = this.data.issues.length;
    this.data.issues = this.data.issues.filter(i => i.id !== id);
    this.save();
    return this.data.issues.length < originalLen;
  }

  // Activities
  public getActivities(repoId: string): Activity[] {
    return this.data.activities
      .filter(act => act.repoId === repoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createActivity(repoId: string, type: Activity['type'], message: string, user: string): Activity {
    const newActivity: Activity = {
      id: 'act-' + Math.random().toString(36).substr(2, 9),
      repoId,
      type,
      message,
      user,
      createdAt: new Date().toISOString()
    };
    this.data.activities.push(newActivity);
    this.save();
    return newActivity;
  }
}

export const Store = new StoreService();
