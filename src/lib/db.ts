import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Railway volume mount: /app/data persists across deploys & containers
const DB_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'questions.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      topic TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT,
      points INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_results (
      id TEXT PRIMARY KEY,
      score REAL NOT NULL,
      total_points INTEGER NOT NULL,
      answers TEXT NOT NULL,
      time_spent INTEGER DEFAULT 0,
      student_name TEXT DEFAULT '',
      student_id TEXT DEFAULT '',
      track TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safe migration for existing DBs
  const cols = db.prepare("PRAGMA table_info('exam_results')").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('student_name')) {
    db.exec("ALTER TABLE exam_results ADD COLUMN student_name TEXT DEFAULT ''");
  }
  if (!colNames.has('student_id')) {
    db.exec("ALTER TABLE exam_results ADD COLUMN student_id TEXT DEFAULT ''");
  }
  if (!colNames.has('track')) {
    db.exec("ALTER TABLE exam_results ADD COLUMN track TEXT DEFAULT ''");
  }
  if (!colNames.has('ip')) {
    db.exec("ALTER TABLE exam_results ADD COLUMN ip TEXT DEFAULT ''");
  }

  // Auto-seed if empty, or refresh track2 questions if stale
  const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number };
  if (cnt === 0) {
    importSeed(db);
  } else {
    refreshTrack2Questions(db);
  }
}

function importSeed(db: Database.Database) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { v4: uuid } = require('uuid');
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.join(process.cwd(), 'src', 'lib', 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const insert = db.prepare('INSERT INTO questions (id, type, topic, content, answer, explanation, points) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const q of data) {
      insert.run(uuid(), q.type, q.topic, JSON.stringify(q.content), JSON.stringify(q.answer), q.explanation, q.points);
    }
  });
  tx();
  console.log(`Auto-seeded ${data.length} questions.`);
}

/**
 * Detect stale track2 questions (containing repetitive "Track2 Infrastructure")
 * and replace them with updated seed data. One-time migration safe to re-run.
 */
function refreshTrack2Questions(db: Database.Database) {
  const stale = db.prepare(
    "SELECT COUNT(*) as cnt FROM questions WHERE topic = 'track2_infra' AND content LIKE '%Track2 Infrastructure%'"
  ).get() as { cnt: number };

  if (stale.cnt === 0) return;

  console.log(`Found ${stale.cnt} stale track2 questions — refreshing from seed...`);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { v4: uuid } = require('uuid');
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.join(process.cwd(), 'src', 'lib', 'seed-data.json');
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const track2Seed = data.filter((q: { topic: string }) => q.topic === 'track2_infra');

  const del = db.prepare("DELETE FROM questions WHERE topic = 'track2_infra'");
  const insert = db.prepare('INSERT INTO questions (id, type, topic, content, answer, explanation, points) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const tx = db.transaction(() => {
    del.run();
    for (const q of track2Seed) {
      insert.run(uuid(), q.type, q.topic, JSON.stringify(q.content), JSON.stringify(q.answer), q.explanation, q.points);
    }
  });
  tx();
  console.log(`Refreshed ${track2Seed.length} track2 questions.`);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
