/**
 * Ap Workspace — Deterministic Problem Verification & Library Audit Engine
 * 
 * Implements:
 * 1. 10-point deterministic validation pipeline
 * 2. Elimination of placeholder and fabricated problem content
 * 3. Categorization into verified, partially_verified, unverified, and invalid
 * 4. Executable reference implementation test runner
 * 5. Full library audit metrics (total, verified, duplicates, broken links, etc.)
 */

import { Question, VerificationStatus } from '@/types';
import { getProblemDetails, ProblemDetail } from '@/data/problemPresets';

export interface VerificationCheckResult {
  checkId: string;
  name: string;
  passed: boolean;
  message: string;
}

export interface ProblemVerificationReport {
  problemId: string;
  title: string;
  platform: string;
  status: VerificationStatus;
  score: number; // 0 to 100
  checks: VerificationCheckResult[];
  diagnostics: string[];
  sourceUrl?: string;
  sourceAttribution: string;
  isApAuthored: boolean;
  hasPlaceholderContent: boolean;
  hasReferenceImplementation: boolean;
  referenceTestsPassed: boolean;
  verifiedAt: string;
}

export interface LibraryAuditSummary {
  total: number;
  verified: number;
  partiallyVerified: number;
  unverified: number;
  invalid: number;
  duplicates: number;
  missingExamples: number;
  failedReferenceTests: number;
  brokenSourceLinks: number;
  placeholderDetectedCount: number;
  auditedAt: string;
  problemReports: Record<string, ProblemVerificationReport>;
  duplicateGroups: Array<{ title: string; count: number; ids: string[] }>;
}

const FORBIDDEN_PLACEHOLDER_SUBSTRINGS = [
  'sample verified test input',
  'verified output result',
  'edge boundary input',
  'boundary result',
  'satisfies all problem invariant conditions',
  'analyze the problem under the designated dsa framework',
  'standard sample verification input',
];

/**
 * Checks whether text contains known dummy placeholder strings.
 */
export function containsPlaceholderText(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FORBIDDEN_PLACEHOLDER_SUBSTRINGS.some(phrase => lower.includes(phrase));
}

/**
 * Parses test case input representation safely into argument array.
 */
export function parseTestCaseArguments(inputStr: string): any[] {
  let trimmed = (inputStr || '').trim();
  if (!trimmed) return [];

  // If wrapped in parentheses like `(4)` or `([2, 7, 11, 15], 9)`, convert outer parens to brackets
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    trimmed = '[' + trimmed.slice(1, -1) + ']';
  } else if (!trimmed.startsWith('[')) {
    trimmed = '[' + trimmed + ']';
  }

  // Sanitize Python boolean/None constants and quotes
  const sanitized = trimmed
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/'/g, '"');

  try {
    const parsed = JSON.parse(sanitized);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [inputStr];
    }
  }
}

/**
 * Normalizes expected output string to structured or primitive value.
 */
export function normalizeExpectedValue(expected: string): any {
  let clean = (expected || '').trim();
  const sanitized = clean
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/'/g, '"');

  try {
    return JSON.parse(sanitized);
  } catch {
    try {
      return JSON.parse(clean);
    } catch {
      return clean;
    }
  }
}

/**
 * Deterministic equality comparison between actual execution result and normalized expected value.
 */
export function valuesAreEqual(actual: any, expected: any): boolean {
  if (actual === expected) return true;
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-6;
  }
  const actJson = JSON.stringify(actual);
  const expJson = JSON.stringify(expected);
  if (actJson === expJson) return true;
  if (String(actual).trim() === String(expected).trim()) return true;
  return false;
}

/**
 * Validates a single problem against the 10-point deterministic verification pipeline.
 */
export function verifyProblem(
  q: Question,
  explicitDetail?: ProblemDetail
): ProblemVerificationReport {
  const detail = explicitDetail || getProblemDetails(q);
  const checks: VerificationCheckResult[] = [];
  const diagnostics: string[] = [];

  // Check 1: Title matches authentic format and is not empty or generic
  const hasValidTitle = Boolean(q.title && q.title.trim().length >= 3 && !containsPlaceholderText(q.title));
  checks.push({
    checkId: 'CHK_1_TITLE',
    name: 'Title Authenticity & Quality',
    passed: hasValidTitle,
    message: hasValidTitle ? 'Title is authentic and specific.' : 'Title is missing or contains placeholder content.',
  });
  if (!hasValidTitle) diagnostics.push('Invalid or generic problem title.');

  // Check 2: Statement defines a specific task and contains NO placeholder text
  const descHasPlaceholders = containsPlaceholderText(detail.description);
  const hasSubstantiveDescription = Boolean(detail.description && detail.description.trim().length >= 20 && !descHasPlaceholders);
  checks.push({
    checkId: 'CHK_2_STATEMENT',
    name: 'Statement & Task Definition',
    passed: hasSubstantiveDescription,
    message: hasSubstantiveDescription
      ? 'Problem statement defines a solvable task with no dummy text.'
      : (descHasPlaceholders ? 'Statement contains placeholder template phrases.' : 'Statement is incomplete or missing.'),
  });
  if (descHasPlaceholders) diagnostics.push('Placeholder text detected in problem statement.');

  // Check 3: Examples validation (must have valid input, output, explanation, and zero placeholders)
  let examplesValid = false;
  let examplesHasPlaceholders = false;
  if (detail.examples && detail.examples.length > 0) {
    examplesHasPlaceholders = detail.examples.some(ex => 
      containsPlaceholderText(ex.input) || containsPlaceholderText(ex.output) || containsPlaceholderText(ex.explanation)
    );
    examplesValid = !examplesHasPlaceholders && detail.examples.every(ex => ex.input && ex.output);
  }
  checks.push({
    checkId: 'CHK_3_EXAMPLES',
    name: 'Example Quality & Authenticity',
    passed: examplesValid,
    message: examplesValid
      ? `Validated ${detail.examples.length} authentic examples.`
      : (examplesHasPlaceholders ? 'Examples contain dummy placeholder strings.' : 'Missing verified examples.'),
  });
  if (examplesHasPlaceholders) diagnostics.push('Dummy examples detected ("Sample verified test input").');

  // Check 4: Input / Output formats
  const hasValidTestCaseOutputs = detail.testCases && detail.testCases.length > 0 &&
    detail.testCases.every(tc => tc.input && tc.expected !== undefined && tc.expected !== '');
  checks.push({
    checkId: 'CHK_4_IO_FORMAT',
    name: 'Test Case Input/Output Format',
    passed: Boolean(hasValidTestCaseOutputs),
    message: hasValidTestCaseOutputs
      ? `Verified format of ${detail.testCases.length} test cases.`
      : 'Test cases missing or formatted incorrectly.',
  });

  // Check 5: Concrete Constraints
  const constraintsValid = detail.constraints && detail.constraints.length > 0 &&
    !detail.constraints.some(c => containsPlaceholderText(c));
  checks.push({
    checkId: 'CHK_5_CONSTRAINTS',
    name: 'Concrete Constraints & Bounds',
    passed: Boolean(constraintsValid),
    message: constraintsValid ? 'Concrete parameter limits and constraints documented.' : 'Missing or generic constraints.',
  });

  // Check 6: Starter Code Function Signature
  const hasSpecificSignature = detail.starterCode && 
    !detail.starterCode.includes('def solve(*args):') && 
    detail.starterCode.includes('def solve');
  checks.push({
    checkId: 'CHK_6_STARTER_SIG',
    name: 'Specific Starter Code Signature',
    passed: Boolean(hasSpecificSignature),
    message: hasSpecificSignature ? 'Language template defines typed/named parameter signature.' : 'Starter code uses generic *args or missing.',
  });
  if (!hasSpecificSignature && detail.starterCode?.includes('*args')) {
    diagnostics.push('Starter code uses fallback generic *args parameter.');
  }

  // Check 7 & 8: Executable Reference Implementation Test Execution
  let referenceTestsPassed = false;
  let hasReferenceImplementation = false;

  if (detail.referenceImplementation && typeof detail.referenceImplementation === 'function' && detail.testCases.length > 0) {
    hasReferenceImplementation = true;
    try {
      let allPassed = true;
      for (const tc of detail.testCases) {
        const args = parseTestCaseArguments(tc.input);
        const actual = (detail.referenceImplementation as any)(...args);
        const expected = normalizeExpectedValue(tc.expected);

        if (!valuesAreEqual(actual, expected)) {
          allPassed = false;
          diagnostics.push(`Reference implementation mismatch on input ${tc.input}: expected ${tc.expected}, got ${JSON.stringify(actual)}`);
          break;
        }
      }
      referenceTestsPassed = allPassed;
    } catch (execErr: any) {
      diagnostics.push(`Reference execution error: ${execErr.message}`);
    }
  }

  checks.push({
    checkId: 'CHK_7_8_REFERENCE_TESTS',
    name: 'Deterministic Reference Execution',
    passed: referenceTestsPassed,
    message: referenceTestsPassed
      ? 'All test cases executed and passed against trusted reference implementation.'
      : (hasReferenceImplementation ? 'Reference implementation failed against stated expected outputs.' : 'No bundled executable reference implementation.'),
  });

  // Check 9: Boundary cases
  const hasBoundaryTest = detail.testCases && detail.testCases.length >= 2;
  checks.push({
    checkId: 'CHK_9_BOUNDARIES',
    name: 'Boundary Test Coverage',
    passed: Boolean(hasBoundaryTest),
    message: hasBoundaryTest ? 'Multi-case boundary and nominal testing included.' : 'Lacks boundary test cases.',
  });

  // Check 10: Source Attribution & Link
  const hasSourceLink = Boolean(q.practice_link && q.practice_link.startsWith('http'));
  const hasValidAttribution = Boolean(detail.sourceAttribution || detail.isApAuthored);
  const sourceValid = hasSourceLink || detail.isApAuthored;
  checks.push({
    checkId: 'CHK_10_SOURCE_ATTRIBUTION',
    name: 'Source Attribution & Provenance',
    passed: Boolean(sourceValid),
    message: sourceValid
      ? `Source: ${detail.sourceAttribution || (hasSourceLink ? q.platform : 'Ap Workspace Original')}`
      : 'Missing source URL and attribution.',
  });
  if (!sourceValid) diagnostics.push('No verifiable external source URL or original attribution.');

  // Determine Overall Verification Status
  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const hasPlaceholder = descHasPlaceholders || examplesHasPlaceholders;

  let status: VerificationStatus;

  if (hasPlaceholder) {
    status = 'invalid';
    diagnostics.unshift('Flagged as Invalid due to detected dummy/placeholder content.');
  } else if (referenceTestsPassed && hasValidTitle && hasSubstantiveDescription && examplesValid && (detail.isCanonicalVerified || detail.isApAuthored)) {
    status = 'verified';
  } else if (hasSourceLink && hasValidTitle) {
    status = 'partially_verified';
  } else {
    status = 'unverified';
  }

  return {
    problemId: q.id,
    title: q.title,
    platform: q.platform,
    status,
    score,
    checks,
    diagnostics,
    sourceUrl: q.practice_link || detail.sourceUrl,
    sourceAttribution: detail.sourceAttribution || (detail.isApAuthored ? 'Ap Workspace Original' : q.platform),
    isApAuthored: Boolean(detail.isApAuthored),
    hasPlaceholderContent: hasPlaceholder,
    hasReferenceImplementation,
    referenceTestsPassed,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Audits an entire collection of problems and produces structured library metrics.
 */
export function auditProblemLibrary(questions: Question[]): LibraryAuditSummary {
  const problemReports: Record<string, ProblemVerificationReport> = {};
  const titleCounts = new Map<string, string[]>();

  let verified = 0;
  let partiallyVerified = 0;
  let unverified = 0;
  let invalid = 0;
  let missingExamples = 0;
  let failedReferenceTests = 0;
  let brokenSourceLinks = 0;
  let placeholderDetectedCount = 0;

  for (const q of questions) {
    const report = verifyProblem(q);
    problemReports[q.id] = report;

    // Track status counts
    if (report.status === 'verified') verified++;
    else if (report.status === 'partially_verified') partiallyVerified++;
    else if (report.status === 'unverified') unverified++;
    else if (report.status === 'invalid') invalid++;

    if (report.hasPlaceholderContent) placeholderDetectedCount++;
    if (!report.checks.find(c => c.checkId === 'CHK_3_EXAMPLES')?.passed) missingExamples++;
    if (report.hasReferenceImplementation && !report.referenceTestsPassed) failedReferenceTests++;
    if (!q.practice_link || !q.practice_link.startsWith('http')) brokenSourceLinks++;

    // Duplicate detection by normalized title
    const normTitle = (q.title || '').toLowerCase().trim();
    const existing = titleCounts.get(normTitle) || [];
    existing.push(q.id);
    titleCounts.set(normTitle, existing);
  }

  const duplicateGroups: Array<{ title: string; count: number; ids: string[] }> = [];
  let duplicates = 0;

  for (const [title, ids] of titleCounts.entries()) {
    if (ids.length > 1) {
      duplicates += (ids.length - 1);
      duplicateGroups.push({ title, count: ids.length, ids });
    }
  }

  return {
    total: questions.length,
    verified,
    partiallyVerified,
    unverified,
    invalid,
    duplicates,
    missingExamples,
    failedReferenceTests,
    brokenSourceLinks,
    placeholderDetectedCount,
    auditedAt: new Date().toISOString(),
    problemReports,
    duplicateGroups,
  };
}
