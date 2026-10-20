import { describe, it, expect } from 'vitest';
import {
  fetchTracks,
  getTrackBySlug,
  createTrack,
  updateTrack,
  deleteTrack,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderTrackQuestions,
  importCodingSheetFromCsv,
  exportCodingSheetToCsv,
  fetchQuestions,
  getDatabase
} from '../src/services/db';
import { parseCsvText, generateCodingSheetSampleCsv } from '../src/services/db/csvHelper';

describe('Coding Sheets (Tracks) CRUD & Question Management', () => {
  it('1. should create a new coding sheet with validated metadata and unique slug', async () => {
    const sheet = await createTrack({
      title: 'Striver SDE Sheet 2026',
      description: 'Comprehensive 180 questions interview preparation sheet',
      level: 'intermediate',
      category: 'Interview Preparation',
      tags: ['SDE', 'DSA', 'Interview']
    });

    expect(sheet.id).toBeDefined();
    expect(sheet.title).toBe('Striver SDE Sheet 2026');
    expect(sheet.slug).toContain('striver-sde-sheet-2026');
    expect(sheet.level).toBe('intermediate');
    expect(sheet.category).toBe('Interview Preparation');

    const fetched = await getTrackBySlug(sheet.slug);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Striver SDE Sheet 2026');
  });

  it('2. should reject creating a coding sheet with empty title', async () => {
    await expect(createTrack({ title: '   ' })).rejects.toThrow('Track title is required');
  });

  it('3. should update coding sheet metadata and maintain referential integrity when slug changes', async () => {
    const sheet = await createTrack({
      title: 'NeetCode 150 Tracker',
      description: 'Original description',
      level: 'beginner'
    });

    // Add a question to this sheet
    const question = await createQuestion({
      track_slug: sheet.slug,
      title: 'Valid Anagram',
      difficulty: 'Easy',
      platform: 'LeetCode'
    });
    expect(question.track_slug).toBe(sheet.slug);

    // Update title and slug
    const updated = await updateTrack(sheet.id, {
      title: 'NeetCode 150 Core Patterns',
      slug: 'neetcode-150-core-patterns',
      level: 'advanced'
    });

    expect(updated.title).toBe('NeetCode 150 Core Patterns');
    expect(updated.slug).toBe('neetcode-150-core-patterns');
    expect(updated.level).toBe('advanced');

    // Confirm question track_slug cascaded
    const qRes = await fetchQuestions({ trackSlug: 'neetcode-150-core-patterns' });
    expect(qRes.questions.some(q => q.id === question.id)).toBe(true);
  });

  it('4. should delete coding sheet with question cascade control', async () => {
    const sheet = await createTrack({
      title: 'Temporary Discardable Sheet',
      description: 'To be deleted',
    });

    await createQuestion({
      track_slug: sheet.slug,
      title: 'Disposable Problem',
      difficulty: 'Easy'
    });

    await deleteTrack(sheet.id, true);

    const fetched = await getTrackBySlug(sheet.slug);
    expect(fetched).toBeNull();

    const qRes = await fetchQuestions({ trackSlug: sheet.slug });
    expect(qRes.questions.length).toBe(0);
  });

  it('5. should support Question CRUD operations inside coding sheets', async () => {
    const sheet = await createTrack({ title: 'CRUD Test Sheet' });

    // Create
    const q1 = await createQuestion({
      track_slug: sheet.slug,
      title: 'Search in Rotated Sorted Array',
      difficulty: 'Medium',
      platform: 'LeetCode',
      practice_link: 'https://leetcode.com/problems/search-in-rotated-sorted-array/'
    });
    expect(q1.id).toBeDefined();
    expect(q1.order_num).toBeGreaterThanOrEqual(1);

    // Update
    const updatedQ = await updateQuestion(q1.id, {
      difficulty: 'Hard',
      xp: 20
    });
    expect(updatedQ.difficulty).toBe('Hard');
    expect(updatedQ.xp).toBe(20);

    // Delete
    await deleteQuestion(q1.id);
    const searchRes = await fetchQuestions({ trackSlug: sheet.slug, search: 'Search in Rotated Sorted Array' });
    expect(searchRes.questions.length).toBe(0);
  });

  it('6. should reorder questions within a coding sheet', async () => {
    const sheet = await createTrack({ title: 'Reordering Test Sheet' });
    const qA = await createQuestion({ track_slug: sheet.slug, title: 'Item Alpha' });
    const qB = await createQuestion({ track_slug: sheet.slug, title: 'Item Beta' });
    const qC = await createQuestion({ track_slug: sheet.slug, title: 'Item Gamma' });

    await reorderTrackQuestions(sheet.slug, [qC.id, qA.id, qB.id]);

    const res = await fetchQuestions({ trackSlug: sheet.slug });
    const ids = res.questions.map(q => q.id);
    expect(ids.indexOf(qC.id)).toBeLessThan(ids.indexOf(qA.id));
    expect(ids.indexOf(qA.id)).toBeLessThan(ids.indexOf(qB.id));
  });
});

describe('RFC 4180 Coding Sheet CSV Engine', () => {
  it('1. should parse standard CSV with commas, escaped quotes, and newlines inside quoted fields', () => {
    const complexCsv = `order_num,title,difficulty,pattern_name\r\n` +
      `1,"Merge ""K"" Sorted Lists",Hard,"Heaps & Lists"\r\n` +
      `2,"Multi-line\nProblem Description\nLine 3",Medium,"Strings"`;

    const parsed = parseCsvText(complexCsv);
    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows[0].record['title']).toBe('Merge "K" Sorted Lists');
    expect(parsed.rows[0].record['difficulty']).toBe('Hard');
    expect(parsed.rows[1].record['title']).toContain('Multi-line\nProblem Description');
  });

  it('2. should strip UTF-8 BOM automatically', () => {
    const bomCsv = '\uFEFForder_num,title,difficulty\n1,Two Sum,Easy';
    const parsed = parseCsvText(bomCsv);
    expect(parsed.headers).toContain('title');
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].record['title']).toBe('Two Sum');
  });

  it('3. should autodetect semicolon (;) delimiters', () => {
    const semiCsv = 'order_num;title;difficulty;pattern_name\n1;Trapping Rain Water;Hard;Two Pointers';
    const parsed = parseCsvText(semiCsv);
    expect(parsed.delimiter).toBe(';');
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].record['title']).toBe('Trapping Rain Water');
  });

  it('4. should import a complete coding sheet from CSV with duplicate detection', async () => {
    const sheetCsv = `order_num,title,difficulty,pattern_name,platform,practice_link
1,Two Sum,Easy,Two Pointers,LeetCode,https://leetcode.com/problems/two-sum/
2,3Sum,Medium,Two Pointers,LeetCode,https://leetcode.com/problems/3sum/
3,Two Sum,Easy,Two Pointers,LeetCode,https://leetcode.com/problems/two-sum/
4,,Easy,Missing Title,LeetCode,`;

    const summary = await importCodingSheetFromCsv({
      csvText: sheetCsv,
      newTrackTitle: 'AlgoMaster Sheet',
      category: 'Top 75'
    });

    expect(summary.imported).toBe(2); // Two Sum, 3Sum
    expect(summary.duplicate).toBe(1); // Duplicate Two Sum skipped
    expect(summary.errors.length).toBeGreaterThanOrEqual(1); // Row 4 missing title
  });

  it('5. should export a coding sheet to valid RFC 4180 CSV format', async () => {
    const sheet = await createTrack({ title: 'Exportable Coding Sheet' });
    await createQuestion({
      track_slug: sheet.slug,
      title: 'Container With Most Water',
      difficulty: 'Medium',
      pattern_name: 'Two Pointers'
    });

    const csvOutput = await exportCodingSheetToCsv(sheet.slug);
    expect(csvOutput).toContain('order_num');
    expect(csvOutput).toContain('Container With Most Water');
    expect(csvOutput).toContain('Two Pointers');

    // Re-importing the exported CSV should succeed
    const reimported = parseCsvText(csvOutput);
    expect(reimported.rows.length).toBe(1);
    expect(reimported.rows[0].record['title']).toBe('Container With Most Water');
  });

  it('6. should generate sample coding sheet CSV template matching the schema', () => {
    const sample = generateCodingSheetSampleCsv();
    expect(sample).toContain('order_num');
    expect(sample).toContain('title');
    expect(sample).toContain('pattern_name');
    expect(sample).toContain('difficulty');
    expect(sample).toContain('practice_link');
    const parsed = parseCsvText(sample);
    expect(parsed.rows.length).toBeGreaterThan(0);
  });
});
