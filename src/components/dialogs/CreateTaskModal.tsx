import React, { useState } from 'react';
import { X, Calendar, Clock, Flag, Tag, CheckCircle2 } from 'lucide-react';
import { PriorityLevel, Task } from '@/types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at'>) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [dueDate, setDueDate] = useState('Today, 5:00 PM');
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [addToToday, setAddToToday] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'todo',
      due_date: dueDate,
      estimated_minutes: estimatedMinutes,
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E11D26] flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Create New Task</h3>
              <p className="text-xs text-gray-500">Plan your coding and study objectives</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Master Sliding Window Pattern 3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#E11D26] transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add key notes, links, or specific problem numbers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-[#E11D26] transition-all"
            />
          </div>

          {/* Priority Segmented */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as PriorityLevel[]).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? p === 'High'
                          ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500/20'
                          : p === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-green-50 text-green-700 border-green-300 ring-2 ring-green-500/20'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Due Date / Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#E11D26]"
                />
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Estimated Duration
              </label>
              <div className="relative">
                <select
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#E11D26]"
                >
                  <option value={15}>15 Minutes (Quick)</option>
                  <option value={25}>25 Minutes (1 Pomodoro)</option>
                  <option value={45}>45 Minutes (Deep Work)</option>
                  <option value={60}>60 Minutes (Intensive)</option>
                </select>
                <Clock className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Add to today's plan checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={addToToday}
              onChange={(e) => setAddToToday(e.target.checked)}
              className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-gray-300"
            />
            <span className="text-xs text-gray-600 font-medium">Add directly to Today's Dashboard Plan</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#E11D26] hover:bg-[#C8101A] rounded-lg shadow-sm transition-all active:scale-95"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
