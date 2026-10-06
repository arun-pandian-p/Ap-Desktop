import React from 'react';
import { Database, CheckCircle2, ShieldCheck, Terminal } from 'lucide-react';
import { ScreenId } from '@/types';

interface StatusBarProps {
  currentScreen: ScreenId;
  engineName?: string;
  databaseName?: string;
  schemaName?: string;
  transactionMode?: string;
  cursorPos?: { ln: number; col: number };
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentScreen,
  engineName = 'SQLite (Local Practice)',
  databaseName = 'ap_practice.db',
  schemaName = 'public',
  transactionMode = 'Read-only',
  cursorPos = { ln: 1, col: 1 },
}) => {
  const isDatabaseScreen = currentScreen === 'sql' || currentScreen === 'postgres';
  const isPostgres = currentScreen === 'postgres';

  return (
    <footer className="h-7 bg-[#0B1220] border-t border-[#1E2A44] text-[#94A0BC] flex items-center justify-between px-3 text-[11px] font-mono select-none z-30">
      {/* Left: Active engine & database context */}
      <div className="flex items-center gap-4">
        {/* Engine status indicator */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPostgres ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse`}></span>
          <span className="text-gray-300 font-semibold">
            {isPostgres ? 'PostgreSQL 16 (Local Bridge)' : 'SQLite 3 (Isolated Engine)'}
          </span>
        </div>

        <span className="text-[#1E2A44]">|</span>

        {/* Database & Schema */}
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#627091]" />
          <span>{databaseName}</span>
          <span className="text-[#627091]">::</span>
          <span className="text-gray-300">{schemaName}</span>
        </div>

        <span className="text-[#1E2A44]">|</span>

        {/* Transaction Mode */}
        <div className="flex items-center gap-1">
          <span className="text-[#627091]">Tx:</span>
          <span className="text-amber-400 font-medium">{transactionMode}</span>
        </div>

        <span className="text-[#1E2A44]">|</span>

        {/* Sandbox State */}
        <div className="flex items-center gap-1 text-[#627091]">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Sandbox: JobObject Low-IL</span>
        </div>
      </div>

      {/* Right: Editor cursor & readiness */}
      <div className="flex items-center gap-4">
        {/* Cursor location */}
        <div className="text-[#94A0BC]">
          <span>Ln {cursorPos.ln}, Col {cursorPos.col}</span>
        </div>

        <span className="text-[#1E2A44]">|</span>

        {/* UTF-8 & Readiness */}
        <div className="flex items-center gap-2">
          <span className="text-[#627091]">UTF-8</span>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span className="font-semibold">Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
