import Link from 'next/link';
import { getDb } from '@/lib/db';
import { EXAM_SECTIONS } from '@/types';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const db = getDb();
  const { cnt: questionCount } = db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number };
  const { cnt: resultCount } = db.prepare('SELECT COUNT(*) as cnt FROM exam_results').get() as { cnt: number };

  const part1Count = EXAM_SECTIONS.part1.topics.reduce((s, t) =>
    s + (db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE topic = ?').get(t) as { cnt: number }).cnt, 0
  );

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-3">Bài thi Giữa kỳ</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Chương trình Phát triển Năng lực AI Thực Chiến — Giai đoạn 1 + 2 (28 ngày).
          Bài thi 100 điểm gồm Phần I (Chung, 50đ) + Phần II (Chuyên sâu Track, 50đ).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/exam" className="group bg-white rounded-xl border border-blue-200 p-6 hover:border-blue-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Thi thử</h2>
          <p className="text-sm text-slate-500">
            Làm bài 120 phút với 100 điểm. Phần I bắt buộc + Phần II chọn 1 track.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-blue-600 group-hover:underline">Bắt đầu thi →</span>
        </Link>

        <Link href="/practice" className="group bg-white rounded-xl border border-emerald-200 p-6 hover:border-emerald-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Luyện tập</h2>
          <p className="text-sm text-slate-500">
            Làm từng câu, kiểm tra đáp án ngay, có giải thích chi tiết.
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-emerald-600 group-hover:underline">Luyện tập →</span>
        </Link>

        <Link href="/results" className="group bg-white rounded-xl border border-amber-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Kết quả</h2>
          <p className="text-sm text-slate-500">
            Xem lịch sử bài thi ({resultCount} bài đã làm).
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-amber-600 group-hover:underline">Xem kết quả →</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Cấu trúc bài thi (100 điểm)</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">I</div>
            <div>
              <h3 className="font-bold text-slate-800">Phần I — Chung (50 điểm, 60 phút)</h3>
              <p className="text-sm text-slate-600 mt-1">
                Bắt buộc cho tất cả học viên. AI Design Patterns, RAG Pipeline, Prompt Engineering,
                Agent Architecture, Observability &amp; Bảo mật AI.
              </p>
              <p className="text-xs text-slate-400 mt-1">{part1Count} câu có sẵn</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">II</div>
            <div>
              <h3 className="font-bold text-slate-800">Phần II — Chuyên sâu Track (50 điểm, 60 phút)</h3>
              <p className="text-sm text-slate-600 mt-1">Chọn 1 trong 3 track đã đăng ký:</p>
              <div className="mt-2 space-y-1 text-sm">
                {[
                  { key: 'track1', label: 'Track 1 — Business', sub: 'Product Management, ROI, AI Roadmap, EU AI Act, Luật TTNT VN' },
                  { key: 'track2', label: 'Track 2 — Infrastructure', sub: 'Data Lakehouse, GPU FinOps, Model Serving, CI/CD & Security' },
                  { key: 'track3', label: 'Track 3 — App Build', sub: 'Advanced Agent, RAG nâng cao, LoRA, RAGAS Metrics, Code Challenge' },
                ].map((t) => {
                  const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE topic = ?').get(t.key + '_business' in EXAM_SECTIONS ? (t.key === 'track1' ? 'track1_business' : t.key === 'track2' ? 'track2_infra' : 'track3_appbuild') : '') as { cnt: number } | { cnt: number });
                  // simplified
                  return (
                    <div key={t.key} className="flex items-center gap-2 text-slate-600">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-slate-400">{t.sub}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">Tổng quan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-slate-400">Tổng câu hỏi</div><div className="text-2xl font-bold text-slate-800">{questionCount}</div></div>
          <div><div className="text-slate-400">Thời gian</div><div className="text-2xl font-bold text-slate-800">120 phút</div></div>
          <div><div className="text-slate-400">Tổng điểm</div><div className="text-2xl font-bold text-slate-800">100</div></div>
          <div><div className="text-slate-400">Loại câu hỏi</div><div className="text-xs text-slate-600">Trắc nghiệm, Multi-select, Trả lời ngắn, Scenario, Case Study</div></div>
        </div>
      </div>
    </div>
  );
}
