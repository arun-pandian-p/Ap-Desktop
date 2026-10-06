import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';

function apRunnerPlugin(): Plugin {
  return {
    name: 'ap-runner-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/python/info' && req.method === 'GET') {
          const py = spawn('python', ['-c', 'import sys, platform; print(platform.python_version()); print(sys.executable)']);
          let out = '';
          py.stdout.on('data', d => out += d);
          py.on('close', code => {
            res.setHeader('Content-Type', 'application/json');
            if (code === 0) {
              const lines = out.trim().split('\n');
              res.end(JSON.stringify({
                installed: true,
                version: `Python ${lines[0]}`,
                executable: lines[1] || 'python',
                status: 'Ready'
              }));
            } else {
              res.end(JSON.stringify({
                installed: false,
                version: 'Not Found',
                executable: '',
                status: 'Missing'
              }));
            }
          });
          return;
        }

        if (url === '/api/python/execute' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            const py = spawn('python', ['-I', '-S', '-B', 'workers/python/worker.py']);
            let out = '';
            let err = '';
            py.stdout.on('data', d => out += d);
            py.stderr.on('data', d => err += d);
            py.on('close', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(out || JSON.stringify({ status: 'Runtime Error', stderr: err }));
            });
            py.stdin.write(body);
            py.stdin.end();
          });
          return;
        }

        if (url?.startsWith('/api/postgres/') && req.method === 'POST') {
          const action = url.replace('/api/postgres/', '');
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            const py = spawn('python', ['workers/postgres/bridge.py', action]);
            let out = '';
            let err = '';
            py.stdout.on('data', d => out += d);
            py.stderr.on('data', d => err += d);
            py.on('close', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(out || JSON.stringify({ success: false, error: err }));
            });
            py.stdin.write(body);
            py.stdin.end();
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apRunnerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/release/**', '**/installer/**', '**/src-tauri/target/**'],
    },
  },
});
