import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Lock, Code2 } from 'lucide-react';

export interface LanguageOption {
  id: string;
  name: string;
  monacoLang: string;
  isExecutable: boolean;
  badge?: string;
  description?: string;
}

export const PYTHON_WORKSPACE_COLUMNS: LanguageOption[][] = [
  // Column 1
  [
    { id: 'cpp', name: 'C++', monacoLang: 'cpp', isExecutable: false, badge: 'Syntax only' },
    { id: 'java', name: 'Java', monacoLang: 'java', isExecutable: false, badge: 'Syntax only' },
    { id: 'python3', name: 'Python3', monacoLang: 'python', isExecutable: true, badge: 'Python 3.12' },
    { id: 'python', name: 'Python', monacoLang: 'python', isExecutable: true, badge: 'Python 3.12' },
    { id: 'javascript', name: 'JavaScript', monacoLang: 'javascript', isExecutable: false, badge: 'Syntax only' },
    { id: 'typescript', name: 'TypeScript', monacoLang: 'typescript', isExecutable: false, badge: 'Syntax only' },
    { id: 'csharp', name: 'C#', monacoLang: 'csharp', isExecutable: false, badge: 'Syntax only' },
    { id: 'c', name: 'C', monacoLang: 'c', isExecutable: false, badge: 'Syntax only' },
  ],
  // Column 2
  [
    { id: 'go', name: 'Go', monacoLang: 'go', isExecutable: false, badge: 'Syntax only' },
    { id: 'kotlin', name: 'Kotlin', monacoLang: 'kotlin', isExecutable: false, badge: 'Syntax only' },
    { id: 'swift', name: 'Swift', monacoLang: 'swift', isExecutable: false, badge: 'Syntax only' },
    { id: 'rust', name: 'Rust', monacoLang: 'rust', isExecutable: false, badge: 'Syntax only' },
    { id: 'ruby', name: 'Ruby', monacoLang: 'ruby', isExecutable: false, badge: 'Syntax only' },
    { id: 'php', name: 'PHP', monacoLang: 'php', isExecutable: false, badge: 'Syntax only' },
    { id: 'dart', name: 'Dart', monacoLang: 'dart', isExecutable: false, badge: 'Syntax only' },
    { id: 'scala', name: 'Scala', monacoLang: 'scala', isExecutable: false, badge: 'Syntax only' },
  ],
  // Column 3
  [
    { id: 'elixir', name: 'Elixir', monacoLang: 'elixir', isExecutable: false, badge: 'Syntax only' },
    { id: 'erlang', name: 'Erlang', monacoLang: 'erlang', isExecutable: false, badge: 'Syntax only' },
    { id: 'racket', name: 'Racket', monacoLang: 'scheme', isExecutable: false, badge: 'Syntax only' },
  ],
];

export const SQL_WORKSPACE_COLUMNS: LanguageOption[][] = [
  [
    { 
      id: 'sqlite', 
      name: 'SQLite Practice Engine', 
      monacoLang: 'sql', 
      isExecutable: true, 
      badge: 'Local WASM',
      description: 'SQLite 3 WebAssembly in-memory isolated execution'
    },
  ],
];

export const POSTGRES_WORKSPACE_COLUMNS: LanguageOption[][] = [
  [
    { 
      id: 'postgres', 
      name: 'SQL (PostgreSQL dialect)', 
      monacoLang: 'sql', 
      isExecutable: true, 
      badge: 'PostgreSQL 16',
      description: 'Genuine PostgreSQL 16 TCP server execution'
    },
  ],
];

export interface LanguageSelectorDropdownProps {
  workspace: 'python' | 'sql' | 'postgres';
  selectedLanguageId: string;
  onSelectLanguage: (lang: LanguageOption) => void;
  disabled?: boolean;
}

export const LanguageSelectorDropdown: React.FC<LanguageSelectorDropdownProps> = ({
  workspace,
  selectedLanguageId,
  onSelectLanguage,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedCoords, setFocusedCoords] = useState<{ col: number; row: number }>({ col: 0, row: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const columns = workspace === 'python' 
    ? PYTHON_WORKSPACE_COLUMNS 
    : workspace === 'sql' 
    ? SQL_WORKSPACE_COLUMNS 
    : POSTGRES_WORKSPACE_COLUMNS;

  // Flatten options for lookup
  const allOptions = columns.flat();
  const currentOption = allOptions.find(o => o.id === selectedLanguageId) || allOptions[0];

  const isSingleOption = columns.length === 1 && columns[0].length === 1;

  // Find coordinates of currently selected item
  const findCoordsOf = useCallback((id: string) => {
    for (let c = 0; c < columns.length; c++) {
      for (let r = 0; r < columns[c].length; r++) {
        if (columns[c][r].id === id) {
          return { col: c, row: r };
        }
      }
    }
    return { col: 0, row: 0 };
  }, [columns]);

  // Open dropdown and set focus to current item
  const handleOpen = () => {
    if (disabled || isSingleOption) return;
    setFocusedCoords(findCoordsOf(selectedLanguageId));
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 2D Grid Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    const { col, row } = focusedCoords;
    const curColLen = columns[col].length;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedCoords({
          col,
          row: (row - 1 + curColLen) % curColLen,
        });
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedCoords({
          col,
          row: (row + 1) % curColLen,
        });
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (col > 0) {
          const targetCol = col - 1;
          const targetRow = Math.min(row, columns[targetCol].length - 1);
          setFocusedCoords({ col: targetCol, row: targetRow });
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (col < columns.length - 1) {
          const targetCol = col + 1;
          const targetRow = Math.min(row, columns[targetCol].length - 1);
          setFocusedCoords({ col: targetCol, row: targetRow });
        }
        break;

      case 'Home':
        e.preventDefault();
        setFocusedCoords({ col: 0, row: 0 });
        break;

      case 'End':
        e.preventDefault();
        const lastCol = columns.length - 1;
        setFocusedCoords({ col: lastCol, row: columns[lastCol].length - 1 });
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        const selected = columns[col][row];
        if (selected) {
          onSelectLanguage(selected);
          handleClose();
        }
        break;

      default:
        // Type-ahead jump: match first character
        if (e.key.length === 1 && /[a-zA-Z0-9#+]/.test(e.key)) {
          const searchChar = e.key.toLowerCase();
          for (let c = 0; c < columns.length; c++) {
            for (let r = 0; r < columns[c].length; r++) {
              if (columns[c][r].name.toLowerCase().startsWith(searchChar)) {
                setFocusedCoords({ col: c, row: r });
                return;
              }
            }
          }
        }
        break;
    }
  };

  return (
    <div className="relative inline-block text-left select-none" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id="language-selector-btn"
        data-testid="language-selector-button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={
          isSingleOption 
            ? `${currentOption.name} (Workspace Dialect Locked)` 
            : `Select programming language (Current: ${currentOption.name})`
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
          isOpen
            ? 'bg-[#2A303C] text-white border-neutral-600 shadow-sm'
            : 'bg-[#1C212B] text-gray-200 border-neutral-700/60 hover:bg-[#252B38] hover:text-white'
        } ${isSingleOption ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span className="truncate max-w-[140px]">{currentOption.name}</span>
        
        {currentOption.badge && !currentOption.isExecutable && (
          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 font-medium">
            {currentOption.badge}
          </span>
        )}

        {isSingleOption ? (
          <Lock className="w-3 h-3 text-gray-500 ml-0.5" />
        ) : (
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* 3-Column Dark Charcoal Dropdown Panel */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Select Programming Language"
          className="absolute left-0 mt-1.5 z-50 bg-[#1E232E] border border-[#2F3746] rounded-xl shadow-2xl p-2.5 flex divide-x divide-[#2F3746] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: workspace === 'python' ? '460px' : '260px' }}
        >
          {columns.map((colItems, colIdx) => (
            <div key={colIdx} className="flex-1 px-1.5 space-y-0.5">
              {colItems.map((item, rowIdx) => {
                const isSelected = item.id === selectedLanguageId;
                const isFocused = focusedCoords.col === colIdx && focusedCoords.row === rowIdx;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectLanguage(item);
                      handleClose();
                    }}
                    onMouseEnter={() => setFocusedCoords({ col: colIdx, row: rowIdx })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      isFocused
                        ? 'bg-[#2E3646] text-white shadow-2xs'
                        : isSelected
                        ? 'text-white font-semibold'
                        : 'text-gray-300 hover:text-white hover:bg-[#262D3B]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge && !item.isExecutable && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/80 text-amber-400/90 font-mono shrink-0 ml-1">
                        Syntax only
                      </span>
                    )}

                    {item.isExecutable && item.badge && workspace === 'python' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 font-mono shrink-0 ml-1">
                        Run
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
