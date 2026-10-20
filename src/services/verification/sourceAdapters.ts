/**
 * Ap Workspace — Authorized Source Adapters & Attribution Registry
 * 
 * Complies with source terms, copyright, rate limits, attribution, and dataset licenses.
 * Provides structured separation between external source references and Ap-authored content.
 * Disallows unauthorized scraping; provides external links and user-assisted import.
 */

export interface SourceMetadata {
  platformId: 'leetcode' | 'gfg' | 'codechef' | 'ap_workspace' | 'public_repo' | 'custom';
  displayName: string;
  sourceUrl?: string;
  attribution: string;
  license: string;
  isOfficialJudge: boolean;
  isApAuthored: boolean;
  rateLimitPolicy?: string;
}

export interface UserImportProblemPayload {
  title: string;
  statement: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  patternName?: string;
  platform: string;
  sourceUrl?: string;
  sourceAttribution?: string;
  sourceLicense?: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  testCases: Array<{ input: string; expected: string; isPrivate?: boolean }>;
  starterCodePython?: string;
  starterCodeJava?: string;
  starterCodeCpp?: string;
}

/**
 * Resolves source metadata and licensing for a given problem URL or platform tag.
 */
export function resolveSourceAdapter(url?: string, platform?: string): SourceMetadata {
  const cleanUrl = (url || '').trim().toLowerCase();
  const cleanPlatform = (platform || '').trim().toLowerCase();

  // 1. LeetCode Source Adapter
  if (cleanUrl.includes('leetcode.com') || cleanPlatform.includes('leetcode')) {
    return {
      platformId: 'leetcode',
      displayName: 'LeetCode',
      sourceUrl: url,
      attribution: 'LeetCode Problem Reference',
      license: 'All problem statements and test suites are the intellectual property of LeetCode LLC. Ap Workspace provides reference links and client-side solution runners.',
      isOfficialJudge: true,
      isApAuthored: false,
      rateLimitPolicy: 'No automated web scraping; users practice client-side and submit to official judge.',
    };
  }

  // 2. GeeksforGeeks Source Adapter
  if (cleanUrl.includes('geeksforgeeks.org') || cleanPlatform.includes('geeksforgeeks') || cleanPlatform.includes('gfg')) {
    return {
      platformId: 'gfg',
      displayName: 'GeeksforGeeks',
      sourceUrl: url,
      attribution: 'GeeksforGeeks Practice Portal',
      license: 'Content subject to GeeksforGeeks Terms of Service. Direct links provided for practice verification.',
      isOfficialJudge: true,
      isApAuthored: false,
    };
  }

  // 3. CodeChef Source Adapter
  if (cleanUrl.includes('codechef.com') || cleanPlatform.includes('codechef')) {
    return {
      platformId: 'codechef',
      displayName: 'CodeChef',
      sourceUrl: url,
      attribution: 'CodeChef Competitive Programming',
      license: 'CodeChef Terms of Use. Problems referenced by unique contest/problem code.',
      isOfficialJudge: true,
      isApAuthored: false,
    };
  }

  // 4. Ap Workspace Original Content
  if (cleanPlatform.includes('ap workspace') || cleanPlatform.includes('grindgram') || cleanPlatform.includes('placement aptitude') || !url) {
    return {
      platformId: 'ap_workspace',
      displayName: 'Ap Workspace Original',
      sourceUrl: url,
      attribution: 'Ap Workspace Authored Curriculum',
      license: 'MIT / Proprietary Educational License for Ap Workspace users.',
      isOfficialJudge: false,
      isApAuthored: true,
    };
  }

  // 5. General External / Custom
  return {
    platformId: 'custom',
    displayName: platform || 'External Judge',
    sourceUrl: url,
    attribution: `${platform || 'External'} Curated Reference`,
    license: 'Subject to original source terms.',
    isOfficialJudge: Boolean(url),
    isApAuthored: false,
  };
}

/**
 * Validates user-assisted problem import payload.
 */
export function validateImportPayload(payload: UserImportProblemPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.title || payload.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long.');
  }

  if (!payload.statement || payload.statement.trim().length < 20) {
    errors.push('Statement must be at least 20 characters long.');
  }

  if (!payload.examples || payload.examples.length === 0) {
    errors.push('At least one authentic example with input and output is required.');
  } else {
    for (let i = 0; i < payload.examples.length; i++) {
      const ex = payload.examples[i];
      if (!ex.input || ex.output === undefined) {
        errors.push(`Example ${i + 1} must include non-empty input and output.`);
      }
    }
  }

  if (!payload.testCases || payload.testCases.length === 0) {
    errors.push('At least one executable test case is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
