'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ResultSummary from '@/components/ResultSummary';
import QuestionCard from '@/components/QuestionCard';
import type { ExamResult, Question } from '@/types';

function ResultsContent() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get('id');
  const [results, setResults] = useState<Array<{ id: string; score: number; total_points: number; time_spent: number; student_name: string; student_id: string; track: string; created_at: string }>>([]);
  const [detail, setDetail] = useState<ExamResult | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch('/api/questions')
      .then((r) => r.json())
      .then((data: Question[]) => {
        const map: Record<string, Question> = {};
        data.forEach((q) => { map[q.id] = q; });
        setQuestions(map);
      });

    if (resultId) {
      fetch(`/api/results/${resultId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) return;
          setDetail(data);
          setLoading(false);
        });
    } else {
      fetch('/api/results')
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        });
    }
  }, [resultId]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Đang tải...</div>;
  }

  // Detail view
  if (detail && resultId) {
    return (
      <div className="space-y-6">
        {(detail.student_name || detail.student_id) && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-6 text-sm">
            {detail.student_name && (
              <div><span className="text-slate-400">Họ tên:</span> <span className="font-semibold text-slate-800">{detail.student_name}</span></div>
            )}
            {detail.student_id && (
              <div><span className="text-slate-400">Mã HV:</span> <span className="font-semibold text-slate-800">{detail.student_id}</span></div>
            )}
            {detail.track && (
              <div><span className="text-slate-400">Track:</span> <span className="font-semibold text-slate-800">{detail.track}</span></div>
            )}
          </div>
        )}

        <ResultSummary
          score={detail.score}
          total={detail.total_points}
          timeSpent={detail.time_spent}
          graded={detail.answers}
        />

        <h2 className="text-xl font-bold text-slate-800 mt-8">Review từng câu</h2>
        <div className="space-y-4">
          {detail.answers.map((ga, i) => {
            const q = questions[ga.questionId];
            if (!q) return null;
            return (
              <QuestionCard
                key={ga.questionId}
                question={q}
                index={i}
                userAnswer={{ questionId: ga.questionId, selected: ga.selected, text: ga.text }}
                gradedAnswer={ga}
                onChange={() => {}}
                readonly
              />
            );
          })}
        </div>

        <div className="text-center pt-4">
          <a href="/results" className="text-blue-600 hover:underline text-sm">← Danh sách kết quả</a>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Lịch sử kết quả</h1>
        <button
          onClick={async () => {
            if (!confirm('Xóa tất cả kết quả?')) return;
            await fetch('/api/results', { method: 'DELETE' });
            setResults([]);
          }}
          className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Xóa tất cả
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="mb-4">Chưa có kết quả nào.</p>
          <a href="/exam" className="text-blue-600 hover:underline">Thi thử ngay →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const pct = r.total_points > 0 ? Math.round((r.score / r.total_points) * 100) : 0;
            const min = Math.floor(r.time_spent / 60);
            const sec = r.time_spent % 60;
            return (
              <a
                key={r.id}
                href={`/results?id=${r.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">
                        {r.score}<span className="text-slate-400 text-sm">/{r.total_points} điểm</span>
                      </span>
                      <span className={`text-sm font-semibold ${pct >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>({pct}%)</span>
                      {r.track && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{r.track}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {r.student_name && <span>{r.student_name} · </span>}
                      {r.student_id && <span>{r.student_id} · </span>}
                      {new Date(r.created_at + 'Z').toLocaleString('vi-VN')} · {min}:{String(sec).padStart(2, '0')}
                    </div>
                  </div>
                  <span className="text-slate-300">→</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Đang tải...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
