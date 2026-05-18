import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const url = new URL(req.url);
  const topics = url.searchParams.getAll('topic');
  const type = url.searchParams.get('type');

  let sql = 'SELECT * FROM questions WHERE 1=1';
  const params: string[] = [];

  if (topics.length > 0) {
    sql += ` AND topic IN (${topics.map(() => '?').join(',')})`;
    params.push(...topics);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY topic, type, created_at';

  const rows = db.prepare(sql).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  if (!body.id || !body.type || !body.topic || !body.content || !body.answer) {
    return NextResponse.json({ error: 'Thiếu trường bắt buộc: id, type, topic, content, answer' }, { status: 400 });
  }

  db.prepare(`
    INSERT INTO questions (id, type, topic, content, answer, explanation, points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(body.id, body.type, body.topic, JSON.stringify(body.content), JSON.stringify(body.answer), body.explanation || null, body.points || 1);

  return NextResponse.json({ success: true, id: body.id }, { status: 201 });
}
