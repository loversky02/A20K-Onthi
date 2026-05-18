import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { chatLLM, generatePrompt, parseQuestionsResponse } from '@/lib/llm';
import type { GenerateRequest } from '@/types';

// ─── Throttle: prevent concurrent generation storms ───
const THROTTLE_WINDOW_MINUTES = 10;
const THROTTLE_MAX_QUESTIONS = 30; // max AI-generated questions per window

let inFlight = false; // single-flight: only one generation at a time

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { topic, count = 5, types = ['single', 'multi', 'short'] } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Thiếu topic' }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY && !process.env.MINIMAX_API_KEY && !process.env.MIMO_API_KEY) {
      return NextResponse.json({ error: 'Chưa cấu hình API key cho LLM' }, { status: 500 });
    }

    const db = getDb();

    // Throttle: skip if recently generated enough questions
    const cutoff = new Date(Date.now() - THROTTLE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const recentGen = db.prepare(
      "SELECT COUNT(*) as cnt FROM questions WHERE created_at > ?"
    ).get(cutoff) as { cnt: number };

    if (recentGen.cnt >= THROTTLE_MAX_QUESTIONS) {
      return NextResponse.json({ success: false, throttled: true, message: 'Đủ câu hỏi mới rồi, bỏ qua' });
    }

    // Single-flight: only one generation at a time
    if (inFlight) {
      return NextResponse.json({ success: false, throttled: true, message: 'Đang có generation khác chạy' });
    }

    inFlight = true;
    try {
      const messages = generatePrompt(topic, count, types);
      const { content: raw, provider } = await chatLLM(messages);
      const questions = parseQuestionsResponse(raw);

      const insert = db.prepare(`
        INSERT INTO questions (id, type, topic, content, answer, explanation, points)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const ids: string[] = [];
      const tx = db.transaction(() => {
        for (const q of questions) {
          const id = uuid();
          ids.push(id);
          insert.run(id, q.type, q.topic, JSON.stringify(q.content), JSON.stringify(q.answer), q.explanation || null, q.points || 2);
        }
      });
      tx();

      return NextResponse.json({ success: true, count: ids.length, ids, provider });
    } finally {
      inFlight = false;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Generate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
