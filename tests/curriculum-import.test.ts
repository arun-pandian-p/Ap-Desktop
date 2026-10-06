import { describe, it, expect } from 'vitest';
import { 
  importQuestionsFromCsv, 
  reloadQuestionsFromSeed, 
  exportQuestionsToCsv, 
  getCurriculumStats,
  fetchQuestions 
} from '../src/services/db';

describe('Curriculum Dataset Management & CSV Import', () => {
  it('should fetch curriculum stats accurately', async () => {
    const stats = await getCurriculumStats();
    expect(stats.total).toBeGreaterThanOrEqual(100);
    expect(stats.easy).toBeGreaterThan(0);
    expect(stats.medium).toBeGreaterThan(0);
  });

  it('should export problems into valid CSV format', async () => {
    const csv = await exportQuestionsToCsv();
    expect(csv).toContain('order_num');
    expect(csv).toContain('title');
    expect(csv).toContain('platform');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(10);
  });

  it('should import new problems from raw CSV and update dataset in real time', async () => {
    const sampleCsv = `order,trackOrder,trackName,trackSlug,patternNum,patternName,subtopicNum,subtopicName,probOrderInSubtopic,probTitle,platform,difficulty,practiceLink
9999,1,Core,core,1,Custom Pattern,1,Subtopic,1,Reverse Polish Notation,LeetCode,Medium,https://leetcode.com/problems/rpn/
10000,1,Core,core,1,Custom Pattern,1,Subtopic,2,Asteroid Collision,LeetCode,Medium,https://leetcode.com/problems/asteroids/`;

    const res = await importQuestionsFromCsv(sampleCsv);
    expect(res.imported).toBe(2);

    const check = await fetchQuestions({ search: 'Reverse Polish Notation' });
    expect(check.questions.length).toBeGreaterThan(0);
    expect(check.questions[0].title).toBe('Reverse Polish Notation');
  });

  it('should reload the default 1,337 problems from seed on demand', async () => {
    const res = await reloadQuestionsFromSeed();
    expect(res.total).toBeGreaterThanOrEqual(1000);
  });

  it('should import and export SQL exercises by category', async () => {
    const { fetchSqlExercises, importSqlExercisesFromCsv, exportSqlExercisesToCsv, getSqlCurriculumStats } = await import('../src/services/db');
    const sampleSqlCsv = `id,title,difficulty,category,description,schema_sql,seed_sql,initial_query,solution_sql,expected_output_json,input_ascii,output_ascii,explanation,image_url
"sql-test-1","Custom Test Exercise","Easy","SELECT","Test description","CREATE TABLE t (id INT);","INSERT INTO t VALUES (1);","SELECT * FROM t;","SELECT * FROM t;","[{\\"id\\":1}]","Input table","Output table","Test explanation",""`;

    const res = await importSqlExercisesFromCsv(sampleSqlCsv);
    expect(res.imported).toBe(1);

    const list = await fetchSqlExercises();
    const found = list.find(x => x.id === 'sql-test-1');
    expect(found).toBeDefined();
    expect(found?.title).toBe('Custom Test Exercise');

    const stats = await getSqlCurriculumStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);

    const exported = await exportSqlExercisesToCsv();
    expect(exported).toContain('Custom Test Exercise');
  });

  it('should import and export PostgreSQL lab exercises by category', async () => {
    const { fetchPostgresExercises, importPostgresExercisesFromCsv, exportPostgresExercisesToCsv, getPostgresCurriculumStats } = await import('../src/services/db');
    const samplePgCsv = `id,title,difficulty,category,description,setup_sql,query_solution,verification_sql,notes
"pg-test-1","PG 16 Replication Inspection","Medium","Replication","Inspect replication slot stats","SELECT * FROM pg_replication_slots;","SELECT slot_name, active FROM pg_replication_slots;","SELECT count(*) FROM pg_replication_slots;","Replication test"`;

    const res = await importPostgresExercisesFromCsv(samplePgCsv);
    expect(res.imported).toBe(1);

    const list = await fetchPostgresExercises();
    const found = list.find(x => x.id === 'pg-test-1');
    expect(found).toBeDefined();
    expect(found?.title).toBe('PG 16 Replication Inspection');

    const stats = await getPostgresCurriculumStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);

    const exported = await exportPostgresExercisesToCsv();
    expect(exported).toContain('PG 16 Replication Inspection');
  });

  it('should generate valid sample CSV templates for all 3 categories', async () => {
    const { generateSampleCsv } = await import('../src/services/db');
    const pySample = generateSampleCsv('python');
    expect(pySample).toContain('order_num');
    expect(pySample).toContain('Two Sum');

    const sqlSample = generateSampleCsv('sql');
    expect(sqlSample).toContain('sql-175');
    expect(sqlSample).toContain('175. Combine Two Tables');

    const pgSample = generateSampleCsv('postgres');
    expect(pgSample).toContain('pg-1');
    expect(pgSample).toContain('PostgreSQL 16 Diagnostic');
  });
});
