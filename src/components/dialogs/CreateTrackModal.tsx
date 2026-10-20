import React, { useState } from 'react';
import { X, Plus, Sparkles, Map, Code2, Database, BookOpen } from 'lucide-react';
import { createTrack } from '@/services/db';
import { Track } from '@/types';

interface CreateTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (track: Track) => void;
}

export const CreateTrackModal: React.FC<CreateTrackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [category, setCategory] = useState('DSA & Placement');
  const [tagsStr, setTagsStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Sheet title is required.');
      return;
    }

    if (isSubmitting) return; // Prevent double click
    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const created = await createTrack({
        title: title.trim(),
        description: description.trim(),
        level,
        category: category.trim(),
        tags,
      });

      if (onSuccess) onSuccess(created);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setLevel('intermediate');
      setCategory('DSA & Placement');
      setTagsStr('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create sheet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0E1526] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-track-title"
      >
        <div className="p-5 bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-[#0E1526] border-b border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-[#E11D26] flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="create-track-title" className="text-sm font-extrabold text-gray-900 dark:text-white">
                Create Coding Sheet
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Add a new structured curriculum or practice collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Sheet Title <span className="text-[#E11D26]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SDE Placement 75, Blind 75, Striver A2Z"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of topics, algorithms, or target companies covered..."
              rows={3}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Target Difficulty
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Placement, System Design, SQL"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. FAANG, Graphs, Arrays, Dynamic Programming"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating Sheet...' : 'Create Coding Sheet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
