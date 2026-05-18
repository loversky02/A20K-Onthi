'use client';

import { useState, useEffect } from 'react';
import ProgressBar from '@/components/ProgressBar';
import ExamNav from '@/components/ExamNav';
import QuestionCard from '@/components/QuestionCard';
import { EXAM_SECTIONS, type Question, type UserAnswer, type GradedAnswer, type ExamSection } from '@/types';

const TRACK_KEYS: ExamSection[] = ['track1', 'track2', 'track3'];

export default function PracticePage() {
  const [selectedTrack, setSelectedTrack] = useState<ExamSection>('track1');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [part1Count, setPart1Count] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [graded, setGraded] = useState<Record<string, GradedAnswer>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const startPractice = async () => {
    setLoading(true);

    const part1Topics = EXAM_SECTIONS.part1.topics.map(t => `topic=${t}`).join('&');
    const trackTopic = selectedTrack === 'track1' ? 'track1_business' :
      selectedTrack === 'track2' ? 'track2_infra' : 'track3_appbuild';

    const [res1, res2] = await Promise.all([
      fetch(`/api/questions?${part1Topics}`),
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
    setGraded({});
    setCurrent(0);
    setStarted(true);
    setLoading(false);
  };

  const checkAnswer = async (answer: UserAnswer) => {
    updateAnswer(answer);
    const resp = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [answer], time_spent: 0 }),
    });
    const result = await resp.json();
    if (result.graded && result.graded[0]) {
      setGraded((prev) => ({ ...prev, [answer.questionId]: result.graded[0] }));
    }
  };

  const updateAnswer = (answer: UserAnswer) => {
    setAnswers((prev) => prev.map((a) => (a.questionId === answer.questionId ? answer : a)));
  };

  const resetQuestion = (questionId: string) => {
    setGraded((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    setAnswers((prev) => prev.map((a) =>
      a.questionId === questionId ? { questionId: a.questionId } : a
    ));
  };

  // ─── Track selection ───
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Luyện tập</h1>
            <p className="text-sm text-slate-500">
              Làm từng câu, kiểm tra đáp án ngay, có giải thích chi tiết. Phần I (Chung) + Phần II (Chọn track).
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn Track cho Phần II</label>
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

          <button
            onClick={startPractice}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang tải câu hỏi...' : 'Bắt đầu luyện tập'}
          </button>
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
        <p className="text-slate-500 mb-4">Chưa có câu hỏi nào.</p>
        <a href="/exam" className="text-blue-600 hover:underline">Thi thử →</a>
      </div>
    );
  }

  const isPart2 = current >= part1Count;
  const answeredCount = Object.keys(graded).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 sticky top-14 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">Luyện tập</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            {isPart2 ? 'Phần II' : 'Phần I'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar current={current + 1} total={questions.length} answered={answeredCount} />
        </div>
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
        gradedAnswer={graded[questions[current]?.id]}
        onChange={updateAnswer}
      />

      {!graded[questions[current]?.id] && (
        <div className="text-center">
          <button
            onClick={() => checkAnswer(answers[current])}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Kiểm tra đáp án
          </button>
        </div>
      )}

      {graded[questions[current]?.id] && (
        <div className="text-center">
          <button
            onClick={() => resetQuestion(questions[current].id)}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Làm lại câu này
          </button>
        </div>
      )}

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
