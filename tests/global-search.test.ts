import { describe, it, expect, beforeEach } from 'vitest';
import { calculateMatchScore, searchGlobal } from '../src/services/search/globalSearchService';
import { getDatabase } from '../src/services/db';

describe('Amazon-Style Global Search & Autocomplete Engine', () => {
  beforeEach(async () => {
    // Ensure test database is initialized
    await getDatabase();
  });

  describe('1. Search Ranking Algorithm', () => {
    it('ranks exact title match higher than prefix match', () => {
      const exact = calculateMatchScore('two sum', 'Two Sum');
      const prefix = calculateMatchScore('two', 'Two Sum');

      expect(exact.matches).toBe(true);
      expect(prefix.matches).toBe(true);
      expect(exact.score).toBeGreaterThan(prefix.score);
    });

    it('ranks prefix match higher than mid-string substring match', () => {
      const prefix = calculateMatchScore('binary', 'Binary Search');
      const substring = calculateMatchScore('search', 'Binary Search');

      expect(prefix.matches).toBe(true);
      expect(substring.matches).toBe(true);
      expect(prefix.score).toBeGreaterThan(substring.score);
    });

    it('ranks title match higher than keyword/topic match', () => {
      const titleMatch = calculateMatchScore('graph', 'Graph Valid Tree', ['Graphs']);
      const topicMatch = calculateMatchScore('graph', 'Number of Islands', ['Graphs']);

      expect(titleMatch.score).toBeGreaterThan(topicMatch.score);
    });

    it('ranks topic match higher than pure description match', () => {
      const topicMatch = calculateMatchScore('dp', 'Climbing Stairs', ['Dynamic Programming', 'DP'], 'A classic problem');
      const descMatch = calculateMatchScore('dp', 'Some Other Problem', ['Arrays'], 'Solve using DP approach');

      expect(topicMatch.score).toBeGreaterThan(descMatch.score);
    });
  });

  describe('2. Case-Insensitivity & Partial Word Matching', () => {
    it('matches regardless of upper/lower case', () => {
      const lower = calculateMatchScore('python', 'Python Practice IDE');
      const upper = calculateMatchScore('PYTHON', 'Python Practice IDE');
      const mixed = calculateMatchScore('PyThOn', 'Python Practice IDE');

      expect(lower.matches).toBe(true);
      expect(upper.matches).toBe(true);
      expect(mixed.matches).toBe(true);
      expect(lower.score).toBe(upper.score);
    });

    it('matches partial word prefixes in titles', () => {
      const res = calculateMatchScore('rev', 'Reverse Linked List');
      expect(res.matches).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(800);
    });

    it('matches multi-word queries across title and keywords', () => {
      const res = calculateMatchScore('two sum array', 'Two Sum', ['Arrays & Hashing']);
      expect(res.matches).toBe(true);
      expect(res.score).toBeGreaterThan(200);
    });
  });

  describe('3. Multi-Entity Search Everything Coverage', () => {
    it('searches coding problems', async () => {
      const res = await searchGlobal('two sum', { maxResults: 10 });
      expect(res.items.length).toBeGreaterThan(0);
      const prob = res.items.find(i => i.category === 'problems');
      expect(prob).toBeDefined();
      expect(prob?.title.toLowerCase()).toContain('two sum');
    });

    it('searches coding sheets and tracks (e.g. Curious Freaks)', async () => {
      const res = await searchGlobal('curious', { maxResults: 10 });
      expect(res.items.length).toBeGreaterThan(0);
      const sheet = res.items.find(i => i.category === 'sheets');
      expect(sheet).toBeDefined();
      expect(sheet?.title).toContain('Curious Freaks');
    });

    it('searches SQL exercises & PostgreSQL lab', async () => {
      const res = await searchGlobal('sql', { maxResults: 10 });
      expect(res.items.length).toBeGreaterThan(0);
      const sqlItem = res.items.find(i => i.category === 'database');
      expect(sqlItem).toBeDefined();
      expect(sqlItem?.title.toLowerCase()).toContain('sql');
    });

    it('searches application workspaces & settings actions', async () => {
      const res = await searchGlobal('runtimes', { maxResults: 10 });
      expect(res.items.length).toBeGreaterThan(0);
      const action = res.items.find(i => i.category === 'actions');
      expect(action).toBeDefined();
      expect(action?.title).toContain('Manage Runtimes');
      expect(action?.targetScreen).toBe('settings');
    });
  });

  describe('4. Deduplication & Result Constraints', () => {
    it('deduplicates items with identical IDs', async () => {
      const res = await searchGlobal('two sum', { maxResults: 20 });
      const ids = res.items.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('respects maxResults limit', async () => {
      const res = await searchGlobal('a', { maxResults: 5 });
      expect(res.items.length).toBeLessThanOrEqual(5);
    });

    it('returns empty groups and items when no match exists', async () => {
      const res = await searchGlobal('zzzz_completely_nonexistent_xyz_9999');
      expect(res.totalMatches).toBe(0);
      expect(res.items.length).toBe(0);
      expect(res.groups.length).toBe(0);
    });

    it('returns default quick actions when query is empty', async () => {
      const res = await searchGlobal('');
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items.every(i => i.category === 'actions')).toBe(true);
    });
  });

  describe('5. Category Grouping & Navigation Data Integrity', () => {
    it('groups results into distinct categories with non-empty items', async () => {
      const res = await searchGlobal('practice', { maxResults: 10 });
      for (const group of res.groups) {
        expect(group.items.length).toBeGreaterThan(0);
        expect(group.label).toBeTruthy();
        // Every item inside group must belong to that group's category
        expect(group.items.every(i => i.category === group.category)).toBe(true);
      }
    });

    it('preserves target screen or action metadata for valid routing', async () => {
      const res = await searchGlobal('sql', { maxResults: 5 });
      for (const item of res.items) {
        expect(item.targetScreen || item.actionType).toBeDefined();
      }
    });
  });
});
