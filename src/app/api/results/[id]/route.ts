import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM exam_results WHERE id = ?').get(params.id) as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ error: 'Kết quả không tìm thấy' }, { status: 404 });
  }

  return NextResponse.json({
    ...row,
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers as string) : row.answers,
  });
}
