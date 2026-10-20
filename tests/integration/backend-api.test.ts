import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Integration Tests — Backend & Database Artifacts', () => {
  it('should verify Spring Boot backend project structure and POM configuration', () => {
    const pomPath = path.resolve(process.cwd(), 'backend/pom.xml');
    expect(fs.existsSync(pomPath)).toBe(true);

    const pomContent = fs.readFileSync(pomPath, 'utf8');
    expect(pomContent).toContain('<groupId>com.ap</groupId>');
    expect(pomContent).toContain('<artifactId>ap-backend</artifactId>');
    expect(pomContent).toContain('<java.version>21</java.version>');
  });

  it('should verify database canonical schema file and migrations exist', () => {
    const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);

    const m1Path = path.resolve(process.cwd(), 'database/migrations/001_initial_schema.sql');
    const m2Path = path.resolve(process.cwd(), 'database/migrations/002_add_streaks_and_analytics.sql');
    expect(fs.existsSync(m1Path)).toBe(true);
    expect(fs.existsSync(m2Path)).toBe(true);
  });

  it('should verify curriculum seed datasets exist and are non-empty', () => {
    const seedPath = path.resolve(process.cwd(), 'database/seeds/seedData.json');
    expect(fs.existsSync(seedPath)).toBe(true);
    const stat = fs.statSync(seedPath);
    expect(stat.size).toBeGreaterThan(500000); // Master seed contains 1,337 problems
  });
});
