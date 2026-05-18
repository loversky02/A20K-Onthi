'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import ExamNav from '@/components/ExamNav';
import QuestionCard from '@/components/QuestionCard';
import { EXAM_SECTIONS, type Question, type UserAnswer, type ExamSection } from '@/types';

const EXAM_TIME = 60 * 60; // 60 phút

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionKey = (searchParams.get('section') || 'part1') as ExamSection;
  const section = EXAM_SECTIONS[sectionKey] || EXAM_SECTIONS.part1;

  const [phase, setPhase] = useState<'select' | 'register' | 'exam' | 'submitted'>('select');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const startTimeRef = useRef(0);

  const startExam = () => {
    setLoading(true);
    const topicFilter = section.topics.map(t => `topic=${t}`).join('&');
    fetch(`/api/questions?${topicFilter}`)
      .then((r) => r.json())
      .then((data: Question[]) => {
        const selected = data.slice(0, 16);
        setQuestions(selected);
        setAnswers(selected.map((q) => ({ questionId: q.id })));
        setPhase('exam');
        startTimeRef.current = Date.now();
        setLoading(false);
      });
  };

  const handleSubmit = useCallback(async (timeSpent: number) => {
    if (phase === 'submitted') return;
    setSubmitting(true);
    setPhase('submitted');

    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        time_spent: timeSpent,
        student_name: studentName,
        student_id: studentId,
        track: section.label,
      }),
    });
    const result = await resp.json();
    router.push(`/results?id=${result.id}`);
  }, [answers, phase, router, studentName, studentId, section.label]);

  const onTimeUp = useCallback(() => {
    handleSubmit(EXAM_TIME);
  }, [handleSubmit]);

  const updateAnswer = (answer: UserAnswer) => {
    setAnswers((prev) => prev.map((a) => (a.questionId === answer.questionId ? answer : a)));
  };

  // ─── Select track ───
  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Chọn phần thi</h1>
        <p className="text-slate-500">
          Mỗi phần thi 50 điểm, 60 phút. Chọn đúng track bạn đã đăng ký.
        </p>
        <div className="space-y-3">
          {Object.values(EXAM_SECTIONS).map((s) => (
            <button
              key={s.key}
              onClick={() => {
                window.location.href = `/exam?section=${s.key}`;
              }}
              className={`w-full text-left bg-white rounded-xl border p-5 hover:shadow-md transition-all ${
                s.key === sectionKey
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{s.label}</h2>
                  <p className="text-sm text-slate-500 mt-1">{s.subtitle}</p>
                </div>
                <span className="text-slate-300 text-2xl">→</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>{s.points} điểm</span>
                <span>{s.timeMinutes} phút</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setPhase('register')}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Tiếp tục với {section.label}
        </button>
      </div>
    );
  }

  // ─── Registration ───
  if (phase === 'register') {
    const canStart = studentName.trim().length > 0 && studentId.trim().length > 0;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Thông tin thí sinh</h1>
            <p className="text-sm text-slate-500">Vui lòng ghi rõ Họ tên, Mã học viên và Track đã chọn.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
            <p className="font-semibold">Hướng dẫn làm bài:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Khoanh tròn đáp án cho phần trắc nghiệm và đúng/sai.</li>
              <li>Phần điền khuyết cần viết chính xác từ/cụm từ.</li>
              <li>Với câu tự luận ngắn và case study, ưu tiên trả lời súc tích không quá 10 câu kèm ví dụ cụ thể và lý giải rõ ràng.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mã học viên <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="HV001"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Track đã chọn</label>
              <input
                type="text"
                value={section.label}
                readOnly
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('select')}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              ← Quay lại
            </button>
            <button
              onClick={startExam}
              disabled={!canStart || loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Đang tải...' : 'Bắt đầu làm bài'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return <div className="text-center py-20 text-slate-400">Đang tải câu hỏi...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Chưa có câu hỏi nào cho phần này.</p>
        <a href="/generate" className="text-blue-600 hover:underline">Tạo câu hỏi →</a>
      </div>
    );
  }

  const answeredCount = answers.filter((a) =>
    (typeof a.selected === 'number') ||
    (Array.isArray(a.selected) && a.selected.length > 0) ||
    (typeof a.text === 'string' && a.text.trim().length > 0)
  ).length;

  const submitEarly = () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    handleSubmit(Math.min(elapsed, EXAM_TIME));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 sticky top-14 z-40">
        <div className="flex items-center gap-3">
          <Timer totalSeconds={EXAM_TIME} onTimeUp={onTimeUp} running={phase === 'exam'} />
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">{section.label}</span>
        </div>
        <ProgressBar current={current + 1} total={questions.length} answered={answeredCount} />
        <button
          onClick={submitEarly}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Đang nộp...' : 'Nộp bài'}
        </button>
      </div>

      {/* Instruction reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
        <strong>Nhắc nhở:</strong> Trả lời ngắn gọn, súc tích. Với case study: không quá 10 câu, có ví dụ cụ thể và lý giải rõ ràng.
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <ExamNav total={questions.length} current={current} answers={answers} onSelect={setCurrent} />
      </div>

      <QuestionCard
        question={questions[current]}
        index={current}
        userAnswer={answers[current]}
        onChange={updateAnswer}
      />

      <div className="flex justify-between gap-4">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          ← Câu trước
        </button>
        <span className="text-sm text-slate-400 self-center">{current + 1} / {questions.length}</span>
        <button
          onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
          disabled={current === questions.length - 1}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          Câu sau →
        </button>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Đang tải...</div>}>
      <ExamContent />
    </Suspense>
  );
}
