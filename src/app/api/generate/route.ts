import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { chatDeepSeek, generatePrompt, parseQuestionsResponse } from '@/lib/deepseek';
import type { GenerateRequest } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { topic, count = 5, types = ['single', 'multi', 'short'] } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Thiếu topic' }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY chưa được cấu hình' }, { status: 500 });
    }

    const messages = generatePrompt(topic, count, types);
    const raw = await chatDeepSeek(messages);
    const questions = parseQuestionsResponse(raw);

    const db = getDb();
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

    return NextResponse.json({ success: true, count: ids.length, ids });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Generate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
