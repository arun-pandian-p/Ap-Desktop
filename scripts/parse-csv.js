import fs from 'fs';
import path from 'path';

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const csvPath = path.resolve('grindgram_all_problems.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

const headers = parseCSVLine(lines[0]);
console.log('Headers:', headers);

const tracksMap = new Map();
const topicsMap = new Map();
const subtopicsMap = new Map();
const questions = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (row.length < 5) continue;

  const [
    order,
    trackOrder,
    trackName,
    trackSlug,
    patternNum,
    patternName,
    subtopicNum,
    subtopicName,
    probOrderInSubtopic,
    probTitle,
    platform,
    difficulty,
    practiceLink,
    videoLink,
    hintLink,
    subtopicTutorialLink,
    xp,
    contentType,
    problemId
  ] = row;

  if (!trackName) continue;

  if (!tracksMap.has(trackSlug)) {
    tracksMap.set(trackSlug, {
      id: `track-${trackSlug}`,
      slug: trackSlug,
      title: trackName,
      track_order: parseInt(trackOrder) || 1,
      level: trackSlug.includes('coding') ? 'intermediate' : 'beginner',
      description: `Complete track for ${trackName} with curated practice items and tutorials.`,
      icon: trackSlug.includes('coding') ? 'Code2' : trackSlug.includes('sql') ? 'Database' : 'BookOpen',
      total_problems: 0,
      solved_problems: 0,
    });
  }

  const track = tracksMap.get(trackSlug);
  track.total_problems++;

  const topicKey = `${trackSlug}::${patternName}`;
  if (!topicsMap.has(topicKey)) {
    topicsMap.set(topicKey, {
      id: `topic-${topicsMap.size + 1}`,
      track_id: track.id,
      pattern_number: parseInt(patternNum) || 1,
      title: patternName || 'General',
      topic_order: parseInt(patternNum) || 1,
      problem_count: 0
    });
  }
  const topic = topicsMap.get(topicKey);
  topic.problem_count++;

  const subtopicKey = `${topicKey}::${subtopicName}`;
  if (!subtopicsMap.has(subtopicKey)) {
    subtopicsMap.set(subtopicKey, {
      id: `subtopic-${subtopicsMap.size + 1}`,
      topic_id: topic.id,
      subtopic_number: parseInt(subtopicNum) || 1,
      title: subtopicName || 'Core Practice',
      tutorial_link: subtopicTutorialLink || '',
      video_link: videoLink || '',
      subtopic_order: parseInt(subtopicNum) || 1
    });
  }
  const subtopic = subtopicsMap.get(subtopicKey);

  questions.push({
    id: problemId || `prob-${i}`,
    subtopic_id: subtopic.id,
    track_slug: trackSlug,
    pattern_name: patternName,
    subtopic_name: subtopicName,
    title: probTitle,
    platform: platform || 'Ap Practice',
    difficulty: difficulty === 'Hard' ? 'Hard' : difficulty === 'Medium' ? 'Medium' : 'Easy',
    practice_link: practiceLink || '',
    video_link: videoLink || '',
    hint_link: hintLink || '',
    xp: parseInt(xp) || 5,
    content_type: contentType || 'problem',
    status: 'todo',
    order_num: parseInt(order) || i,
    last_attempted: null,
    is_bookmarked: false
  });
}

const tracks = Array.from(tracksMap.values());
const topics = Array.from(topicsMap.values());
const subtopics = Array.from(subtopicsMap.values());

console.log(`Parsed successfully:`);
console.log(`- Tracks: ${tracks.length}`);
console.log(`- Topics (Patterns): ${topics.length}`);
console.log(`- Subtopics: ${subtopics.length}`);
console.log(`- Questions: ${questions.length}`);

// Ensure src/data directory exists
const outDir = path.resolve('src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'seedData.json'),
  JSON.stringify({ tracks, topics, subtopics, questions }, null, 2),
  'utf8'
);

console.log('Saved seedData.json to src/data/seedData.json');
