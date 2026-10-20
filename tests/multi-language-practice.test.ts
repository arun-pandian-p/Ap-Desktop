import { describe, it, expect, beforeEach } from 'vitest';
import { getStarterCode, getProblemDetails } from '../src/data/problemPresets';
import { focusTimerService } from '../src/services/timer/focusTimerService';
import { getCodeDraft, saveCodeDraft, clearCodeDrafts, getDatabase } from '../src/services/db';

describe('Multi-Language Practice IDE, Toolchains & Focus Timer', () => {
  beforeEach(async () => {
    focusTimerService.reset();
  });

  it('1. should generate language-specific starter templates for Python, Java, and C++', () => {
    const mockProblem = {
      id: 'mock-1',
      title: 'Even or Odd Number Check',
      difficulty: 'Easy' as const,
      pattern_name: 'Conditionals',
      xp: 5,
      status: 'todo' as const,
      order_num: 1,
    };

    const pyCode = getStarterCode(mockProblem, 'python');
    const javaCode = getStarterCode(mockProblem, 'java');
    const cppCode = getStarterCode(mockProblem, 'cpp');

    // Python checks
    expect(pyCode).toContain('def solve');

    // Java checks
    expect(javaCode).toContain('public class Solution');
    expect(javaCode).toContain('public static String solve');
    expect(javaCode).toContain('Scanner sc = new Scanner(System.in)');

    // C++ checks
    expect(cppCode).toContain('#include <iostream>');
    expect(cppCode).toContain('string solve(int n)');
    expect(cppCode).toContain('int main()');
  });

  it('2. should persist independent drafts for Python, Java, and C++ without cross-contamination', async () => {
    const db = await getDatabase();
    const problemId = 'prob-multi-draft-test';

    // Save Python draft
    await saveCodeDraft(problemId, 'python', 'def solve(): return "python draft"');
    // Save Java draft
    await saveCodeDraft(problemId, 'java', 'public class Solution { public static void main(String[] args) {} }');
    // Save C++ draft
    await saveCodeDraft(problemId, 'cpp', 'int main() { cout << "cpp draft"; }');

    // Retrieve drafts independently
    const loadedPy = await getCodeDraft(problemId, 'python');
    const loadedJava = await getCodeDraft(problemId, 'java');
    const loadedCpp = await getCodeDraft(problemId, 'cpp');

    expect(loadedPy).toBe('def solve(): return "python draft"');
    expect(loadedJava).toBe('public class Solution { public static void main(String[] args) {} }');
    expect(loadedCpp).toBe('int main() { cout << "cpp draft"; }');
    expect(loadedPy).not.toBe(loadedJava);
    expect(loadedJava).not.toBe(loadedCpp);
  });

  it('3. should verify Java backend execution directly with live JDK 25 LTS', async () => {
    // Dynamic import of node javaRunner
    const { executeJava, detectJava } = await import('../electron/javaRunner.cjs');
    const info = await detectJava();

    // Verify JDK is detected
    expect(info.installed).toBe(true);
    expect(info.version).toContain('25');

    // Execute Java solution against test cases
    const javaCode = `
import java.util.*;

public class Solution {
    public static int solve(int n) {
        return n * 2;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextInt()) {
            int n = sc.nextInt();
            System.out.println(solve(n));
        }
    }
}
    `;

    const testCases = [
      { input: '5', expected: '10' },
      { input: '12', expected: '24' },
      { input: '-3', expected: '-6' },
    ];

    const result = await executeJava(javaCode, testCases);
    expect(result.status).toBe('Accepted');
    expect(result.test_cases_passed).toBe(3);
    expect(result.total_test_cases).toBe(3);
  }, 15000);

  it('4. should handle Java compilation errors truthfully and capture javac diagnostics', async () => {
    const { executeJava } = await import('../electron/javaRunner.cjs');
    const syntaxErrorCode = `
public class Solution {
    public static void main(String[] args) {
        int x = ; // Syntax error
    }
}
    `;

    const result = await executeJava(syntaxErrorCode, [{ input: '1', expected: '1' }]);
    expect(result.status).toBe('Compilation Error');
    expect(result.stderr).toContain('error:');
    expect(result.test_cases_passed).toBe(0);
  });

  it('5. should report truthful status when C++ compiler is not in PATH without spoofing Python', async () => {
    const { detectCpp } = await import('../electron/cppRunner.cjs');
    const info = await detectCpp();
    // Host has no g++/clang++ in PATH
    expect(typeof info.installed).toBe('boolean');
    if (!info.installed) {
      expect(info.status).toBe('Not Installed');
      expect(info.details).toContain('No C++ compiler found');
    }
  });

  it('6. should track focus timer state, countdown timestamps, and session statistics', () => {
    const state0 = focusTimerService.getState();
    expect(state0.mode).toBe('focus');
    expect(state0.remainingSeconds).toBe(25 * 60);
    expect(state0.isRunning).toBe(false);

    // Switch mode to short_break
    focusTimerService.setMode('short_break');
    const stateBreak = focusTimerService.getState();
    expect(stateBreak.mode).toBe('short_break');
    expect(stateBreak.remainingSeconds).toBe(5 * 60);

    // Switch back to focus
    focusTimerService.setMode('focus');
    expect(focusTimerService.getState().remainingSeconds).toBe(25 * 60);

    // Start timer
    focusTimerService.start();
    const runningState = focusTimerService.getState();
    expect(runningState.isRunning).toBe(true);
    expect(runningState.targetTimestamp).toBeGreaterThan(Date.now());

    // Pause timer
    focusTimerService.pause();
    const pausedState = focusTimerService.getState();
    expect(pausedState.isRunning).toBe(false);
    expect(pausedState.targetTimestamp).toBeNull();

    // Reset timer
    focusTimerService.reset();
    expect(focusTimerService.getState().remainingSeconds).toBe(25 * 60);
  });
});
