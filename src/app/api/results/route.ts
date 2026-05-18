import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, score, total_points, time_spent, created_at
    FROM exam_results ORDER BY created_at DESC LIMIT 50
  `).all();
  return NextResponse.json(rows);
}

export async function DELETE() {
  const db = getDb();
  db.prepare('DELETE FROM exam_results').run();
  return NextResponse.json({ success: true });
}
