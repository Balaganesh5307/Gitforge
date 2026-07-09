import React, { useState, useEffect } from 'react';
import { Issue, Member } from '../types';
import {
  ListTodo,
  TrendingUp,
  Glasses,
  CheckCircle,
  AlertCircle,
  Tag,
  User,
  Plus
} from 'lucide-react';

interface KanbanBoardProps {
  repoId: string;
  members: Member[];
  onRefreshRepo: () => void;
  onSelectPage: (page: string) => void;
}

const COLUMNS: { id: Issue['status']; title: string; color: string; icon: any }[] = [
  { id: 'todo', title: 'To Do', color: 'border-blue-500/30 text-blue-400 bg-blue-500/[0.01]', icon: ListTodo },
  { id: 'in_progress', title: 'In Progress', color: 'border-amber-500/30 text-amber-400 bg-amber-500/[0.01]', icon: TrendingUp },
  { id: 'review', title: 'In Review', color: 'border-purple-500/30 text-purple-400 bg-purple-500/[0.01]', icon: Glasses },
  { id: 'done', title: 'Done', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/[0.01]', icon: CheckCircle }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  repoId,
  members,
  onRefreshRepo,
  onSelectPage
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [repoId]);

  // HTML5 Drag handlers
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggedIssueId(issueId);
    e.dataTransfer.setData('text/plain', issueId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Issue['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    const issueId = e.dataTransfer.getData('text/plain') || draggedIssueId;
    
    if (!issueId) return;

    // Find issue local state
    const issue = issues.find(i => i.id === issueId);
    if (!issue || issue.status === targetStatus) return;

    // Optimistic Update
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: targetStatus } : i));

    try {
      const response = await fetch(`http://localhost:5000/api/repos/${repoId}/issues/${issueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (response.ok) {
        await fetchIssues();
        onRefreshRepo();
      }
    } catch (err) {
      console.error(err);
      // Rollback on fail
      fetchIssues();
    } finally {
      setDraggedIssueId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-100 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-purple-400" />
            Project Kanban Board
          </h1>
          <p className="text-xs text-dark-muted font-mono mt-0.5">
            Drag cards between columns to update status instantly.
          </p>
        </div>

        <button
          onClick={() => onSelectPage('issues')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold shadow-glow flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Issue Card
        </button>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[70vh] min-h-[500px]">
        {COLUMNS.map((col) => {
          const colIssues = issues.filter(i => i.status === col.id);
          const isDraggingOver = dragOverCol === col.id;
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border flex flex-col h-full transition-all duration-200 ${col.color} ${
                isDraggingOver 
                  ? 'border-purple-500/40 bg-purple-500/[0.03] scale-[1.01] shadow-lg' 
                  : 'border-white/5 bg-[#0a0f1d]/30'
              }`}
            >
              
              {/* Column title */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ColIcon className="w-4 h-4" />
                  {col.title}
                </div>
                <span className="text-xs font-mono text-dark-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                  {colIssues.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-grow overflow-y-auto p-3 space-y-3">
                {colIssues.length === 0 ? (
                  <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-xs text-dark-muted font-mono select-none">
                    Drop tasks here
                  </div>
                ) : (
                  colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      className="glass-panel p-4 rounded-xl border border-white/5 hover:border-purple-500/20 shadow-md cursor-grab active:cursor-grabbing hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <span className="text-[10px] font-mono text-dark-muted block">#{issue.id.replace('iss-', '')}</span>
                      <h4 className="text-sm font-bold text-gray-200 mt-1 leading-snug line-clamp-2">
                        {issue.title}
                      </h4>

                      {/* Labels */}
                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {issue.labels.map(l => (
                            <span key={l} className="text-[9px] font-mono bg-white/5 text-gray-400 border border-white/5 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" />
                              {l}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Priority & Assignee */}
                      <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/5 text-[10px] font-mono">
                        <span className={`font-semibold uppercase ${
                          issue.priority === 'high' ? 'text-red-400' : issue.priority === 'medium' ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                          {issue.priority}
                        </span>

                        <div className="flex items-center gap-1 text-purple-300">
                          {issue.assignees.length > 0 ? (
                            <>
                              <User className="w-3 h-3" />
                              <span>{issue.assignees[0] === 'you' ? 'you' : issue.assignees[0]}</span>
                            </>
                          ) : (
                            <span className="text-gray-600">Unassigned</span>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
