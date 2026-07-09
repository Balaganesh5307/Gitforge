import { Store, generateHash } from './Store';
import { Commit, Branch, FileChange, Repository } from '../models/types';

export interface MergeResult {
  status: 'merged' | 'conflict' | 'up_to_date';
  commitHash?: string;
  conflictingFiles?: {
    filename: string;
    ourContent: string;
    theirContent: string;
    mergedMarkerContent: string;
  }[];
}

class GitEngineService {
  /**
   * Find the Lowest Common Ancestor (LCA) commit of two branches.
   */
  public findLCA(repoId: string, commitA: string, commitB: string): string | null {
    if (!commitA || !commitB) return null;
    if (commitA === commitB) return commitA;

    const commits = Store.getCommits(repoId);
    const commitsMap = new Map<string, Commit>();
    commits.forEach(c => commitsMap.set(c.hash, c));

    // Get ancestor paths
    const getAncestors = (startHash: string): Set<string> => {
      const visited = new Set<string>();
      const queue = [startHash];
      while (queue.length > 0) {
        const hash = queue.shift()!;
        if (!visited.has(hash)) {
          visited.add(hash);
          const c = commitsMap.get(hash);
          if (c) {
            queue.push(...c.parentHashes);
          }
        }
      }
      return visited;
    };

    const ancestorsA = getAncestors(commitA);
    
    // Perform BFS from B to find the closest ancestor present in A
    const visitedB = new Set<string>();
    const queueB = [commitB];

    while (queueB.length > 0) {
      const hash = queueB.shift()!;
      if (ancestorsA.has(hash)) {
        return hash; // Found the lowest common ancestor
      }
      if (!visitedB.has(hash)) {
        visitedB.add(hash);
        const c = commitsMap.get(hash);
        if (c) {
          queueB.push(...c.parentHashes);
        }
      }
    }

    return null;
  }

  /**
   * Retrieves the snapshot of all files and contents at a specific commit hash.
   */
  public getFileSnapshotAtCommit(repoId: string, commitHash: string): Map<string, string> {
    const fileMap = new Map<string, string>();
    const commits = Store.getCommits(repoId);
    const commitsMap = new Map<string, Commit>();
    commits.forEach(c => commitsMap.set(c.hash, c));

    // Traverse from root to this commit to rebuild files state
    const path: Commit[] = [];
    let currentHash: string | null = commitHash;
    const visited = new Set<string>();

    while (currentHash && !visited.has(currentHash)) {
      visited.add(currentHash);
      const commit = commitsMap.get(currentHash);
      if (commit) {
        path.unshift(commit); // Ancestor first
        currentHash = commit.parentHashes[0] || null; // Trace primary parent
      } else {
        break;
      }
    }

    // Play commits forward
    for (const commit of path) {
      for (const file of commit.filesChanged) {
        if (file.status === 'deleted') {
          fileMap.delete(file.filename);
        } else {
          fileMap.set(file.filename, file.content);
        }
      }
    }

    return fileMap;
  }

  /**
   * Commits changes onto a branch
   */
  public commit(
    repoId: string,
    branchName: string,
    message: string,
    author: string,
    filesChanged: FileChange[]
  ): Commit {
    const branch = Store.getBranch(repoId, branchName);
    if (!branch) {
      throw new Error(`Branch ${branchName} not found`);
    }

    const newHash = generateHash();
    const parentHashes = branch.headCommitHash ? [branch.headCommitHash] : [];

    const newCommit: Commit = {
      hash: newHash,
      repoId,
      branchName,
      message,
      author,
      parentHashes,
      filesChanged,
      timestamp: new Date().toISOString()
    };

    Store.createCommit(newCommit);

    // Update branch head
    branch.headCommitHash = newHash;
    Store.saveBranch(branch);

    Store.createActivity(
      repoId,
      'commit',
      `pushed commit ${newHash.substring(0, 8)} to ${branchName}`,
      author
    );

    return newCommit;
  }

  /**
   * Checkout or create new branch
   */
  public createBranch(repoId: string, sourceBranchName: string, newBranchName: string): Branch {
    const existing = Store.getBranch(repoId, newBranchName);
    if (existing) {
      throw new Error(`Branch ${newBranchName} already exists`);
    }

    const sourceBranch = Store.getBranch(repoId, sourceBranchName);
    if (!sourceBranch) {
      throw new Error(`Source branch ${sourceBranchName} not found`);
    }

    const newBranch: Branch = {
      id: 'b-' + Math.random().toString(36).substr(2, 9),
      repoId,
      name: newBranchName,
      headCommitHash: sourceBranch.headCommitHash,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    Store.saveBranch(newBranch);
    Store.createActivity(repoId, 'branch_create', `created branch ${newBranchName} from ${sourceBranchName}`, 'you');

    return newBranch;
  }

  /**
   * Merge source branch into target branch
   */
  public merge(repoId: string, sourceBranchName: string, targetBranchName: string, author: string): MergeResult {
    const sourceBranch = Store.getBranch(repoId, sourceBranchName);
    const targetBranch = Store.getBranch(repoId, targetBranchName);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Invalid source or target branch');
    }

    const sourceHead = sourceBranch.headCommitHash;
    const targetHead = targetBranch.headCommitHash;

    if (sourceHead === targetHead) {
      return { status: 'up_to_date' };
    }

    // Find Lowest Common Ancestor
    const lca = this.findLCA(repoId, sourceHead, targetHead);
    if (!lca) {
      throw new Error('No common ancestor found (orphan branches cannot merge in this simulator)');
    }

    if (lca === sourceHead) {
      // Target is ahead of Source, nothing to merge
      return { status: 'up_to_date' };
    }

    if (lca === targetHead) {
      // Fast-forward merge is possible!
      targetBranch.headCommitHash = sourceHead;
      Store.saveBranch(targetBranch);
      Store.createActivity(
        repoId,
        'pr_merge',
        `merged branch ${sourceBranchName} into ${targetBranchName} (fast-forward)`,
        author
      );
      return { status: 'merged', commitHash: sourceHead };
    }

    // Three-way merge. Detect conflicts.
    const lcaSnapshot = this.getFileSnapshotAtCommit(repoId, lca);
    const sourceSnapshot = this.getFileSnapshotAtCommit(repoId, sourceHead);
    const targetSnapshot = this.getFileSnapshotAtCommit(repoId, targetHead);

    // Identify files modified on both sides since LCA
    const sourceModified = new Set<string>();
    const targetModified = new Set<string>();

    // 1. Files modified/added/deleted in source branch
    for (const [filename, content] of sourceSnapshot) {
      if (lcaSnapshot.get(filename) !== content) {
        sourceModified.add(filename);
      }
    }
    for (const filename of lcaSnapshot.keys()) {
      if (!sourceSnapshot.has(filename)) {
        sourceModified.add(filename); // Deleted in source
      }
    }

    // 2. Files modified/added/deleted in target branch
    for (const [filename, content] of targetSnapshot) {
      if (lcaSnapshot.get(filename) !== content) {
        targetModified.add(filename);
      }
    }
    for (const filename of lcaSnapshot.keys()) {
      if (!targetSnapshot.has(filename)) {
        targetModified.add(filename); // Deleted in target
      }
    }

    // 3. Find intersection of modified files (potential conflicts)
    const conflicts: {
      filename: string;
      ourContent: string;
      theirContent: string;
      mergedMarkerContent: string;
    }[] = [];

    for (const filename of sourceModified) {
      if (targetModified.has(filename)) {
        const ourContent = targetSnapshot.get(filename) || '';
        const theirContent = sourceSnapshot.get(filename) || '';
        
        // If contents are exactly the same, it's not a conflict, just take it
        if (ourContent !== theirContent) {
          const mergedMarkerContent = 
            `<<<<<<< HEAD (${targetBranchName})\n` +
            `${ourContent}\n` +
            `=======\n` +
            `${theirContent}\n` +
            `>>>>>>> ${sourceBranchName}`;

          conflicts.push({
            filename,
            ourContent,
            theirContent,
            mergedMarkerContent
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return {
        status: 'conflict',
        conflictingFiles: conflicts
      };
    }

    // No conflicts, auto-merge changes
    const mergedFiles: FileChange[] = [];
    const finalFilesSnapshot = new Map<string, string>(targetSnapshot);

    // Apply all source modifications that target didn't touch
    for (const filename of sourceModified) {
      const sourceContent = sourceSnapshot.get(filename);
      if (sourceContent === undefined) {
        // Deleted in source
        finalFilesSnapshot.delete(filename);
        mergedFiles.push({
          filename,
          status: 'deleted',
          additions: 0,
          deletions: 1,
          content: ''
        });
      } else {
        // Modified/Added in source
        const status = lcaSnapshot.has(filename) ? 'modified' : 'added';
        finalFilesSnapshot.set(filename, sourceContent);
        mergedFiles.push({
          filename,
          status,
          additions: sourceContent.split('\n').length,
          deletions: 0,
          content: sourceContent
        });
      }
    }

    // Create Merge Commit
    const mergeHash = generateHash();
    const mergeCommit: Commit = {
      hash: mergeHash,
      repoId,
      branchName: targetBranchName,
      message: `Merge branch '${sourceBranchName}' into ${targetBranchName}`,
      author,
      parentHashes: [targetHead, sourceHead],
      filesChanged: mergedFiles,
      timestamp: new Date().toISOString()
    };

    Store.createCommit(mergeCommit);

    targetBranch.headCommitHash = mergeHash;
    Store.saveBranch(targetBranch);

    Store.createActivity(
      repoId,
      'pr_merge',
      `merged branch ${sourceBranchName} into ${targetBranchName}`,
      author
    );

    return { status: 'merged', commitHash: mergeHash };
  }

  /**
   * Finalizes conflict resolution and merges branches
   */
  public resolveConflictAndMerge(
    repoId: string,
    sourceBranchName: string,
    targetBranchName: string,
    resolvedFiles: { filename: string; content: string }[],
    author: string
  ): Commit {
    const sourceBranch = Store.getBranch(repoId, sourceBranchName);
    const targetBranch = Store.getBranch(repoId, targetBranchName);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Invalid source or target branch');
    }

    const mergeHash = generateHash();
    
    // Map resolved files to file changes
    const filesChanged: FileChange[] = resolvedFiles.map(rf => ({
      filename: rf.filename,
      status: 'modified',
      additions: rf.content.split('\n').length,
      deletions: 0,
      content: rf.content
    }));

    const mergeCommit: Commit = {
      hash: mergeHash,
      repoId,
      branchName: targetBranchName,
      message: `Merge branch '${sourceBranchName}' into ${targetBranchName} (resolved conflicts)`,
      author,
      parentHashes: [targetBranch.headCommitHash, sourceBranch.headCommitHash],
      filesChanged,
      timestamp: new Date().toISOString()
    };

    Store.createCommit(mergeCommit);

    targetBranch.headCommitHash = mergeHash;
    Store.saveBranch(targetBranch);

    Store.createActivity(
      repoId,
      'pr_merge',
      `merged branch ${sourceBranchName} into ${targetBranchName} after resolving conflicts`,
      author
    );

    return mergeCommit;
  }
}

export const GitEngine = new GitEngineService();
