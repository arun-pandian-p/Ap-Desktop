import React, { useState } from 'react';
import { 
  Plus, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Flag, 
  MoreVertical, 
  CheckCircle2, 
  Timer, 
  Search,
  Sparkles
} from 'lucide-react';
import { Task, ScreenId, PriorityLevel } from '@/types';

interface PlannerViewProps {
  tasks: Task[];
  onToggleTask: (id: string, currentStatus: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'created_at'>) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onNavigate,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [quickNote, setQuickNote] = useState('Focus on sliding window variable size edge cases today.');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      priority,
      status: 'todo',
      due_date: 'Today, 6:00 PM',
      estimated_minutes: 25,
    });
    setNewTitle('');
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Single clean title (fixes Section 16.13 ghost title defect) */}
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Planner</h1>
          <p className="text-xs text-gray-500 mt-1">Organize your daily study sessions and algorithmic milestones</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
            >
              Kanban Board
            </button>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Today's Tasks</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{tasks.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-emerald-600">Completed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{completedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-amber-600">Pending</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{tasks.length - completedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-blue-600">Study Time Today</span>
          <div className="text-2xl font-black text-blue-600 mt-1">4.2h</div>
        </div>
      </div>

      {/* Quick Add Row */}
      <form onSubmit={handleQuickAdd} className="bg-white p-3 rounded-2xl border border-[#E8EAF2] flex items-center gap-3 shadow-2xs">
        <input
          type="text"
          placeholder="Add a new task (e.g., 'Review SQL CTEs tonight !high')..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-[#E11D26]"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityLevel)}
          className="text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden font-semibold text-gray-700"
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>
        <button
          type="submit"
          className="px-5 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          Add Task
        </button>
      </form>

      {/* Main List & Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">TODAY'S PRIORITIES</h3>
            <div className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isCompleted ? 'bg-gray-50/60 border-gray-100 opacity-60' : 'bg-white border-[#E8EAF2] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleTask(task.id, task.status)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-[#E11D26]'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div className={`text-xs font-bold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>{task.due_date || 'Today'}</span>
                          <span>•</span>
                          <span>{task.estimated_minutes} min</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {task.priority}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Rail: Quick Notes & Timer */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Scratchpad / Quick Notes</h3>
            <textarea
              rows={4}
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-[#E11D26] leading-relaxed text-gray-800"
            />
            <div className="text-[11px] text-gray-400 text-right mt-1">Saved locally</div>
          </div>

          <div className="bg-[#0B1220] text-white p-5 rounded-2xl border border-[#1E2A44] shadow-md flex flex-col justify-between" data-surface="dark-panel">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pomodoro Quick Launcher</span>
            <div className="my-4 text-center">
              <div className="text-3xl font-mono font-black text-white">25:00</div>
              <div className="text-[11px] text-gray-400 mt-1">Ready for Deep Focus</div>
            </div>
            <button
              onClick={() => onNavigate('sessions')}
              className="w-full py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold transition-all"
            >
              Start Session →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
