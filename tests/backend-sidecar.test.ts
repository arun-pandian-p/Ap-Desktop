import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Import backendManager directly in node environment
const backendManager = require('../electron/backendManager.cjs');

describe('Ap Workspace — Spring Boot Backend Sidecar Lifecycle & IPC', () => {

  afterAll(() => {
    try {
      backendManager.stopBackend();
    } catch {}
  });

  it('1. should report initial status and locate host Java runtime', () => {
    const status = backendManager.getStatus();
    expect(status).toBeDefined();
    expect(typeof status.status).toBe('string');
    expect(typeof status.hasJava).toBe('boolean');
    expect(typeof status.hasJar).toBe('boolean');
    expect(status.hasJava).toBe(true);
  });

  it('2. should verify backend fat JAR exists in target directory', () => {
    const targetDir = path.resolve(__dirname, '..', 'backend', 'target');
    const files = fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : [];
    const jarFile = files.find(f => f.startsWith('ap-backend-') && f.endsWith('.jar') && !f.endsWith('.original'));
    expect(jarFile).toBeDefined();
    const jarPath = path.resolve(targetDir, jarFile!);
    expect(fs.existsSync(jarPath)).toBe(true);
    const stat = fs.statSync(jarPath);
    expect(stat.size).toBeGreaterThan(10 * 1024 * 1024); // JAR > 10MB
  });

  it('3. should launch Spring Boot sidecar, discover dynamic port, and verify health', async () => {
    const startResult = await backendManager.startBackend();
    expect(startResult).toBeDefined();

    if (startResult.isRunning) {
      expect(startResult.port).toBeGreaterThan(0);
      expect(startResult.url).toContain('http://127.0.0.1:');
      expect(startResult.wsUrl).toContain('ws://127.0.0.1:');

      // 4. Verify authenticated internal request via backendManager.request
      const healthRes = await backendManager.request('/api/v1/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.data.status).toBe('UP');
      expect(healthRes.data.service).toBe('ap-backend-spring-boot');
      expect(healthRes.data.sqliteStatus).toBe('CONNECTED');

      // 5. Test streak API endpoint via IPC forwarder
      const streakRes = await backendManager.request('/api/v1/streak');
      expect(streakRes.status).toBe(200);
      expect(streakRes.data).toBeDefined();
      expect(typeof streakRes.data.currentStreak).toBe('number');
    } else {
      // In CI / non-Java environments, graceful fallback is validated
      expect(startResult.isOfflineFallback).toBe(true);
    }
  }, 25000);

  it('4. should stop Spring Boot sidecar process cleanly', () => {
    backendManager.stopBackend();
    const status = backendManager.getStatus();
    expect(status.isRunning).toBe(false);
    expect(status.port).toBe(0);
    expect(status.status).toBe('stopped');
  });
});
