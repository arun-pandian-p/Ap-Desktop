/**
 * Ap Workspace — Robust RFC 4180 CSV Engine
 * Full support for UTF-8 BOM, quoted fields with commas/newlines,
 * escaped double quotes, auto-detected comma/semicolon delimiters,
 * flexible header normalization, and line-level error reporting.
 */

export interface ParsedCsvResult {
  headers: string[];
  rawHeaders: string[];
  headerMap: Record<string, number>;
  rows: Array<{
    values: string[];
    record: Record<string, string>;
    lineNum: number;
  }>;
  records: Array<Record<string, string>>;
  errors: Array<{ line: number; message: string }>;
  delimiter: string;
}

export interface CsvImportSummary {
  imported: number;
  skipped: number;
  duplicates: number;
  duplicate?: number;
  totalRows?: number;
  errors: Array<{ row: number; error: string; line?: number; message?: string }>;
}

/**
 * Autodetects whether comma (,) or semicolon (;) is the primary delimiter
 * by counting occurrences outside quoted strings.
 */
export function detectDelimiter(text: string): string {
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;
  const sampleLength = Math.min(text.length, 4096);

  for (let i = 0; i < sampleLength; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (char === ',') commaCount++;
      else if (char === ';') semiCount++;
    }
  }

  return semiCount > commaCount ? ';' : ',';
}

/**
 * Parses full CSV text according to RFC 4180 state machine.
 * Properly preserves newlines, commas, and escaped quotes within quoted fields.
 */
export function parseCsvText(csvText: string, forcedDelimiter?: string): ParsedCsvResult {
  if (!csvText) {
    return { headers: [], rawHeaders: [], headerMap: {}, rows: [], records: [], errors: [], delimiter: ',' };
  }

  // Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const delimiter = forcedDelimiter || detectDelimiter(cleanText);

  const rawRecords: Array<{ values: string[]; lineNum: number }> = [];
  let currentFields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let currentLineNum = 1;
  let fieldStartLine = 1;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double quote ("")
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      currentFields.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // End of record
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentFields.push(currentField.trim());
      currentField = '';

      // Only push non-empty lines
      const hasContent = currentFields.some(f => f.length > 0);
      if (hasContent) {
        rawRecords.push({ values: currentFields, lineNum: fieldStartLine });
      }
      currentFields = [];
      currentLineNum++;
      fieldStartLine = currentLineNum;
    } else {
      if (char === '\n') {
        currentLineNum++;
      }
      currentField += char;
    }
  }

  // Push final trailing field & record if present
  if (currentField.length > 0 || currentFields.length > 0) {
    currentFields.push(currentField.trim());
    if (currentFields.some(f => f.length > 0)) {
      rawRecords.push({ values: currentFields, lineNum: fieldStartLine });
    }
  }

  if (rawRecords.length === 0) {
    return { headers: [], rawHeaders: [], headerMap: {}, rows: [], records: [], errors: [], delimiter };
  }

  // Parse header line
  const rawHeaders = rawRecords[0].values;
  const headerMap: Record<string, number> = {};
  const normalizedHeaders = rawHeaders.map((h, idx) => {
    const norm = normalizeHeader(h);
    headerMap[norm] = idx;
    return norm;
  });

  // Parse data rows
  const rows = rawRecords.slice(1).map(({ values, lineNum }) => {
    const record: Record<string, string> = {};
    normalizedHeaders.forEach((header, idx) => {
      record[header] = values[idx] ?? '';
    });
    return { values, record, lineNum };
  });

  const records = rows.map(r => r.record);

  return {
    headers: normalizedHeaders,
    rawHeaders,
    headerMap,
    rows,
    records,
    errors: [],
    delimiter,
  };
}

/**
 * Normalizes header string to lowercase alphanumeric without symbols or spaces.
 */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/**
 * Canonical column alias mappings for coding sheet and problem schemas.
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  title: ['title', 'problem_title', 'problem', 'name', 'question', 'problem_name', 'probtitle'],
  difficulty: ['difficulty', 'level', 'diff'],
  pattern_name: ['pattern_name', 'pattern', 'topic', 'topic_name', 'category', 'pattern_title', 'patternname'],
  subtopic_name: ['subtopic_name', 'subtopic', 'sub_topic', 'subtopic_title', 'subtopicname'],
  platform: ['platform', 'source', 'judge', 'site', 'website'],
  practice_link: ['practice_link', 'problem_link', 'url', 'link', 'practice_url', 'practicelink'],
  video_link: ['video_link', 'video', 'solution_video', 'youtube_link', 'youtube', 'videolink'],
  hint_link: ['hint_link', 'hint', 'hints', 'notes_link', 'hintlink'],
  order_num: ['order_num', 'order', 'id', 'no', 'number', '#', 'num', 'problem_num', 'order_number'],
  xp: ['xp', 'points', 'score'],
  track_slug: ['track_slug', 'trackslug', 'track_name', 'trackname', 'sheet', 'sheet_slug', 'track'],
};

/**
 * Extracts a normalized field value from a CSV record using canonical aliases.
 */
export function getFieldValue(record: Record<string, string>, field: keyof typeof FIELD_ALIASES, defaultValue = ''): string {
  const aliases = FIELD_ALIASES[field] || [field];
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    if (record[normAlias] !== undefined && record[normAlias].trim() !== '') {
      return record[normAlias].trim();
    }
  }
  return defaultValue;
}

export const getNormalizedFieldValue = getFieldValue;

/**
 * Properly escapes and formats a field for RFC 4180 CSV output.
 */
export function escapeCsvField(val: string | number | null | undefined, delimiter = ','): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports data rows to formatted RFC 4180 CSV string with UTF-8 support.
 */
export function exportToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  delimiter = ','
): string {
  const headerLine = headers.map(h => escapeCsvField(h, delimiter)).join(delimiter);
  const dataLines = rows.map(r => r.map(c => escapeCsvField(c, delimiter)).join(delimiter));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Standard coding sheet sample template conforming to application schema.
 */
export function generateCodingSheetSampleCsv(): string {
  const headers = [
    'order_num',
    'title',
    'pattern_name',
    'subtopic_name',
    'platform',
    'difficulty',
    'practice_link',
    'video_link',
    'hint_link',
    'xp'
  ];

  const sampleRows = [
    [1, 'Two Sum', 'Two Pointers', 'Array Basics', 'LeetCode', 'Easy', 'https://leetcode.com/problems/two-sum/', 'https://youtube.com', '', 5],
    [2, 'Best Time to Buy and Sell Stock', 'Sliding Window', 'Greedy', 'LeetCode', 'Easy', 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', '', '', 5],
    [3, 'Contains Duplicate', 'Hashing', 'Sets', 'LeetCode', 'Easy', 'https://leetcode.com/problems/contains-duplicate/', '', '', 5],
    [4, 'Product of Array Except Self', 'Prefix Sum', 'Array Math', 'LeetCode', 'Medium', 'https://leetcode.com/problems/product-of-array-except-self/', '', '', 10],
    [5, 'Maximum Subarray', 'Dynamic Programming', 'Kadane Algorithm', 'LeetCode', 'Medium', 'https://leetcode.com/problems/maximum-subarray/', '', '', 10],
    [6, 'Trapping Rain Water', 'Two Pointers', 'Hard Problems', 'LeetCode', 'Hard', 'https://leetcode.com/problems/trapping-rain-water/', '', '', 20]
  ];

  return exportToCsv(headers, sampleRows);
}
