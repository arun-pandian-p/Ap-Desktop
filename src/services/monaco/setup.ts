import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';

// Configure local Monaco instance for @monaco-editor/react (disables CDN downloads)
loader.config({ monaco });

// Configure local Vite Web Workers for Monaco syntax and editor services
// Guarantees 100% offline operation without CDN calls or main-thread UI freeze
// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: any, _label: string) {
    return new editorWorker();
  },
};

export { monaco };
