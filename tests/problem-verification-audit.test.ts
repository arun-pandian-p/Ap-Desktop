import { describe, it, expect } from 'vitest';
import { getProblemDetails } from '../src/data/problemPresets';
import { 
  verifyProblem, 
  auditProblemLibrary, 
  containsPlaceholderText,
  parseTestCaseArguments,
  normalizeExpectedValue,
  valuesAreEqual
} from '../src/services/verification/problemVerificationService';
import { Question } from '../src/types';

describe('Ap Workspace — Problem Verification Pipeline & Audit Suite', () => {

  describe('1. Elimination of Fake/Placeholder Content', () => {
    it('should flag known dummy strings as placeholder content', () => {
      expect(containsPlaceholderText('Sample verified test input for Two Sum')).toBe(true);
      expect(containsPlaceholderText('Verified output result')).toBe(true);
      expect(containsPlaceholderText('Edge boundary input')).toBe(true);
      expect(containsPlaceholderText('Analyze the problem under the designated DSA framework')).toBe(true);
      expect(containsPlaceholderText('Given an integer array nums and an integer target')).toBe(false);
    });

    it('should NEVER return placeholder examples or dummy test cases for arbitrary unverified problems', () => {
      const mockUnverifiedQ: Question = {
        id: 'unverified-test-1',
        title: 'Custom Arbitrary Dynamic Graph Problem',
        platform: 'LeetCode',
        difficulty: 'Medium',
        track_slug: 'core-dsa',
        order_num: 999,
        status: 'todo',
        xp: 10,
        content_type: 'problem',
        last_attempted: null,
        is_bookmarked: false,
        practice_link: 'https://leetcode.com/problems/custom-problem/',
      };

      const details = getProblemDetails(mockUnverifiedQ);
      expect(containsPlaceholderText(details.description)).toBe(false);
      expect(details.examples).toEqual([]);
      expect(details.testCases).toEqual([]);
      expect(details.starterCode).not.toContain('def solve(*args):');
      expect(details.verificationStatus).toBe('partially_verified');
    });
  });

  describe('2. Problem 414 ("Average of Divisible Numbers") Verification', () => {
    it('should verify Problem 414 with authentic mathematical logic and tested reference implementation', () => {
      const q414: Question = {
        id: 'bb5e4ed3-2d1b-42c3-a8e4-fec18455bd23',
        title: 'Average of Divisible Numbers',
        platform: 'Interactive Quiz (GrindGram)',
        difficulty: 'Easy',
        track_slug: 'aptitude-cheatsheet',
        order_num: 414,
        status: 'todo',
        xp: 10,
        content_type: 'quiz',
        last_attempted: null,
        is_bookmarked: false,
        hint_link: 'Explanation: Numbers divisible by 6 between 6 and 50 are: 6, 12, 18, 24, 30, 36, 42, 48. Sum = 216, Count = 8. Average = 216/8 = 27.',
        practice_link: '',
      };

      const details = getProblemDetails(q414);
      expect(details.isCanonicalVerified).toBe(true);
      expect(details.isApAuthored).toBe(true);
      expect(details.examples.length).toBeGreaterThanOrEqual(2);
      expect(details.testCases.length).toBeGreaterThanOrEqual(3);

      // Verify reference implementation against stated expected outputs
      expect(typeof details.referenceImplementation).toBe('function');
      const ref = details.referenceImplementation!;
      expect(ref(6, 6, 50)).toBe(27.0);
      expect(ref(5, 10, 25)).toBe(17.5);
      expect(ref(7, 1, 6)).toBe(0.0);

      // Verify report
      const report = verifyProblem(q414, details);
      expect(report.status).toBe('verified');
      expect(report.referenceTestsPassed).toBe(true);
      expect(report.hasPlaceholderContent).toBe(false);
      expect(report.score).toBe(100);
    });
  });

  describe('3. Deterministic 10-Point Verification Checks', () => {
    it('should verify canonical DSA problems against executable reference implementations', () => {
      const twoSumQ: Question = {
        id: 'two-sum-1',
        title: 'Two Sum',
        platform: 'LeetCode',
        difficulty: 'Easy',
        track_slug: 'core-dsa',
        order_num: 1,
        status: 'todo',
        xp: 5,
        content_type: 'problem',
        last_attempted: null,
        is_bookmarked: false,
        practice_link: 'https://leetcode.com/problems/two-sum/',
      };

      const details = getProblemDetails(twoSumQ);
      const report = verifyProblem(twoSumQ, details);
      expect(report.status).toBe('verified');
      expect(report.referenceTestsPassed).toBe(true);
      expect(report.score).toBe(100);
      expect(report.checks.every(c => c.passed)).toBe(true);
    });

    it('should correctly parse tuple arguments and compare expected values', () => {
      expect(parseTestCaseArguments('(4)')).toEqual([4]);
      expect(parseTestCaseArguments('([2, 7, 11, 15], 9)')).toEqual([[2, 7, 11, 15], 9]);
      expect(parseTestCaseArguments('(6, 6, 50)')).toEqual([6, 6, 50]);

      expect(normalizeExpectedValue('27')).toBe(27);
      expect(normalizeExpectedValue('"Even"')).toBe('Even');
      expect(normalizeExpectedValue('[0, 1]')).toEqual([0, 1]);

      expect(valuesAreEqual([0, 1], [0, 1])).toBe(true);
      expect(valuesAreEqual(27.0, 27)).toBe(true);
      expect(valuesAreEqual('Even', 'Even')).toBe(true);
      expect(valuesAreEqual([0, 1], [1, 2])).toBe(false);
    });
  });

  describe('4. Library Audit & Reporting Non-Fabrication', () => {
    it('should accurately compute verified, partially verified, and unverified problem counts', () => {
      const mockQuestions: Question[] = [
        {
          id: 'q1',
          title: 'Two Sum',
          platform: 'LeetCode',
          difficulty: 'Easy',
          order_num: 1,
          track_slug: 'core-dsa',
          status: 'todo',
          xp: 5,
          content_type: 'problem',
          last_attempted: null,
          is_bookmarked: false,
          practice_link: 'https://leetcode.com/problems/two-sum/',
        },
        {
          id: 'q2',
          title: 'Valid Parentheses',
          platform: 'LeetCode',
          difficulty: 'Easy',
          order_num: 2,
          track_slug: 'core-dsa',
          status: 'todo',
          xp: 5,
          content_type: 'problem',
          last_attempted: null,
          is_bookmarked: false,
          practice_link: 'https://leetcode.com/problems/valid-parentheses/',
        },
        {
          id: 'q3',
          title: 'Some Unverified Problem With Link',
          platform: 'GeeksforGeeks',
          difficulty: 'Medium',
          order_num: 3,
          track_slug: 'core-dsa',
          status: 'todo',
          xp: 10,
          content_type: 'problem',
          last_attempted: null,
          is_bookmarked: false,
          practice_link: 'https://www.geeksforgeeks.org/problems/some-prob/',
        },
        {
          id: 'q4',
          title: 'Some Offline Problem Without Link',
          platform: 'Native Content',
          difficulty: 'Hard',
          order_num: 4,
          track_slug: 'core-dsa',
          status: 'todo',
          xp: 15,
          content_type: 'problem',
          last_attempted: null,
          is_bookmarked: false,
          practice_link: '',
        },
      ];

      const audit = auditProblemLibrary(mockQuestions);
      expect(audit.total).toBe(4);
      expect(audit.verified).toBe(2); // Two Sum & Valid Parentheses
      expect(audit.partiallyVerified).toBe(1); // q3 with practice link
      expect(audit.unverified).toBe(1); // q4 without practice link
      expect(audit.invalid).toBe(0); // Zero placeholder data
      expect(audit.placeholderDetectedCount).toBe(0);
    });
  });
});
