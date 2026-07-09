import express from 'express';
import cors from 'cors';
import { Store } from './services/Store';
import { GitEngine } from './services/GitEngine';
import { BotService } from './services/BotService';
import { TerminalParser } from './services/TerminalParser';
import { signup, login, verifyEmail, forgotPassword, resetPassword, getMe, requireAuth } from './controllers/AuthController';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// AUTHENTICATION ROUTES
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/verify', verifyEmail);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);
app.get('/api/auth/me', requireAuth, getMe as any);

// API STATUS
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', simulator: 'GitForge online' });
});

// MEMBERS
app.get('/api/repos/:repoId/members', (req, res) => {
  try {
    const members = Store.getMembers();
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// REPOS
app.get('/api/repos', (req, res) => {
  try {
    res.json(Store.getRepositories());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/repos/:repoId', (req, res) => {
  const { repoId } = req.params;
  const repo = Store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }
  res.json(repo);
});

app.post('/api/repos/:repoId/checkout', (req, res) => {
  const { repoId } = req.params;
  const { branchName } = req.body;
  const repo = Store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const branch = Store.getBranch(repoId, branchName);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  repo.currentBranch = branchName;
  Store.save();
  res.json({ message: `Checked out branch ${branchName}`, currentBranch: branchName });
});

// BRANCHES
app.get('/api/repos/:repoId/branches', (req, res) => {
  const { repoId } = req.params;
  res.json(Store.getBranches(repoId));
});

app.post('/api/repos/:repoId/branches', (req, res) => {
  const { repoId } = req.params;
  const { sourceBranch, newBranch } = req.body;
  try {
    const branch = GitEngine.createBranch(repoId, sourceBranch, newBranch);
    res.status(201).json(branch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/repos/:repoId/branches/:branchName', (req, res) => {
  const { repoId, branchName } = req.params;
  const branch = Store.getBranch(repoId, branchName);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }
  if (branch.isDefault) {
    return res.status(400).json({ error: 'Cannot delete default branch' });
  }

  const repo = Store.getRepository(repoId);
  if (repo && repo.currentBranch === branchName) {
    repo.currentBranch = 'main'; // Reset to main
  }

  Store.deleteBranch(repoId, branchName);
  Store.createActivity(repoId, 'branch_delete', `deleted branch ${branchName}`, 'you');
  res.json({ success: true, message: `Branch ${branchName} deleted` });
});

app.put('/api/repos/:repoId/branches/:branchName', (req, res) => {
  const { repoId, branchName } = req.params;
  const { newName } = req.body;

  if (!newName) {
    return res.status(400).json({ error: 'newName is required' });
  }

  const branch = Store.getBranch(repoId, branchName);
  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  if (branch.isDefault) {
    return res.status(400).json({ error: 'Cannot rename default branch' });
  }

  const existing = Store.getBranch(repoId, newName);
  if (existing) {
    return res.status(400).json({ error: `Branch ${newName} already exists` });
  }

  const repo = Store.getRepository(repoId);
  if (repo && repo.currentBranch === branchName) {
    repo.currentBranch = newName;
  }

  branch.name = newName;
  Store.save();

  Store.createActivity(repoId, 'branch_rename', `renamed branch ${branchName} to ${newName}`, 'you');
  res.json({ success: true, message: `Branch renamed to ${newName}` });
});

app.get('/api/repos/:repoId/compare', (req, res) => {
  const { repoId } = req.params;
  const { source, target } = req.query;

  if (!source || !target) {
    return res.status(400).json({ error: 'source and target parameters are required' });
  }

  try {
    const status = GitEngine.checkMergeStatus(repoId, source as string, target as string);
    const sourceCommits = Store.getCommitsForBranch(repoId, source as string);
    const targetCommits = Store.getCommitsForBranch(repoId, target as string);
    
    const targetHashes = new Set(targetCommits.map(c => c.hash));
    const uniqueCommits = sourceCommits.filter(c => !targetHashes.has(c.hash));

    res.json({
      mergeStatus: status,
      commits: uniqueCommits
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// COMMITS
app.get('/api/repos/:repoId/commits', (req, res) => {
  const { repoId } = req.params;
  res.json(Store.getCommits(repoId));
});

app.post('/api/repos/:repoId/commits/cherry-pick', (req, res) => {
  const { repoId } = req.params;
  const { commitHash, branchName } = req.body;

  if (!commitHash || !branchName) {
    return res.status(400).json({ error: 'commitHash and branchName are required' });
  }

  const commits = Store.getCommits(repoId);
  const originalCommit = commits.find(c => c.hash === commitHash);
  if (!originalCommit) {
    return res.status(404).json({ error: 'Commit not found' });
  }

  try {
    const newCommit = GitEngine.commit(
      repoId,
      branchName,
      `cherry-pick: ${originalCommit.message}`,
      'you',
      originalCommit.filesChanged
    );
    res.status(201).json(newCommit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/repos/:repoId/commits/revert', (req, res) => {
  const { repoId } = req.params;
  const { commitHash, branchName } = req.body;

  if (!commitHash || !branchName) {
    return res.status(400).json({ error: 'commitHash and branchName are required' });
  }

  const commits = Store.getCommits(repoId);
  const originalCommit = commits.find(c => c.hash === commitHash);
  if (!originalCommit) {
    return res.status(404).json({ error: 'Commit not found' });
  }

  try {
    const invertedFiles = originalCommit.filesChanged.map(f => ({
      filename: f.filename,
      status: f.status === 'added' ? 'deleted' as const : f.status === 'deleted' ? 'added' as const : 'modified' as const,
      content: f.content || '',
      additions: f.deletions,
      deletions: f.additions
    }));

    const newCommit = GitEngine.commit(
      repoId,
      branchName,
      `revert: ${originalCommit.message}`,
      'you',
      invertedFiles
    );
    res.status(201).json(newCommit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/repos/:repoId/commits/branch/:branchName', (req, res) => {
  const { repoId, branchName } = req.params;
  res.json(Store.getCommitsForBranch(repoId, branchName));
});

app.post('/api/repos/:repoId/commits', (req, res) => {
  const { repoId } = req.params;
  const { branchName, message, author, filesChanged } = req.body;
  try {
    const commit = GitEngine.commit(repoId, branchName, message, author, filesChanged);
    res.status(201).json(commit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PULL REQUESTS
app.get('/api/repos/:repoId/pulls', (req, res) => {
  const { repoId } = req.params;
  res.json(Store.getPullRequests(repoId));
});

app.get('/api/repos/:repoId/pulls/:prId', (req, res) => {
  const pr = Store.getPullRequest(req.params.prId);
  if (!pr) return res.status(404).json({ error: 'PR not found' });
  res.json(pr);
});

app.post('/api/repos/:repoId/pulls', (req, res) => {
  const { repoId } = req.params;
  const { title, description, sourceBranch, targetBranch, author } = req.body;

  const prs = Store.getPullRequests(repoId);
  const prId = `pr-${prs.length + 1}`;

  const newPR = {
    id: prId,
    repoId,
    title,
    description,
    sourceBranch,
    targetBranch,
    status: 'open' as const,
    author,
    comments: [],
    reviews: [],
    createdAt: new Date().toISOString()
  };

  Store.savePullRequest(newPR);
  Store.createActivity(repoId, 'pr_open', `opened pull request #${prId.replace('pr-', '')}: "${title}"`, author);
  res.status(201).json(newPR);
});

app.post('/api/repos/:repoId/pulls/:prId/comments', (req, res) => {
  const { prId } = req.params;
  const { author, body, filename, line } = req.body;

  const pr = Store.getPullRequest(prId);
  if (!pr) return res.status(404).json({ error: 'PR not found' });

  const newComment = {
    id: 'c-' + Math.random().toString(36).substr(2, 9),
    author,
    body,
    filename,
    line,
    createdAt: new Date().toISOString()
  };

  pr.comments.push(newComment);
  Store.savePullRequest(pr);
  res.status(201).json(newComment);
});

app.post('/api/repos/:repoId/pulls/:prId/reviews', (req, res) => {
  const { prId, repoId } = req.params;
  const { author, status, body } = req.body;

  const pr = Store.getPullRequest(prId);
  if (!pr) return res.status(404).json({ error: 'PR not found' });

  pr.reviews.push({
    author,
    status,
    body,
    createdAt: new Date().toISOString()
  });

  Store.savePullRequest(pr);
  Store.createActivity(repoId, 'pr_review', `reviewed and ${status.replace('_', ' ')} PR #${prId.replace('pr-', '')}`, author);
  res.status(201).json(pr);
});

app.post('/api/repos/:repoId/pulls/:prId/merge', (req, res) => {
  const { repoId, prId } = req.params;
  const { author } = req.body;

  const pr = Store.getPullRequest(prId);
  if (!pr) return res.status(404).json({ error: 'PR not found' });

  try {
    const result = GitEngine.merge(repoId, pr.sourceBranch, pr.targetBranch, author);
    if (result.status === 'merged') {
      pr.status = 'merged';
      pr.mergedAt = new Date().toISOString();
      Store.savePullRequest(pr);
      res.json({ success: true, status: 'merged', commitHash: result.commitHash });
    } else if (result.status === 'conflict') {
      res.json({ success: false, status: 'conflict', conflictingFiles: result.conflictingFiles });
    } else {
      res.json({ success: true, status: 'up_to_date' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/repos/:repoId/pulls/:prId/resolve', (req, res) => {
  const { repoId, prId } = req.params;
  const { author, resolvedFiles } = req.body;

  const pr = Store.getPullRequest(prId);
  if (!pr) return res.status(404).json({ error: 'PR not found' });

  try {
    const mergeCommit = GitEngine.resolveConflictAndMerge(
      repoId,
      pr.sourceBranch,
      pr.targetBranch,
      resolvedFiles,
      author
    );

    pr.status = 'merged';
    pr.mergedAt = new Date().toISOString();
    Store.savePullRequest(pr);

    res.json({ success: true, status: 'merged', commitHash: mergeCommit.hash });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ISSUES
app.get('/api/repos/:repoId/issues', (req, res) => {
  const { repoId } = req.params;
  res.json(Store.getIssues(repoId));
});

app.get('/api/repos/:repoId/issues/:issueId', (req, res) => {
  const issue = Store.getIssue(req.params.issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(issue);
});

app.post('/api/repos/:repoId/issues', (req, res) => {
  const { repoId } = req.params;
  const { title, description, priority, assignees, labels } = req.body;

  const issues = Store.getIssues(repoId);
  const issueId = `iss-${issues.length + 1}`;

  const newIssue = {
    id: issueId,
    repoId,
    title,
    description,
    status: 'todo' as const,
    priority,
    assignees: assignees || [],
    labels: labels || [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  Store.saveIssue(newIssue);
  Store.createActivity(repoId, 'issue_open', `opened issue #${issueId.replace('iss-', '')}: "${title}"`, 'you');
  res.status(201).json(newIssue);
});

app.put('/api/repos/:repoId/issues/:issueId', (req, res) => {
  const { issueId, repoId } = req.params;
  const updateData = req.body;

  const issue = Store.getIssue(issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  // Update allowed fields
  if (updateData.status) {
    const oldStatus = issue.status;
    issue.status = updateData.status;
    if (oldStatus !== updateData.status && updateData.status === 'done') {
      Store.createActivity(repoId, 'issue_resolve', `closed issue #${issueId.replace('iss-', '')}: "${issue.title}"`, 'you');
    }
  }
  if (updateData.priority) issue.priority = updateData.priority;
  if (updateData.assignees) issue.assignees = updateData.assignees;
  if (updateData.labels) issue.labels = updateData.labels;

  Store.saveIssue(issue);
  res.json(issue);
});

app.post('/api/repos/:repoId/issues/:issueId/comments', (req, res) => {
  const { issueId } = req.params;
  const { author, body } = req.body;

  const issue = Store.getIssue(issueId);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  const newComment = {
    id: 'ic-' + Math.random().toString(36).substr(2, 9),
    author,
    body,
    createdAt: new Date().toISOString()
  };

  issue.comments.push(newComment);
  Store.saveIssue(issue);
  res.status(201).json(newComment);
});

app.delete('/api/repos/:repoId/issues/:issueId', (req, res) => {
  const success = Store.deleteIssue(req.params.issueId);
  res.json({ success });
});

// ACTIVITIES
app.get('/api/repos/:repoId/activities', (req, res) => {
  const { repoId } = req.params;
  res.json(Store.getActivities(repoId));
});

// TERMINAL INTERACTION
app.post('/api/repos/:repoId/terminal', (req, res) => {
  const { repoId } = req.params;
  const { command } = req.body;

  try {
    const output = TerminalParser.parseCommand(repoId, command);
    res.json(output);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// BOT SIMULATION TRIGGERS
app.post('/api/simulation/:repoId/issue', (req, res) => {
  const { repoId } = req.params;
  try {
    const issue = BotService.simulateOpenIssue(repoId);
    res.status(201).json(issue);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/simulation/:repoId/commit', (req, res) => {
  const { repoId } = req.params;
  const { branchName } = req.body;
  try {
    const commit = BotService.simulatePushCommit(repoId, branchName);
    res.status(201).json(commit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/simulation/:repoId/review/:prId', (req, res) => {
  const { repoId, prId } = req.params;
  try {
    const pr = BotService.simulateReviewPR(repoId, prId);
    res.json(pr);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/simulation/:repoId/conflict', (req, res) => {
  const { repoId } = req.params;
  try {
    const pr = BotService.triggerConflictScenario(repoId);
    res.status(201).json(pr);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// LAUNCH SERVER
app.listen(PORT, () => {
  console.log(`GitForge backend active on http://localhost:${PORT}`);
});
