import Link from 'next/link';
import { getDb } from '@/lib/db';
import { EXAM_SECTIONS, TOPIC_LABELS, type Topic } from '@/types';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const db = getDb();
  const { cnt: questionCount } = db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number };
  const { cnt: resultCount } = db.prepare('SELECT COUNT(*) as cnt FROM exam_results').get() as { cnt: number };

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-3">Ôn thi AI</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Ngân hàng câu hỏi trắc nghiệm chuyên sâu và tự luận về AI.
          Gồm 4 phần thi: Phần Chung + 3 Track chuyên sâu (Business, Infrastructure, App Build).
        </p>
      </div>

      {/* ─── Exam cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(EXAM_SECTIONS).map((section) => {
          const placeholders = section.topics.map(() => '?').join(',');
          const topicCounts = section.topics.map((t) =>
            (db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE topic = ?').get(t) as { cnt: number }).cnt
          );
          const total = topicCounts.reduce((a, b) => a + b, 0);
          const colors: Record<string, string> = {
            part1: 'border-blue-200 hover:border-blue-400',
            track1: 'border-emerald-200 hover:border-emerald-400',
            track2: 'border-purple-200 hover:border-purple-400',
            track3: 'border-amber-200 hover:border-amber-400',
          };
          return (
            <Link
              key={section.key}
              href={`/exam?section=${section.key}`}
              className={`group bg-white rounded-xl border p-6 hover:shadow-md transition-all ${colors[section.key] || 'border-slate-200 hover:border-slate-400'}`}
            >
              <h2 className="text-lg font-bold text-slate-800 mb-1">{section.label}</h2>
              <p className="text-sm text-slate-500 mb-2">{section.subtitle}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="px-2 py-0.5 bg-slate-100 rounded">{total} câu</span>
                <span>{section.points} điểm</span>
                <span>{section.timeMinutes} phút</span>
              </div>
              <span className="inline-block mt-3 text-sm font-medium text-blue-600 group-hover:underline">Thi thử →</span>
            </Link>
          );
        })}
      </div>

      {/* ─── Quick actions ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/practice" className="group bg-white rounded-xl border border-emerald-200 p-6 hover:border-emerald-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Luyện tập</h2>
          <p className="text-sm text-slate-500">Không giới hạn thời gian, xem đáp án ngay sau mỗi câu.</p>
          <span className="inline-block mt-2 text-sm font-medium text-emerald-600 group-hover:underline">Luyện tập →</span>
        </Link>
        <Link href="/generate" className="group bg-white rounded-xl border border-purple-200 p-6 hover:border-purple-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Tạo câu hỏi với AI</h2>
          <p className="text-sm text-slate-500">Dùng DeepSeek API tạo câu hỏi mới theo chủ đề.</p>
          <span className="inline-block mt-2 text-sm font-medium text-purple-600 group-hover:underline">Tạo câu hỏi →</span>
        </Link>
        <Link href="/results" className="group bg-white rounded-xl border border-amber-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Kết quả</h2>
          <p className="text-sm text-slate-500">Xem lại kết quả các bài thi đã làm ({resultCount} bài).</p>
          <span className="inline-block mt-2 text-sm font-medium text-amber-600 group-hover:underline">Xem kết quả →</span>
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">Tổng quan ngân hàng câu hỏi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div>
            <div className="text-slate-400">Tổng số câu</div>
            <div className="text-2xl font-bold text-slate-800">{questionCount}</div>
          </div>
          <div>
            <div className="text-slate-400">Loại câu hỏi</div>
            <div className="text-xs text-slate-600 leading-relaxed">Trắc nghiệm, Multi-select, Trả lời ngắn, Scenario, Case Study</div>
          </div>
          <div>
            <div className="text-slate-400">Thời gian / phần</div>
            <div className="text-2xl font-bold text-slate-800">60 phút</div>
          </div>
          <div>
            <div className="text-slate-400">Điểm / phần</div>
            <div className="text-2xl font-bold text-slate-800">50</div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-500 mb-2 uppercase">Theo phần thi</h3>
        <div className="space-y-2">
          {Object.values(EXAM_SECTIONS).map((section) => {
            const total = section.topics.reduce((s, t) =>
              s + (db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE topic = ?').get(t) as { cnt: number }).cnt, 0
            );
            return (
              <div key={section.key} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-slate-700 w-48">{section.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (total / Math.max(1, questionCount)) * 100)}%` }} />
                </div>
                <span className="text-slate-400 w-16 text-right">{total} câu</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
