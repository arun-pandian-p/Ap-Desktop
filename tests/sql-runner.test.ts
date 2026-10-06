import { describe, it, expect } from 'vitest';
import { executeSqlQuery, getExerciseSqlDb, resetExerciseSqlDb } from '../src/services/runner';

describe('SQL Practice Engine (SQLite Isolation)', () => {
  it('should execute basic queries on sql-1 exercise with populated employees table', async () => {
    const res = await executeSqlQuery('SELECT * FROM employees ORDER BY id ASC;', 'sql-1');
    expect(res.error).toBeUndefined();
    expect(res.columns).toContain('id');
    expect(res.columns).toContain('name');
    expect(res.rows_count).toBe(5);

    // Running the actual solution query should pass validation
    const solRes = await executeSqlQuery("SELECT name, salary FROM employees WHERE department = 'Engineering' AND salary > 75000 ORDER BY salary DESC;", 'sql-1');
    expect(solRes.error).toBeUndefined();
    expect(solRes.rows_count).toBe(2);
    expect(solRes.passed).toBe(true);
  });

  it('should maintain isolated databases between exercises to prevent schema collision', async () => {
    const res1 = await executeSqlQuery('SELECT name FROM employees LIMIT 1;', 'sql-1');
    expect(res1.error).toBeUndefined();

    // sql-2 has its own schema
    const res2 = await executeSqlQuery('SELECT * FROM employees;', 'sql-2');
    expect(res2.error).toBeUndefined();
    expect(res2.columns).toBeDefined();
  });

  it('should block malicious SQLite operations like ATTACH, DETACH, LOAD_EXTENSION', async () => {
    const res = await executeSqlQuery('ATTACH DATABASE "malicious.db" AS evil;', 'sql-1');
    expect(res.error).toContain('Security Violation');
    expect(res.rows_count).toBe(0);
  });

  it('should reset database instance when requested', async () => {
    await executeSqlQuery('INSERT INTO employees (name, department, salary) VALUES ("Temp", "QA", 1000);', 'sql-1');
    resetExerciseSqlDb('sql-1');
    const freshDb = await getExerciseSqlDb('sql-1');
    const res = freshDb.exec('SELECT COUNT(*) FROM employees WHERE name = "Temp";');
    expect(res[0].values[0][0]).toBe(0);
  });
});
