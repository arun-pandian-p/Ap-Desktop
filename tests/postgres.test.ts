import { describe, it, expect } from 'vitest';
import { 
  postgresTestConnection, 
  postgresGetTables, 
  postgresExecuteQuery, 
  PostgresConfig 
} from '../src/services/runner';

describe('PostgreSQL Lab (Genuine Server Integration)', () => {
  const validConfig: PostgresConfig = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '2030',
  };

  it('should successfully connect to the genuine PostgreSQL 16 server with user password', async () => {
    const res = await postgresTestConnection(validConfig);
    expect(res.success).toBe(true);
    expect(res.version).toContain('PostgreSQL');
    expect(res.user).toBe('postgres');
    expect(res.database).toBe('postgres');
  });

  it('should fail with authentication error if password is incorrect (zero simulation)', async () => {
    const badConfig: PostgresConfig = {
      ...validConfig,
      password: 'wrong_password_12345',
    };
    const res = await postgresTestConnection(badConfig);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error?.toLowerCase()).toContain('password authentication failed');
  });

  it('should list public tables from information_schema on genuine PostgreSQL instance', async () => {
    const res = await postgresGetTables(validConfig);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.tables)).toBe(true);
    const tableNames = res.tables?.map(t => t.name);
    expect(tableNames).toContain('employees');
  });

  it('should execute SELECT query against real PostgreSQL employees table and return genuine rows', async () => {
    const res = await postgresExecuteQuery(validConfig, 'SELECT employee_id, name, department, salary FROM employees ORDER BY employee_id ASC;');
    expect(res.success).toBe(true);
    expect(res.columns).toEqual(['employee_id', 'name', 'department', 'salary']);
    expect(res.row_count).toBeGreaterThanOrEqual(3);
    expect(res.values?.[0]).toContain('Arun');
  });

  it('should return server-level PostgreSQL syntax or relation errors without falling back to SQLite', async () => {
    const res = await postgresExecuteQuery(validConfig, 'SELECT * FROM missing_ap_table_999;');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('does not exist');
  });
});
