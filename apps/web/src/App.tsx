import React from 'react';

export const WebApp: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Ap Web Platform</h1>
        <p className="mt-3 text-zinc-400">
          Progressive Web App companion for coding practice, curriculum tracking, and synchronized analytics.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="/"
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
          >
            Launch Web App
          </a>
        </div>
      </div>
    </div>
  );
};

export default WebApp;
