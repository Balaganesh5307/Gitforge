import React, { useState, useRef, useEffect } from 'react';
import { Terminal, CornerDownLeft, Play, Info } from 'lucide-react';

interface TerminalSimulatorProps {
  repoId: string;
  currentBranch: string;
  onCommandExecuted: (output: string, status: 'success' | 'error', newBranch: string) => void;
}

export const TerminalSimulator: React.FC<TerminalSimulatorProps> = ({
  repoId,
  currentBranch,
  onCommandExecuted
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ text: string; type: 'cmd' | 'output' | 'error' | 'success' }>>([
    { text: 'GitForge Command Terminal Simulator v1.0.0', type: 'success' },
    { text: 'Type "git help" to display supported commands.', type: 'output' },
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of terminal logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [consoleLogs]);

  // Focus input when clicking terminal panel
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const executeCommand = async (commandText: string) => {
    const trimmed = commandText.trim();
    if (!trimmed) return;

    // Add command to log
    setConsoleLogs(prev => [...prev, { text: `gitforge@simulator [${currentBranch}] $ ${trimmed}`, type: 'cmd' }]);
    
    // Update history
    const updatedHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 50);
    setHistory(updatedHistory);
    setHistoryIndex(-1);
    setInput('');

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/terminal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: trimmed })
      });

      if (!response.ok) {
        throw new Error('Server connection lost.');
      }

      const result = await response.json();
      
      // Parse output colors if any (e.g. ANSI colors like \x1b[32m)
      const sanitizedOutput = result.output.replace(/\x1b\[\d+m/g, '');

      setConsoleLogs(prev => [
        ...prev,
        {
          text: sanitizedOutput,
          type: result.status === 'success' ? 'output' : 'error'
        }
      ]);

      // Trigger callback
      onCommandExecuted(sanitizedOutput, result.status, result.currentBranch);

    } catch (err: any) {
      setConsoleLogs(prev => [...prev, { text: `fatal: failed to connect to GitForge engine. Is server running?`, type: 'error' }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < history.length) {
          setHistoryIndex(nextIndex);
          setInput(history[nextIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
    inputRef.current?.focus();
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-white/5 flex flex-col h-[350px] shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="bg-[#0b0f19] px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <span className="text-xs text-dark-muted font-mono flex items-center gap-1.5 ml-2">
            <Terminal className="w-3.5 h-3.5" />
            gitforge-bash
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
            Active: {currentBranch}
          </span>
        </div>
      </div>

      {/* Terminal Display Logs */}
      <div
        className="flex-grow p-4 overflow-y-auto bg-[#05070c]/90 font-mono text-sm leading-relaxed cursor-text"
        onClick={handleTerminalClick}
      >
        <div className="space-y-1.5">
          {consoleLogs.map((log, index) => (
            <pre
              key={index}
              className={`whitespace-pre-wrap ${
                log.type === 'cmd'
                  ? 'text-purple-400 font-semibold'
                  : log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'success'
                  ? 'text-emerald-400 font-medium'
                  : 'text-gray-300'
              }`}
            >
              {log.text}
            </pre>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Terminal Input Box */}
      <div className="bg-[#070a10] border-t border-white/5 px-4 py-2 flex items-center gap-2">
        <span className="text-emerald-500 font-mono text-sm whitespace-nowrap">
          gitforge@simulator [
          <span className="text-purple-400 font-semibold">{currentBranch}</span>
          ] $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="git commit -m 'your message'..."
          className="flex-grow bg-transparent outline-none font-mono text-sm text-gray-100 border-none focus:ring-0 p-0"
        />
        <button
          onClick={() => executeCommand(input)}
          disabled={!input.trim()}
          className="text-dark-muted hover:text-purple-400 disabled:text-gray-700 transition-colors p-1"
          title="Run command"
        >
          <Play className="w-4 h-4 fill-current" />
        </button>
      </div>

      {/* Terminal Shortcuts Quick bar */}
      <div className="bg-[#090d16] px-4 py-1.5 border-t border-white/5 flex items-center justify-between text-xs text-dark-muted font-mono overflow-x-auto">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <Info className="w-3.5 h-3.5" /> Quick Cmds:
        </span>
        <div className="flex gap-2 flex-wrap select-none">
          {['git status', 'git branch', 'git checkout main', 'git log', 'git push'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleQuickCommand(cmd)}
              className="px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-300 transition-all text-[11px]"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
