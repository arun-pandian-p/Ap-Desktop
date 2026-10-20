import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  X, 
  Code2, 
  BookOpen, 
  Database, 
  CheckSquare, 
  Terminal, 
  Settings, 
  Flame, 
  Sparkles, 
  User, 
  Clock, 
  Music, 
  ShieldCheck,
  ArrowRight,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { ScreenId, Question, Track, Task } from '@/types';
import { searchGlobal, SearchResultItem, GroupedSearchResults, warmSearchCache } from '@/services/search/globalSearchService';
import { HighlightMatch } from '@/components/common/HighlightMatch';

interface GlobalSearchBarProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectProblem?: (problem: Question) => void;
  onSelectTrack?: (track: Track) => void;
  onOpenQuickAdd?: () => void;
  onOpenCommandPalette?: () => void;
  onSearchProblems?: (query: string) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onNavigate,
  onSelectProblem,
  onSelectTrack,
  onOpenQuickAdd,
  onOpenCommandPalette,
  onSearchProblems,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults>({ totalMatches: 0, items: [], groups: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Warm search cache on initial mount
  useEffect(() => {
    warmSearchCache();
  }, []);

  // Perform search (instant sync + debounced async SQLite)
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    setIsLoading(true);

    try {
      const res = await searchGlobal(trimmed, {
        maxResults: 10,
        includeAsyncDb: true,
      });
      setResults(res);
      setSelectedIndex(0);
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle typing with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Quick immediate in-memory preview for 1-character queries
    if (val.trim().length <= 2) {
      searchGlobal(val, { maxResults: 8, includeAsyncDb: false }).then(res => {
        setResults(res);
      });
    }

    // Debounce SQLite lookup by 180ms
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 180);
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K listener to focus this input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        // If not already focused in an editable element other than this search
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
        if (!query.trim()) {
          executeSearch('');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [query, executeSearch]);

  // Execute selection handler
  const handleSelectResult = useCallback((item: SearchResultItem) => {
    setIsOpen(false);

    if (item.actionType === 'problem') {
      const q = item.payload || item.actionData;
      if (onSelectProblem && q) {
        onSelectProblem(q);
      }
      onNavigate('practice');
      return;
    }

    if (item.actionType === 'track') {
      const t = item.payload || item.actionData;
      if (onSelectTrack && t) {
        onSelectTrack(t);
      }
      onNavigate('problems');
      return;
    }

    if (item.actionType === 'modal') {
      if (item.actionData === 'createTask' && onOpenQuickAdd) {
        onOpenQuickAdd();
      } else if (item.actionData === 'commandPalette' && onOpenCommandPalette) {
        onOpenCommandPalette();
      }
      return;
    }

    if (item.targetScreen) {
      onNavigate(item.targetScreen);
    }
  }, [onNavigate, onSelectProblem, onSelectTrack, onOpenQuickAdd, onOpenCommandPalette]);

  // "View all results" in problems
  const handleViewAllResults = useCallback(() => {
    setIsOpen(false);
    if (onSearchProblems) {
      onSearchProblems(query);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ap_search_problems', { detail: { query } }));
    }
    onNavigate('problems');
  }, [query, onNavigate, onSearchProblems]);

  // Keyboard navigation inside search dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = results.items.length;
    // Total navigable options = items + (hasQuery ? 1 for "view all" : 0)
    const hasViewAll = query.trim().length > 0;
    const maxIndex = hasViewAll ? totalItems : Math.max(0, totalItems - 1);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setSelectedIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === totalItems && hasViewAll) {
        handleViewAllResults();
      } else if (results.items[selectedIndex]) {
        handleSelectResult(results.items[selectedIndex]);
      } else if (hasViewAll) {
        handleViewAllResults();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const getIconComponent = (icon: SearchResultItem['icon']) => {
    switch (icon) {
      case 'code': return Code2;
      case 'book': return BookOpen;
      case 'database': return Database;
      case 'check': return CheckSquare;
      case 'terminal': return Terminal;
      case 'settings': return Settings;
      case 'flame': return Flame;
      case 'sparkles': return Sparkles;
      case 'user': return User;
      case 'clock': return Clock;
      case 'music': return Music;
      case 'shield': return ShieldCheck;
      default: return Code2;
    }
  };

  return (
    <div ref={containerRef} className="relative titlebar-no-drag w-full min-w-0 transition-all duration-200">
      {/* 1. Amazon-style Search Input Box */}
      <div 
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs transition-all duration-150 ${
          isOpen
            ? 'bg-white dark:bg-[#0E1526] border-[#E11D26] ring-2 ring-[#E11D26]/20 shadow-sm'
            : 'bg-[#F1F3F9] dark:bg-[#1E293B] border-[#E8EAF2] dark:border-slate-700 hover:bg-[#E9ECF5] dark:hover:bg-[#283548]'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-[#E11D26] animate-spin shrink-0" />
        ) : (
          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (!query.trim()) executeSearch('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search problems, sheets, SQL..."
          className="w-full min-w-0 bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden"
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />

        {query ? (
          <button
            onClick={() => {
              setQuery('');
              executeSearch('');
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-colors"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="hidden md:inline-flex items-center gap-0.5 bg-white dark:bg-[#0F172A] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 font-mono shadow-2xs shrink-0 whitespace-nowrap">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* 2. Amazon-style Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-[360px] sm:w-[420px] md:w-[480px] bg-white dark:bg-[#0E1526] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-100">
          {/* Subtle loading progress line */}
          {isLoading && (
            <div className="h-0.5 w-full bg-red-100 overflow-hidden">
              <div className="h-full bg-[#E11D26] w-1/3 animate-pulse"></div>
            </div>
          )}

          {/* Search results grouped by category */}
          <div className="max-h-96 overflow-y-auto p-1.5 divide-y divide-gray-100 dark:divide-gray-800/60">
            {results.items.length === 0 && !isLoading ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center mx-auto mb-2 text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  No matches found for "{query}"
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                  Try searching by problem name (e.g. "Two Sum"), sheet ("Curious Freaks"), difficulty ("Easy"), or "SQL".
                </div>
              </div>
            ) : (
              results.groups.map(group => (
                <div key={group.category} className="py-1">
                  {/* Category header */}
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-[9px] font-mono text-gray-300 dark:text-gray-600">{group.items.length}</span>
                  </div>

                  {/* Suggestion items */}
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const itemIndex = results.items.indexOf(item);
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = getIconComponent(item.icon);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#FDECEC] dark:bg-[#7F1D1D]/25 text-[#991B1B] dark:text-red-200'
                              : 'hover:bg-gray-50 dark:hover:bg-[#1E293B]/60 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {/* Icon badge */}
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-white dark:bg-[#1E293B] text-[#E11D26] shadow-xs'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Title & subtitle with match highlighting */}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold leading-tight truncate">
                                <HighlightMatch text={item.title} query={query} />
                              </div>
                              {item.subtitle && (
                                <div className={`text-[11px] truncate ${
                                  isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  <HighlightMatch text={item.subtitle} query={query} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right badge & selected indicator */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                item.badgeColor === 'green'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : item.badgeColor === 'red'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : item.badgeColor === 'amber'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : item.badgeColor === 'purple'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : item.badgeColor === 'blue'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {isSelected && (
                              <ArrowRight className="w-3.5 h-3.5 text-[#E11D26] shrink-0 animate-in slide-in-from-left-1 duration-100" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. Dropdown Footer: "View all results" & Keyboard Navigation Hints */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-[#090D16] border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            {query.trim() ? (
              <button
                onClick={handleViewAllResults}
                onMouseEnter={() => setSelectedIndex(results.items.length)}
                className={`flex items-center gap-1.5 font-semibold text-xs px-2 py-1 rounded transition-colors ${
                  selectedIndex === results.items.length
                    ? 'bg-[#FDECEC] dark:bg-[#7F1D1D]/30 text-[#E11D26] font-bold'
                    : 'text-[#E11D26] hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                <span>View all results for "{query.slice(0, 20)}"</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[10px] text-gray-400">Type to search problems, sheets, and tasks</span>
            )}

            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[9px] font-mono">↑</kbd>
                <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[9px] font-mono">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[9px] font-mono">Enter</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[9px] font-mono">Esc</kbd>
                <span>close</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
