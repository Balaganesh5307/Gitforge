import { Store } from './Store';
import { GitEngine } from './GitEngine';
import { FileChange } from '../models/types';

export interface TerminalOutput {
  output: string;
  status: 'success' | 'error';
  currentBranch: string;
}

class TerminalParserService {
  public parseCommand(repoId: string, commandStr: string): TerminalOutput {
    const cmd = commandStr.trim();
    const repo = Store.getRepository(repoId);
    if (!repo) {
      return { output: 'fatal: repository not found', status: 'error', currentBranch: 'main' };
    }

    const currentBranch = repo.currentBranch || 'main';

    if (!cmd.startsWith('git')) {
      return {
        output: `gitforge-shell: command not found: ${cmd.split(' ')[0]}\nType "git help" for supported commands.`,
        status: 'error',
        currentBranch
      };
    }

    const args = this.tokenize(cmd);
    if (args.length < 2) {
      return { output: 'usage: git <command> [<args>]', status: 'error', currentBranch };
    }

    const gitCommand = args[1];

    switch (gitCommand) {
      case 'help':
        return {
          output: `GitForge Simulator Terminal - Supported Commands:\n` +
            `  git status                  - Show working tree status\n` +
            `  git branch                  - List branches\n` +
            `  git branch <name>           - Create a new branch\n` +
            `  git checkout <name>         - Switch branches\n` +
            `  git checkout -b <name>      - Create and switch to new branch\n` +
            `  git commit -m "<message>"   - Record files changes to repository\n` +
            `  git log                     - Show commit logs\n` +
            `  git merge <branch>          - Merge another branch into current\n` +
            `  git push                    - Simulates push to origin repository`,
          status: 'success',
          currentBranch
        };

      case 'status': {
        const branch = Store.getBranch(repoId, currentBranch);
        if (!branch) {
          return { output: `fatal: ref HEAD not found`, status: 'error', currentBranch };
        }
        return {
          output: `On branch ${currentBranch}\nYour branch is up to date with 'origin/${currentBranch}'.\n\nnothing to commit, working tree clean`,
          status: 'success',
          currentBranch
        };
      }

      case 'branch': {
        if (args.length === 2) {
          // List branches
          const branches = Store.getBranches(repoId);
          const list = branches.map(b => (b.name === currentBranch ? `* \x1b[32m${b.name}\x1b[0m` : `  ${b.name}`)).join('\n');
          return { output: list, status: 'success', currentBranch };
        } else {
          // Create branch
          const newBranchName = args[2];
          try {
            GitEngine.createBranch(repoId, currentBranch, newBranchName);
            return { output: `Branch '${newBranchName}' successfully created.`, status: 'success', currentBranch };
          } catch (err: any) {
            return { output: `fatal: ${err.message}`, status: 'error', currentBranch };
          }
        }
      }

      case 'checkout': {
        if (args.length < 3) {
          return { output: 'error: branch name required\nusage: git checkout [-b] <branch>', status: 'error', currentBranch };
        }

        if (args[2] === '-b') {
          if (args.length < 4) {
            return { output: 'error: new branch name required\nusage: git checkout -b <branch>', status: 'error', currentBranch };
          }
          const newBranchName = args[3];
          try {
            GitEngine.createBranch(repoId, currentBranch, newBranchName);
            repo.currentBranch = newBranchName;
            Store.save();
            return {
              output: `Switched to a new branch '${newBranchName}'`,
              status: 'success',
              currentBranch: newBranchName
            };
          } catch (err: any) {
            return { output: `fatal: ${err.message}`, status: 'error', currentBranch };
          }
        } else {
          const targetBranchName = args[2];
          const branch = Store.getBranch(repoId, targetBranchName);
          if (!branch) {
            return { output: `error: pathspec '${targetBranchName}' did not match any file(s) known to git`, status: 'error', currentBranch };
          }
          repo.currentBranch = targetBranchName;
          Store.save();
          return {
            output: `Switched to branch '${targetBranchName}'`,
            status: 'success',
            currentBranch: targetBranchName
          };
        }
      }

      case 'commit': {
        // Look for -m flag
        const mIdx = args.indexOf('-m');
        if (mIdx === -1 || mIdx + 1 >= args.length) {
          return { output: 'error: switch `m\' requires a value\nusage: git commit -m "<message>"', status: 'error', currentBranch };
        }
        const message = args[mIdx + 1];

        // Simulate file changes
        const filesChanged: FileChange[] = [
          {
            filename: 'README.md',
            status: 'modified',
            additions: 2,
            deletions: 0,
            content: `# GitForge Simulator\nWelcome to the GitForge simulator!\nUse this to learn collaboration workflows, git commands, and code review processes.\n\nModified via terminal: ${message}`
          }
        ];

        try {
          const commit = GitEngine.commit(repoId, currentBranch, message, 'you', filesChanged);
          return {
            output: `[${currentBranch} ${commit.hash.substring(0, 7)}] ${message}\n 1 file changed, 2 insertions(+)`,
            status: 'success',
            currentBranch
          };
        } catch (err: any) {
          return { output: `fatal: ${err.message}`, status: 'error', currentBranch };
        }
      }

      case 'log': {
        const commits = Store.getCommitsForBranch(repoId, currentBranch);
        if (commits.length === 0) {
          return { output: 'fatal: current branch does not have any commits', status: 'error', currentBranch };
        }
        const output = commits
          .map(
            c =>
              `\x1b[33mcommit ${c.hash}\x1b[0m\n` +
              `Author: ${c.author}\n` +
              `Date:   ${new Date(c.timestamp).toLocaleString()}\n\n` +
              `    ${c.message}\n`
          )
          .join('\n');
        return { output, status: 'success', currentBranch };
      }

      case 'merge': {
        if (args.length < 3) {
          return { output: 'fatal: branch name required to merge\nusage: git merge <branch>', status: 'error', currentBranch };
        }
        const sourceBranch = args[2];
        try {
          const res = GitEngine.merge(repoId, sourceBranch, currentBranch, 'you');
          if (res.status === 'merged') {
            return {
              output: `Updating HEAD...\nFast-forward merge or three-way merge completed.\nMerge commit: ${res.commitHash?.substring(0, 7)}`,
              status: 'success',
              currentBranch
            };
          } else if (res.status === 'up_to_date') {
            return { output: 'Already up to date.', status: 'success', currentBranch };
          } else {
            const conflictFiles = res.conflictingFiles?.map(f => f.filename).join(', ') || '';
            return {
              output: `Auto-merging...\nCONFLICT (content): Merge conflict in ${conflictFiles}\nAutomatic merge failed; fix conflicts and then commit the result.\nUse the visual PR/Merge Conflict screen to resolve this!`,
              status: 'error',
              currentBranch
            };
          }
        } catch (err: any) {
          return { output: `fatal: ${err.message}`, status: 'error', currentBranch };
        }
      }

      case 'push':
        return {
          output: `Enumerating objects: 5, done.\nCounting objects: 100% (5/5), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (3/3), done.\nWriting objects: 100% (3/3), 320 bytes | 320.00 KiB/s, done.\nTotal 3 (delta 1), reused 0 (delta 0)\nTo github.com:you/GitForge-Simulator-Project.git\n   HEAD -> ${currentBranch}\nEverything up-to-date`,
          status: 'success',
          currentBranch
        };

      default:
        return {
          output: `git: '${gitCommand}' is not a git command. See 'git help'.`,
          status: 'error',
          currentBranch
        };
    }
  }

  /**
   * Helper to parse quotes inside arguments. E.g. git commit -m "hello world"
   * yields ["git", "commit", "-m", "hello world"]
   */
  private tokenize(cmd: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < cmd.length; i++) {
      const char = cmd[i];

      if (char === '"' || char === "'") {
        if (inQuotes && char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          result.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      result.push(current);
    }

    return result;
  }
}

export const TerminalParser = new TerminalParserService();
