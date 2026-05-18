import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { gradeAnswer, calculateTotal } from '@/lib/grader';
import type { UserAnswer, Question } from '@/types';

// ─── Security helpers ───

const MAX_NAME_LEN = 100;
const MAX_ID_LEN = 50;
const MAX_TRACK_LEN = 200;
const MAX_TEXT_LEN = 4000;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX = 15; // max submissions per IP per window

const BLOCKED_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /<iframe/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<\/?\w+[^>]*>/,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\s/i,
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /system\s*:\s*/i,
  /<\/?system\s*>/i,
  /<\|.*\|>/,
  /\b(system_prompt|override|bypass)\b/i,
];

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         '127.0.0.1';
}

function sanitize(input: string | undefined, maxLen: number): string {
  if (!input) return '';
  // Strip null bytes and trim
  let s = input.replace(/\x00/g, '').trim();
  // Truncate
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function isBlocked(input: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return `Blocked pattern: ${pattern.source}`;
    }
  }
  return null;
}

function validateStudentAnswers(answers: UserAnswer[]): string | null {
  if (!Array.isArray(answers) || answers.length === 0) {
    return 'Missing or empty answers array';
  }
  if (answers.length > 50) {
    return 'Too many answers in single submission';
  }
  for (const a of answers) {
    if (!a.questionId || typeof a.questionId !== 'string') {
      return 'Invalid questionId';
    }
    if (a.questionId.length > 100) {
      return 'questionId too long';
    }
    if (typeof a.text === 'string' && a.text.length > MAX_TEXT_LEN) {
      return 'Answer text too long';
    }
    // Check text for blocked patterns
    if (typeof a.text === 'string') {
      const blocked = isBlocked(a.text);
      if (blocked) return blocked;
    }
  }
  return null;
}

// ─── POST ───

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  const body: {
    answers: UserAnswer[];
    time_spent: number;
    student_name?: string;
    student_id?: string;
    track?: string;
  } = await req.json().catch(() => null);

  if (!body || !body.answers) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate answers
  const answerErr = validateStudentAnswers(body.answers);
  if (answerErr) {
    return NextResponse.json({ error: answerErr }, { status: 400 });
  }

  // Sanitize and validate student info
  const studentName = sanitize(body.student_name, MAX_NAME_LEN);
  const studentId = sanitize(body.student_id, MAX_ID_LEN);
  const track = sanitize(body.track, MAX_TRACK_LEN);

  // Check for blocked patterns in student info
  const blockedName = studentName ? isBlocked(studentName) : null;
  if (blockedName) return NextResponse.json({ error: `Invalid student_name: ${blockedName}` }, { status: 400 });

  const blockedId = studentId ? isBlocked(studentId) : null;
  if (blockedId) return NextResponse.json({ error: `Invalid student_id: ${blockedId}` }, { status: 400 });

  const blockedTrack = track ? isBlocked(track) : null;
  if (blockedTrack) return NextResponse.json({ error: `Invalid track: ${blockedTrack}` }, { status: 400 });

  // Validate time_spent
  const timeSpent = Math.min(Math.max(0, Math.floor(body.time_spent || 0)), 86400);

  const db = getDb();

  // Rate limiting: count recent submissions from this IP
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const recentCount = (db.prepare(
    'SELECT COUNT(*) as cnt FROM exam_results WHERE ip = ? AND created_at > ?'
  ).get(ip, cutoff) as { cnt: number }).cnt;

  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Quá nhiều bài nộp. Vui lòng thử lại sau 1 giờ.' },
      { status: 429 }
    );
  }

  // Grade answers
  const graded = body.answers.map((ua) => {
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(ua.questionId) as Question | undefined;
    if (!row) {
      return {
        questionId: ua.questionId,
        type: 'single' as const,
        content: { stem: 'Câu hỏi không tìm thấy', options: [] },
        answer: { correct: -1 },
        points: 0,
        earned: 0,
        explanation: null,
        isCorrect: false,
      };
    }
    return gradeAnswer(row, ua);
  });

  const { score, total } = calculateTotal(graded);

  const resultId = uuid();
  db.prepare(`
    INSERT INTO exam_results (id, score, total_points, answers, time_spent, student_name, student_id, track, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resultId, score, total, JSON.stringify(graded), timeSpent, studentName, studentId, track, ip);

  return NextResponse.json({
    id: resultId,
    score,
    total_points: total,
    graded,
  });
}
