'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import ExamNav from '@/components/ExamNav';
import QuestionCard from '@/components/QuestionCard';
import { EXAM_SECTIONS, type Question, type UserAnswer, type ExamSection } from '@/types';

const EXAM_TIME = 120 * 60; // 120 phút cho cả 2 phần
const TRACK_KEYS: ExamSection[] = ['track1', 'track2', 'track3'];

export default function ExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'register' | 'exam' | 'submitted'>('register');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [part1Count, setPart1Count] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<ExamSection>('track1');
  const startTimeRef = useRef(0);

  const startExam = async () => {
    setLoading(true);

    const trackTopic = selectedTrack === 'track1' ? 'track1_business' :
      selectedTrack === 'track2' ? 'track2_infra' : 'track3_appbuild';

    // Random question source: bank only, AI only, or mix
    const roll = Math.random();
    const strategy = roll < 0.33 ? 'bank' : roll < 0.66 ? 'mix' : 'ai';

    if (strategy === 'ai' || strategy === 'mix') {
      // Fire-and-forget: generate in background, don't block exam start
      const shuffled = [...EXAM_SECTIONS.part1.topics].sort(() => Math.random() - 0.5);
      const nPart1 = strategy === 'ai' ? 3 : 2;
      const count = strategy === 'ai' ? 4 : 3;
      const genTopics: { topic: string; count: number }[] = [
        ...shuffled.slice(0, nPart1).map(t => ({ topic: t, count })),
        { topic: trackTopic, count: strategy === 'ai' ? 5 : 4 },
      ];

      genTopics.forEach(({ topic, count: n }) =>
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, count: n, types: ['single', 'multi', 'short', 'scenario'] }),
        }).catch(() => {})
      );
    }

    // Load questions from bank immediately (fast, no AI wait)
    const part1Params = EXAM_SECTIONS.part1.topics.map(t => `topic=${t}`).join('&');
    const [res1, res2] = await Promise.all([
      fetch(`/api/questions?${part1Params}`),
      fetch(`/api/questions?topic=${trackTopic}`),
    ]);

    const part1Questions: Question[] = await res1.json();
    const part2Questions: Question[] = await res2.json();

    const p1 = part1Questions.slice(0, 8);
    const p2 = part2Questions.slice(0, 7);
    const all = [...p1, ...p2];

    setPart1Count(p1.length);
    setQuestions(all);
    setAnswers(all.map((q) => ({ questionId: q.id })));
    setPhase('exam');
    startTimeRef.current = Date.now();
    setLoading(false);
  };

  const handleSubmit = useCallback(async (timeSpent: number) => {
    if (phase === 'submitted') return;
    setSubmitting(true);
    setPhase('submitted');

    const trackInfo = EXAM_SECTIONS[selectedTrack];
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        time_spent: timeSpent,
        student_name: studentName,
        student_id: studentId,
        track: `Phần I (Chung) + ${trackInfo.label}`,
      }),
    });
    const result = await resp.json();
    router.push(`/results?id=${result.id}`);
  }, [answers, phase, router, studentName, studentId, selectedTrack]);

  const onTimeUp = useCallback(() => {
    handleSubmit(EXAM_TIME);
  }, [handleSubmit]);

  const updateAnswer = (answer: UserAnswer) => {
    setAnswers((prev) => prev.map((a) => (a.questionId === answer.questionId ? answer : a)));
  };

  // ─── Registration ───
  if (phase === 'register') {
    const canStart = studentName.trim().length > 0 && studentId.trim().length > 0;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Đăng ký thi thử</h1>
            <p className="text-sm text-slate-500">
              Bài thi 100 điểm — Phần I (Chung, 50đ) + Phần II (Chuyên sâu Track, 50đ)
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-2">
            <p className="font-semibold">Hướng dẫn:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Khoanh tròn đáp án cho phần trắc nghiệm và đúng/sai.</li>
              <li>Phần điền khuyết cần viết chính xác từ/cụm từ.</li>
              <li>Tự luận ngắn &amp; case study: trả lời súc tích không quá 10 câu, có ví dụ cụ thể và lý giải rõ ràng.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mã học viên <span className="text-red-500">*</span></label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)}
                placeholder="HV001"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn Track cho Phần II <span className="text-red-500">*</span></label>
              <div className="space-y-2 mt-2">
                {TRACK_KEYS.map((key) => {
                  const s = EXAM_SECTIONS[key];
                  return (
                    <button key={key}
                      onClick={() => setSelectedTrack(key)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                        selectedTrack === key
                          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{s.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={startExam}
            disabled={!canStart || loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang chuẩn bị đề...' : 'Bắt đầu làm bài (120 phút)'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return <div className="text-center py-20 text-slate-400">Đang chuẩn bị đề...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">Chưa có câu hỏi nào.</p>
        <a href="/generate" className="text-blue-600 hover:underline">Tạo câu hỏi →</a>
      </div>
    );
  }

  const isPart2 = current >= part1Count;
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
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            {isPart2 ? 'Phần II' : 'Phần I'}
          </span>
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

      {/* Section divider */}
      {current === part1Count && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <div className="font-bold text-emerald-700 text-lg">Phần II — {EXAM_SECTIONS[selectedTrack].label}</div>
          <div className="text-sm text-emerald-600 mt-1">Chuyên sâu Track — 50 điểm</div>
        </div>
      )}

      {current === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="font-bold text-blue-700 text-lg">Phần I — Chung</div>
          <div className="text-sm text-blue-600 mt-1">Bắt buộc cho tất cả học viên — 50 điểm</div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
        <strong>Nhắc nhở:</strong> Trả lời ngắn gọn, súc tích. Case study: không quá 10 câu, có ví dụ cụ thể và lý giải rõ ràng.
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <ExamNav total={questions.length} current={current} answers={answers} onSelect={setCurrent} />
        {part1Count > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Phần I: 1–{part1Count}</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">Phần II: {part1Count + 1}–{questions.length}</span>
          </div>
        )}
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
