import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { gradeAnswer, calculateTotal } from '@/lib/grader';
import type { UserAnswer, Question } from '@/types';

export async function POST(req: NextRequest) {
  const body: { answers: UserAnswer[]; time_spent: number; student_name?: string; student_id?: string; track?: string } = await req.json();

  if (!body.answers || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'Thiếu answers' }, { status: 400 });
  }

  const db = getDb();
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
    INSERT INTO exam_results (id, score, total_points, answers, time_spent, student_name, student_id, track)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resultId, score, total, JSON.stringify(graded), body.time_spent || 0, body.student_name || '', body.student_id || '', body.track || '');

  return NextResponse.json({
    id: resultId,
    score,
    total_points: total,
    graded,
  });
}
