export interface Member {
  id: string;
  username: string;
  avatarUrl: string;
  role: 'owner' | 'collaborator' | 'bot';
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  content: string;
}

export interface Commit {
  hash: string;
  repoId: string;
  branchName: string;
  message: string;
  author: string;
  parentHashes: string[];
  filesChanged: FileChange[];
  timestamp: string;
}

export interface Branch {
  id: string;
  repoId: string;
  name: string;
  headCommitHash: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  owner: string;
  currentBranch?: string;
  createdAt: string;
}

export interface PRComment {
  id: string;
  author: string;
  body: string;
  filename?: string;
  line?: number;
  createdAt: string;
}

export interface PRReview {
  author: string;
  status: 'approved' | 'changes_requested';
  body: string;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  repoId: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed';
  author: string;
  comments: PRComment[];
  reviews: PRReview[];
  createdAt: string;
  mergedAt?: string;
}

export interface IssueComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  repoId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignees: string[];
  labels: string[];
  comments: IssueComment[];
  createdAt: string;
}

export interface Activity {
  id: string;
  repoId: string;
  type: 'commit' | 'pr_open' | 'pr_merge' | 'pr_review' | 'issue_open' | 'issue_resolve' | 'branch_create' | 'branch_delete';
  message: string;
  user: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  verificationCode?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;
  createdAt: string;
}

export interface DbData {
  members: Member[];
  repositories: Repository[];
  branches: Branch[];
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
  activities: Activity[];
  users: User[];
}
