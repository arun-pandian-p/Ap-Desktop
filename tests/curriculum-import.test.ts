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
});
