import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import { AlertCircle, Terminal, RefreshCw } from 'lucide-react';

export interface MonacoCodeEditorHandle {
  getValue: () => string;
  setValue: (val: string) => void;
  focus: () => void;
}

export interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'python' | 'sql' | 'javascript' | 'json';
  theme?: 'vs-dark' | 'vs-light';
  height?: string | number;
  onRun?: () => void;
  readOnly?: boolean;
  className?: string;
}

export const MonacoCodeEditor = forwardRef<MonacoCodeEditorHandle, MonacoCodeEditorProps>(({
  value,
  onChange,
  language,
  theme = 'vs-dark',
  height = '100%',
  onRun,
  readOnly = false,
  className = '',
}, ref) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastEmittedValueRef = useRef<string>(value);

  // Expose imperative handle so parent components can ALWAYS read latest editor content
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
  }), []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Ctrl+Enter / Cmd+Enter keyboard shortcut to trigger Run
    if (onRun) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRun();
      });
    }

    // Set model options based on language
    editor.getModel()?.updateOptions({
      tabSize: language === 'python' ? 4 : 2,
      insertSpaces: true,
    });
  };

  const handleEditorChange = (val: string | undefined) => {
    const newVal = val || '';
    lastEmittedValueRef.current = newVal;
    onChange(newVal);
  };

  // Synchronize external value changes (e.g. problem selection, reset) safely
  // NEVER call setValue if the change originated from the user typing inside Monaco
  useEffect(() => {
    if (editorRef.current && isReady) {
      if (value !== lastEmittedValueRef.current) {
        lastEmittedValueRef.current = value;
        const currentVal = editorRef.current.getValue();
        if (value !== currentVal) {
          editorRef.current.setValue(value);
        }
      }
    }
  }, [value, isReady]);

  if (loadError) {
    return (
      <div className={`flex flex-col h-full bg-[#0F182B] text-gray-200 p-4 font-mono text-xs ${className}`}>
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-semibold">Monaco Editor Fallback Active</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="flex-1 w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg p-3 text-gray-200 font-mono text-xs focus:outline-hidden focus:border-[#E11D26] resize-none"
          placeholder={`Enter ${language.toUpperCase()} code here...`}
        />
        <div className="text-[10px] text-gray-500 mt-2">
          Note: Syntax fallback active. Ctrl+Enter to execute.
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full bg-[#0B1220] text-gray-400 gap-2 font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-[#E11D26]" />
            <span>Initializing {language.toUpperCase()} workspace...</span>
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
          formatOnPaste: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  );
});

MonacoCodeEditor.displayName = 'MonacoCodeEditor';
