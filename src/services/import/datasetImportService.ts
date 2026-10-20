/**
 * Ap Workspace — Robust Dataset Importer Service
 * Supports importing external datasets:
 * 1. Coding Problems (CSV or JSON)
 * 2. Planner Tasks (CSV or JSON)
 * With field normalization, duplicate detection, conflict handling,
 * line-by-line validation, and live database persistence.
 */

import { getDatabase, persistDatabase, importCodingSheetFromCsv } from '@/services/db';
import { parseCsvText, getNormalizedFieldValue } from '@/services/db/csvHelper';
import { DifficultyLevel, Task } from '@/types';

export type DatasetType = 'problems' | 'tasks';
export type DatasetFormat = 'csv' | 'json';
export type ConflictMode = 'skip' | 'overwrite' | 'keep_both';

export interface DatasetPreview {
  type: DatasetType;
  format: DatasetFormat;
  totalRecords: number;
  validRecords: number;
  duplicateCount: number;
  headers: string[];
  sampleRows: Array<Record<string, any>>;
  errors: Array<{ row: number; message: string }>;
}

export interface DatasetImportOptions {
  conflictMode?: ConflictMode;
  targetTrackSlug?: string;
  newTrackTitle?: string;
  newTrackCategory?: string;
}

export interface DatasetImportResult {
  success: boolean;
  type: DatasetType;
  total: number;
  imported: number;
  duplicatesSkipped: number;
  errors: Array<{ row: number; message: string }>;
  targetDestination: string;
  message: string;
}

/**
 * Autodetects whether text is JSON or CSV.
 */
export function detectFormat(text: string): DatasetFormat {
  const trimmed = text.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return 'json';
  }
  return 'csv';
}

/**
 * Parses and previews a problem or task dataset without committing changes.
 */
export async function previewDataset(
  type: DatasetType,
  content: string,
  forcedFormat?: DatasetFormat,
  options?: { targetTrackSlug?: string }
): Promise<DatasetPreview> {
  const format = forcedFormat || detectFormat(content);
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      type,
      format,
      totalRecords: 0,
      validRecords: 0,
      duplicateCount: 0,
      headers: [],
      sampleRows: [],
      errors: [{ row: 1, message: 'Content is empty.' }],
    };
  }

  const db = await getDatabase();

  if (type === 'problems') {
    if (format === 'csv') {
      const parsed = parseCsvText(trimmed);
      const errors: Array<{ row: number; message: string }> = parsed.errors.map(e => ({
        row: e.line,
        message: e.message,
      }));

      // Fetch existing question titles for target track
      const trackSlug = options?.targetTrackSlug;
      const existingRows = trackSlug
        ? db.exec(`SELECT LOWER(TRIM(title)) FROM questions WHERE track_slug = ?`, [trackSlug])
        : db.exec(`SELECT LOWER(TRIM(title)) FROM questions`);

      const existingTitles = new Set<string>();
      if (existingRows.length && existingRows[0].values) {
        existingRows[0].values.forEach(v => {
          if (v[0]) existingTitles.add(String(v[0]).toLowerCase().trim());
        });
      }

      let validRecords = 0;
      let duplicateCount = 0;
      const seenTitles = new Set<string>();

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const title = getNormalizedFieldValue(row.record, 'title');
        if (!title) {
          errors.push({ row: row.lineNum, message: 'Missing required "title" column value.' });
        } else {
          validRecords++;
          const norm = title.toLowerCase().trim();
          if (existingTitles.has(norm) || seenTitles.has(norm)) {
            duplicateCount++;
          }
          seenTitles.add(norm);
        }
      }

      return {
        type: 'problems',
        format: 'csv',
        totalRecords: parsed.rows.length,
        validRecords,
        duplicateCount,
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5).map(r => r.record),
        errors,
      };
    } else {
      // JSON Problems format
      try {
        const parsed = JSON.parse(trimmed);
        const list: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.questions)
          ? parsed.questions
          : Array.isArray(parsed.problems)
          ? parsed.problems
          : [];

        if (!list.length) {
          return {
            type: 'problems',
            format: 'json',
            totalRecords: 0,
            validRecords: 0,
            duplicateCount: 0,
            headers: [],
            sampleRows: [],
            errors: [{ row: 1, message: 'JSON array of problems not found.' }],
          };
        }

        const trackSlug = options?.targetTrackSlug;
        const existingRows = trackSlug
          ? db.exec(`SELECT LOWER(TRIM(title)) FROM questions WHERE track_slug = ?`, [trackSlug])
          : db.exec(`SELECT LOWER(TRIM(title)) FROM questions`);

        const existingTitles = new Set<string>();
        if (existingRows.length && existingRows[0].values) {
          existingRows[0].values.forEach(v => {
            if (v[0]) existingTitles.add(String(v[0]).toLowerCase().trim());
          });
        }

        let validRecords = 0;
        let duplicateCount = 0;
        const errors: Array<{ row: number; message: string }> = [];
        const seenTitles = new Set<string>();

        list.forEach((item, idx) => {
          const rowNum = idx + 1;
          const title = item.title || item.name || item.problem_name;
          if (!title || typeof title !== 'string') {
            errors.push({ row: rowNum, message: 'Missing problem title.' });
          } else {
            validRecords++;
            const norm = title.toLowerCase().trim();
            if (existingTitles.has(norm) || seenTitles.has(norm)) {
              duplicateCount++;
            }
            seenTitles.add(norm);
          }
        });

        const headers = list.length > 0 ? Object.keys(list[0]) : [];

        return {
          type: 'problems',
          format: 'json',
          totalRecords: list.length,
          validRecords,
          duplicateCount,
          headers,
          sampleRows: list.slice(0, 5),
          errors,
        };
      } catch (err: any) {
        return {
          type: 'problems',
          format: 'json',
          totalRecords: 0,
          validRecords: 0,
          duplicateCount: 0,
          headers: [],
          sampleRows: [],
          errors: [{ row: 1, message: `Invalid JSON syntax: ${err.message}` }],
        };
      }
    }
  } else {
    // Tasks Dataset Preview
    if (format === 'csv') {
      const parsed = parseCsvText(trimmed);
      const errors: Array<{ row: number; message: string }> = parsed.errors.map(e => ({
        row: e.line,
        message: e.message,
      }));

      const existingTasks = db.exec(`SELECT LOWER(TRIM(title)) FROM tasks`);
      const existingTitles = new Set<string>();
      if (existingTasks.length && existingTasks[0].values) {
        existingTasks[0].values.forEach(v => {
          if (v[0]) existingTitles.add(String(v[0]).toLowerCase().trim());
        });
      }

      let validRecords = 0;
      let duplicateCount = 0;
      const seenTitles = new Set<string>();

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const title = getNormalizedFieldValue(row.record, 'title') || getNormalizedFieldValue(row.record, 'task_title') || row.record.task;
        if (!title) {
          errors.push({ row: row.lineNum, message: 'Missing task title in row.' });
        } else {
          validRecords++;
          const norm = title.toLowerCase().trim();
          if (existingTitles.has(norm) || seenTitles.has(norm)) {
            duplicateCount++;
          }
          seenTitles.add(norm);
        }
      }

      return {
        type: 'tasks',
        format: 'csv',
        totalRecords: parsed.rows.length,
        validRecords,
        duplicateCount,
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5).map(r => r.record),
        errors,
      };
    } else {
      // JSON Tasks
      try {
        const parsed = JSON.parse(trimmed);
        const list: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.tasks)
          ? parsed.tasks
          : [];

        if (!list.length) {
          return {
            type: 'tasks',
            format: 'json',
            totalRecords: 0,
            validRecords: 0,
            duplicateCount: 0,
            headers: [],
            sampleRows: [],
            errors: [{ row: 1, message: 'JSON array of tasks not found.' }],
          };
        }

        const existingTasks = db.exec(`SELECT LOWER(TRIM(title)) FROM tasks`);
        const existingTitles = new Set<string>();
        if (existingTasks.length && existingTasks[0].values) {
          existingTasks[0].values.forEach(v => {
            if (v[0]) existingTitles.add(String(v[0]).toLowerCase().trim());
          });
        }

        let validRecords = 0;
        let duplicateCount = 0;
        const errors: Array<{ row: number; message: string }> = [];
        const seenTitles = new Set<string>();

        list.forEach((item, idx) => {
          const rowNum = idx + 1;
          const title = item.title || item.task || item.name;
          if (!title || typeof title !== 'string') {
            errors.push({ row: rowNum, message: 'Missing task title.' });
          } else {
            validRecords++;
            const norm = title.toLowerCase().trim();
            if (existingTitles.has(norm) || seenTitles.has(norm)) {
              duplicateCount++;
            }
            seenTitles.add(norm);
          }
        });

        const headers = list.length > 0 ? Object.keys(list[0]) : [];

        return {
          type: 'tasks',
          format: 'json',
          totalRecords: list.length,
          validRecords,
          duplicateCount,
          headers,
          sampleRows: list.slice(0, 5),
          errors,
        };
      } catch (err: any) {
        return {
          type: 'tasks',
          format: 'json',
          totalRecords: 0,
          validRecords: 0,
          duplicateCount: 0,
          headers: [],
          sampleRows: [],
          errors: [{ row: 1, message: `Invalid JSON syntax: ${err.message}` }],
        };
      }
    }
  }
}

/**
 * Commits import into SQLite database.
 */
export async function commitDatasetImport(
  type: DatasetType,
  content: string,
  forcedFormat?: DatasetFormat,
  options: DatasetImportOptions = {}
): Promise<DatasetImportResult> {
  const format = forcedFormat || detectFormat(content);
  const conflictMode = options.conflictMode || 'skip';
  const db = await getDatabase();

  if (type === 'problems') {
    if (format === 'csv') {
      // Re-use existing robust CSV sheet importer!
      const summary = await importCodingSheetFromCsv({
        csvText: content,
        targetTrackSlug: options.targetTrackSlug,
        newTrackTitle: options.newTrackTitle,
        category: options.newTrackCategory || 'Imported Sheets',
      });

      return {
        success: summary.imported > 0 || (summary.duplicates > 0 && summary.errors.length === 0),
        type: 'problems',
        total: summary.totalRows || (summary.imported + summary.duplicates + summary.skipped),
        imported: summary.imported,
        duplicatesSkipped: summary.duplicates || summary.duplicate || 0,
        errors: summary.errors.map(e => ({ row: e.row || e.line || 1, message: e.error || e.message || 'Row error' })),
        targetDestination: options.targetTrackSlug || options.newTrackTitle || 'Coding Sheet',
        message: `Imported ${summary.imported} questions successfully (${summary.duplicates || 0} duplicates skipped).`,
      };
    } else {
      // JSON Problems Import
      const parsed = JSON.parse(content);
      const list: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.questions)
        ? parsed.questions
        : Array.isArray(parsed.problems)
        ? parsed.problems
        : [];

      let targetSlug = options.targetTrackSlug || 'imported-problems';
      if (options.newTrackTitle && options.newTrackTitle.trim()) {
        const { createTrack } = await import('@/services/db');
        const created = await createTrack({
          title: options.newTrackTitle.trim(),
          category: options.newTrackCategory || 'Imported JSON',
          description: `Imported problem set (${list.length} questions)`,
        });
        targetSlug = created.slug;
      }

      const existingRows = db.exec(`SELECT id, LOWER(TRIM(title)) FROM questions WHERE track_slug = ?`, [targetSlug]);
      const titleToId = new Map<string, string>();
      if (existingRows.length && existingRows[0].values) {
        existingRows[0].values.forEach(v => {
          if (v[0] && v[1]) titleToId.set(String(v[1]).toLowerCase().trim(), String(v[0]));
        });
      }

      const maxRes = db.exec(`SELECT COALESCE(MAX(order_num), 0) FROM questions WHERE track_slug = ?`, [targetSlug]);
      let currentOrder = maxRes.length > 0 ? (maxRes[0].values[0][0] as number) : 0;

      let imported = 0;
      let duplicatesSkipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      db.run('BEGIN TRANSACTION;');

      try {
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const rowNum = i + 1;
          const title = item.title || item.name || item.problem_name;

          if (!title || typeof title !== 'string') {
            errors.push({ row: rowNum, message: 'Missing problem title.' });
            continue;
          }

          const norm = title.toLowerCase().trim();
          const existingId = titleToId.get(norm);

          if (existingId) {
            if (conflictMode === 'skip') {
              duplicatesSkipped++;
              continue;
            } else if (conflictMode === 'overwrite') {
              const diff = item.difficulty || 'Medium';
              db.run(
                `UPDATE questions SET difficulty = ?, pattern_name = ?, practice_link = ?, video_link = ?, xp = ? WHERE id = ?`,
                [diff, item.pattern_name || 'General', item.practice_link || '', item.video_link || '', item.xp || 10, existingId]
              );
              imported++;
              continue;
            }
          }

          // New or keep_both
          currentOrder++;
          const orderNum = item.order_num || currentOrder;
          const diffRaw = item.difficulty || 'Medium';
          const difficulty = ['Easy', 'Medium', 'Hard'].includes(diffRaw) ? diffRaw : 'Medium';
          const platform = item.platform || 'LeetCode';
          const patternName = item.pattern_name || 'General';
          const subtopicName = item.subtopic_name || '';
          const practiceLink = item.practice_link || '';
          const videoLink = item.video_link || '';
          const hintLink = item.hint_link || '';
          const xp = item.xp || (difficulty === 'Easy' ? 5 : difficulty === 'Medium' ? 10 : 15);
          const status = (item.status || 'todo').toLowerCase();

          const id = `prob-${targetSlug}-${orderNum}-${Math.random().toString(36).substring(2, 6)}`;

          db.run(
            `INSERT INTO questions
             (id, track_slug, title, platform, difficulty, pattern_name, subtopic_name, practice_link, video_link, hint_link, xp, status, order_num)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, targetSlug, title, platform, difficulty, patternName, subtopicName, practiceLink, videoLink, hintLink, xp, status, orderNum]
          );

          titleToId.set(norm, id);
          imported++;
        }

        db.run('COMMIT;');
      } catch (err: any) {
        db.run('ROLLBACK;');
        throw new Error(`JSON problem import transaction failed: ${err.message}`);
      }

      persistDatabase();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ap_questions_updated'));
        window.dispatchEvent(new CustomEvent('ap_tracks_updated'));
      }

      return {
        success: imported > 0 || (duplicatesSkipped > 0 && errors.length === 0),
        type: 'problems',
        total: list.length,
        imported,
        duplicatesSkipped,
        errors,
        targetDestination: targetSlug,
        message: `Successfully imported ${imported} JSON questions into ${targetSlug} (${duplicatesSkipped} duplicates skipped).`,
      };
    }
  } else {
    // Tasks Dataset Import (CSV or JSON)
    let rawItems: any[] = [];
    if (format === 'csv') {
      const parsed = parseCsvText(content);
      rawItems = parsed.rows.map(r => ({
        title: getNormalizedFieldValue(r.record, 'title') || getNormalizedFieldValue(r.record, 'task_title') || r.record.task,
        description: getNormalizedFieldValue(r.record, 'description') || r.record.desc || '',
        priority: getNormalizedFieldValue(r.record, 'priority') || 'Medium',
        status: (getNormalizedFieldValue(r.record, 'status') || 'todo').toLowerCase(),
        due_date: getNormalizedFieldValue(r.record, 'due_date') || getNormalizedFieldValue(r.record, 'due') || '',
        estimated_minutes: parseInt(getNormalizedFieldValue(r.record, 'estimated_minutes') || getNormalizedFieldValue(r.record, 'minutes') || '25', 10) || 25,
      }));
    } else {
      const parsed = JSON.parse(content);
      const list: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed.tasks) ? parsed.tasks : [];
      rawItems = list.map((item: any) => ({
        title: item.title || item.task || item.name,
        description: item.description || item.desc || '',
        priority: item.priority || 'Medium',
        status: (item.status || 'todo').toLowerCase(),
        due_date: item.due_date || item.due || '',
        estimated_minutes: item.estimated_minutes || item.minutes || 25,
      }));
    }

    const existingTasks = db.exec(`SELECT id, LOWER(TRIM(title)) FROM tasks`);
    const titleToId = new Map<string, string>();
    if (existingTasks.length && existingTasks[0].values) {
      existingTasks[0].values.forEach(v => {
        if (v[0] && v[1]) titleToId.set(String(v[1]).toLowerCase().trim(), String(v[0]));
      });
    }

    let imported = 0;
    let duplicatesSkipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    db.run('BEGIN TRANSACTION;');

    try {
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const rowNum = i + 1;

        if (!item.title || typeof item.title !== 'string') {
          errors.push({ row: rowNum, message: 'Missing task title.' });
          continue;
        }

        const norm = item.title.toLowerCase().trim();
        const existingId = titleToId.get(norm);

        if (existingId) {
          if (conflictMode === 'skip') {
            duplicatesSkipped++;
            continue;
          } else if (conflictMode === 'overwrite') {
            db.run(
              `UPDATE tasks SET description = ?, priority = ?, status = ?, due_date = ?, estimated_minutes = ? WHERE id = ?`,
              [item.description || '', item.priority || 'Medium', item.status || 'todo', item.due_date || '', item.estimated_minutes || 25, existingId]
            );
            imported++;
            continue;
          }
        }

        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        db.run(
          `INSERT INTO tasks (id, title, description, priority, status, due_date, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [taskId, item.title, item.description || '', item.priority || 'Medium', item.status || 'todo', item.due_date || '', item.estimated_minutes || 25]
        );

        titleToId.set(norm, taskId);
        imported++;
      }

      db.run('COMMIT;');
    } catch (err: any) {
      db.run('ROLLBACK;');
      throw new Error(`Task import transaction failed: ${err.message}`);
    }

    persistDatabase();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ap_stats_updated'));
    }

    return {
      success: imported > 0 || (duplicatesSkipped > 0 && errors.length === 0),
      type: 'tasks',
      total: rawItems.length,
      imported,
      duplicatesSkipped,
      errors,
      targetDestination: 'Planner Tasks',
      message: `Successfully imported ${imported} tasks (${duplicatesSkipped} duplicates skipped).`,
    };
  }
}
