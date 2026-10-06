import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const pages = [
  { id: 'dashboard', filename: '01_dashboard.png', expectedDiff: '0%' },
  { id: 'tracks', filename: '02_tracks.png', expectedDiff: '0%' },
  { id: 'problems', filename: '03_problems.png', expectedDiff: '0%' },
  { id: 'python', filename: '04_python.png', expectedDiff: '> 0%' },
  { id: 'sql', filename: '05_sql.png', expectedDiff: '> 0%' },
  { id: 'postgres', filename: '06_postgres.png', expectedDiff: '> 0%' },
  { id: 'planner', filename: '07_planner.png', expectedDiff: '0%' },
  { id: 'sessions', filename: '08_sessions.png', expectedDiff: '0%' },
  { id: 'analytics', filename: '09_analytics.png', expectedDiff: '0%' },
  { id: 'review', filename: '10_review.png', expectedDiff: '0%' },
  { id: 'reports', filename: '11_reports.png', expectedDiff: '0%' },
  { id: 'settings', filename: '12_settings.png', expectedDiff: '0%' },
];

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();

  const report = [];

  for (const p of pages) {
    const basePath = path.resolve('tests/visual/baseline', p.filename);
    const afterPath = path.resolve('tests/visual/after', p.filename);

    if (!fs.existsSync(basePath) || !fs.existsSync(afterPath)) {
      report.push({ page: p.id, filename: p.filename, diff: 'MISSING FILE' });
      continue;
    }

    const baseB64 = fs.readFileSync(basePath).toString('base64');
    const afterB64 = fs.readFileSync(afterPath).toString('base64');

    const result = await page.evaluate(async ({ baseB64, afterB64 }) => {
      const loadImg = (b64) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `data:image/png;base64,${b64}`;
      });

      const img1 = await loadImg(baseB64);
      const img2 = await loadImg(afterB64);

      const w = img1.width;
      const h = img1.height;

      const c1 = document.createElement('canvas');
      c1.width = w;
      c1.height = h;
      const ctx1 = c1.getContext('2d');
      ctx1.drawImage(img1, 0, 0);
      const data1 = ctx1.getImageData(0, 0, w, h).data;

      const c2 = document.createElement('canvas');
      c2.width = w;
      c2.height = h;
      const ctx2 = c2.getContext('2d');
      ctx2.drawImage(img2, 0, 0);
      const data2 = ctx2.getImageData(0, 0, w, h).data;

      let diffCount = 0;
      const totalPixels = w * h;

      for (let i = 0; i < data1.length; i += 4) {
        // Compare RGBA
        const dr = Math.abs(data1[i] - data2[i]);
        const dg = Math.abs(data1[i + 1] - data2[i + 1]);
        const db = Math.abs(data1[i + 2] - data2[i + 2]);
        const da = Math.abs(data1[i + 3] - data2[i + 3]);
        if (dr > 10 || dg > 10 || db > 10 || da > 10) {
          diffCount++;
        }
      }

      return {
        diffPercent: (diffCount / totalPixels) * 100,
        diffCount,
        totalPixels
      };
    }, { baseB64, afterB64 });

    report.push({
      page: p.id,
      filename: p.filename,
      diffPercent: result.diffPercent.toFixed(2) + '%',
      diffCount: result.diffCount,
      totalPixels: result.totalPixels,
      expected: p.expectedDiff
    });
  }

  await browser.close();

  console.log('\n--- VISUAL DIFF COMPARISON REPORT ---');
  console.table(report);
}

main().catch(console.error);
