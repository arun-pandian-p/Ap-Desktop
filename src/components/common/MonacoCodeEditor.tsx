import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import * as monaco from 'monaco-editor';
import Editor, { OnMount, loader } from '@monaco-editor/react';

// Guarantee 100% offline Monaco operation without CDN calls
loader.config({ monaco });
import { 
  AlertCircle, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Undo2, 
  Redo2, 
  AlignLeft, 
  Check, 
  Code2 
} from 'lucide-react';
import { 
  LanguageSelectorDropdown, 
  LanguageOption, 
  PYTHON_WORKSPACE_COLUMNS, 
  SQL_WORKSPACE_COLUMNS, 
  POSTGRES_WORKSPACE_COLUMNS 
} from './LanguageSelectorDropdown';

export interface MonacoCodeEditorHandle {
  getValue: () => string;
  setValue: (val: string) => void;
  focus: () => void;
  format: () => void;
  undo: () => void;
  redo: () => void;
}

export interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  workspace?: 'python' | 'sql' | 'postgres';
  language?: string; // e.g. 'python', 'sql', 'cpp', etc.
  selectedLanguageId?: string;
  onLanguageChange?: (lang: LanguageOption) => void;
  theme?: 'vs-dark' | 'vs-light';
  height?: string | number;
  onRun?: () => void;
  readOnly?: boolean;
  className?: string;
  showToolbar?: boolean;
  showStatusBar?: boolean;
  title?: string;
}

export const MonacoCodeEditor = forwardRef<MonacoCodeEditorHandle, MonacoCodeEditorProps>(({
  value,
  onChange,
  workspace = 'python',
  language = 'python',
  selectedLanguageId = 'python3',
  onLanguageChange,
  theme = 'vs-dark',
  height = '100%',
  onRun,
  readOnly = false,
  className = '',
  showToolbar = true,
  showStatusBar = true,
  title = 'Code',
}, ref) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isSaved, setIsSaved] = useState(true);
  const lastEmittedValueRef = useRef<string>(value);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (editorRef.current) {
        return editorRef.current.getValue();
      }
      return lastEmittedValueRef.current;
    },
    setValue: (val: string) => {
      lastEmittedValueRef.current = val;
      if (editorRef.current) {
        editorRef.current.setValue(val);
      }
    },
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    format: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
      }
    },
    undo: () => {
      if (editorRef.current) {
        editorRef.current.trigger('keyboard', 'undo', null);
      }
    },
    redo: () => {
      if (editorRef.current) {
        editorRef.current.trigger('keyboard', 'redo', null);
      }
    },
  }), []);

  const [copyPasteWarning, setCopyPasteWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<any>(null);

  const triggerCopyPasteBlocked = (action: 'copy' | 'paste' | 'cut') => {
    const actionLabel = action === 'paste' ? 'Paste' : action === 'copy' ? 'Copy' : 'Cut';
    setCopyPasteWarning(`🔒 ${actionLabel} disabled in IDE practice mode — manual typing required.`);
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    warningTimerRef.current = setTimeout(() => {
      setCopyPasteWarning(null);
    }, 2400);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Block Paste (Ctrl+V, Cmd+V, Shift+Insert)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      triggerCopyPasteBlocked('paste');
    });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {
      triggerCopyPasteBlocked('paste');
    });

    // Block Copy (Ctrl+C, Cmd+C)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      triggerCopyPasteBlocked('copy');
    });

    // Block Cut (Ctrl+X, Cmd+X)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      triggerCopyPasteBlocked('cut');
    });

    // Intercept DOM paste, copy, cut events on the editor element
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('paste', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopyPasteBlocked('paste');
      }, true);

      domNode.addEventListener('copy', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopyPasteBlocked('copy');
      }, true);

      domNode.addEventListener('cut', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        triggerCopyPasteBlocked('cut');
      }, true);
    }

    // Ctrl+Enter / Cmd+Enter shortcut
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });
    }

    // Track live cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    // Indentation options
    editor.getModel()?.updateOptions({
      tabSize: language === 'python' ? 4 : 2,
      insertSpaces: true,
    });
  };

  const handleEditorChange = (val: string | undefined) => {
    const newVal = val || '';
    lastEmittedValueRef.current = newVal;
    setIsSaved(false);
    onChange(newVal);

    // Auto mark saved shortly after typing pauses
    const timer = setTimeout(() => {
      setIsSaved(true);
    }, 800);
    return () => clearTimeout(timer);
  };

  // Synchronize external value changes safely (without clobbering user keystrokes)
  useEffect(() => {
    if (editorRef.current && isReady) {
      if (value !== lastEmittedValueRef.current) {
        lastEmittedValueRef.current = value;
        const currentVal = editorRef.current.getValue();
        if (value !== currentVal) {
          editorRef.current.setValue(value);
          setIsSaved(true);
        }
      }
    }
  }, [value, isReady]);

  // Language switch without model remount: uses setModelLanguage
  const handleSelectLanguage = (langOpt: LanguageOption) => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, langOpt.monacoLang);
      }
    }
    if (onLanguageChange) {
      onLanguageChange(langOpt);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-[#141824] border border-[#232B3E] rounded-xl overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'h-full w-full'
      } ${className}`}
    >
      {/* Editor Header Bar */}
      {showToolbar && (
        <div className="h-10 bg-[#161B26] border-b border-[#232B3E] px-3 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-[11px]">
              <Code2 className="w-3.5 h-3.5" />
              <span>{title}</span>
            </div>

            {/* Accessible 3-Column Language Dropdown */}
            <LanguageSelectorDropdown
              workspace={workspace}
              selectedLanguageId={selectedLanguageId}
              onSelectLanguage={handleSelectLanguage}
              disabled={readOnly}
            />

            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-400 bg-[#1C212D] border border-neutral-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Auto</span>
            </span>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1 text-gray-400">
            <button
              type="button"
              onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
              className="p-1 hover:text-white hover:bg-[#252B38] rounded-md transition-colors"
              title="Format Code (Alt+Shift+F)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editorRef.current?.trigger('keyboard', 'undo', null)}
              className="p-1 hover:text-white hover:bg-[#252B38] rounded-md transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editorRef.current?.trigger('keyboard', 'redo', null)}
              className="p-1 hover:text-white hover:bg-[#252B38] rounded-md transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 hover:text-white hover:bg-[#252B38] rounded-md transition-colors ml-1"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Editor'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Monaco Editor Container */}
      <div className="flex-1 relative overflow-hidden bg-[#141824]">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full bg-[#141824] text-gray-400 gap-2 font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#E11D26]" />
              <span>Loading Monaco Editor...</span>
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly,
            tabSize: language === 'python' ? 4 : 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: false,
            contextmenu: false,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />

        {/* Copy/Paste Blocked Overlay Notification */}
        {copyPasteWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 bg-[#2D1216] border border-red-500/70 text-red-200 text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{copyPasteWarning}</span>
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      {showStatusBar && (
        <div className="h-6 bg-[#121620] border-t border-[#232B3E] px-3 flex items-center justify-between text-[11px] text-gray-400 font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSaved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-gray-300">{isSaved ? 'Saved' : 'Editing...'}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>UTF-8</span>
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
        </div>
      )}
    </div>
  );
});

MonacoCodeEditor.displayName = 'MonacoCodeEditor';
