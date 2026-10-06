import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Play, 
  Terminal, 
  Database, 
  CheckSquare, 
  Settings, 
  ShieldCheck, 
  FileText, 
  Code2, 
  X,
  ArrowRight,
  User
} from 'lucide-react';
import { ScreenId } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenCreateTask: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCreateTask,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = [
    {
      id: 'create-task',
      title: 'Create new task',
      subtitle: 'Add a new coding objective to your planner',
      icon: Plus,
      run: () => { onClose(); onOpenCreateTask(); }
    },
    {
      id: 'start-session',
      title: 'Start study session',
      subtitle: 'Begin a 25-minute Pomodoro focus block',
      icon: Play,
      run: () => { onClose(); onNavigate('sessions'); }
    },
    {
      id: 'python-workspace',
      title: 'Open Python practice',
      subtitle: 'Launch full-dark Monaco editor workspace',
      icon: Terminal,
      run: () => { onClose(); onNavigate('python'); }
    },
    {
      id: 'sql-practice',
      title: 'Open SQL practice',
      subtitle: 'Run queries on isolated SQLite practice database',
      icon: Database,
      run: () => { onClose(); onNavigate('sql'); }
    },
    {
      id: 'security-center',
      title: 'View Security Center',
      subtitle: 'Inspect licensing, tamper chain, and sandbox diagnostics',
      icon: ShieldCheck,
      run: () => { onClose(); onNavigate('settings'); }
    },
    {
      id: 'daily-review',
      title: 'Open Daily Review',
      subtitle: 'Reflect on today\'s practice and plan for tomorrow',
      icon: CheckSquare,
      run: () => { onClose(); onNavigate('review'); }
    },
    {
      id: 'browse-problems',
      title: 'Browse all 1,337 problems',
      subtitle: 'Filter by 50 DSA patterns, difficulty, or platform',
      icon: Code2,
      run: () => { onClose(); onNavigate('problems'); }
    },
    {
      id: 'developer-profile',
      title: 'Open Developer Profile & Portfolio',
      subtitle: 'View LeetCode stats, solved problems dial, and 52-week activity heatmap',
      icon: User,
      run: () => { onClose(); onNavigate('profile'); }
    },
  ];

  const filtered = actions.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          // Open handled by parent
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].run();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search (e.g. 'SQL', 'Task', 'Python')..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden"
          />
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-[#FDECEC] text-[#A80000]' // Pink-tinted selected row per Section 16.7
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white text-[#E11D26] shadow-2xs' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.title}</div>
                      <div className={`text-[11px] ${isSelected ? 'text-[#C8101A]' : 'text-gray-400'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#E11D26]" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 py-0.5 bg-white border rounded font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-white border rounded font-mono">↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white border rounded font-mono">Enter</kbd> to select</span>
          </div>
          <span><kbd className="px-1 py-0.5 bg-white border rounded font-mono">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
