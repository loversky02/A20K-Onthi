'use client';

import { useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import ExamNav from '@/components/ExamNav';
import QuestionCard from '@/components/QuestionCard';
import { EXAM_SECTIONS, type Question, type UserAnswer, type GradedAnswer, type ExamSection, type Topic } from '@/types';

type PracticeMode = 'part1' | 'part2' | 'both';

const TRACK_KEYS: ExamSection[] = ['track1', 'track2', 'track3'];

export default function PracticePage() {
  const [mode, setMode] = useState<PracticeMode>('both');
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

    const trackTopic: Topic = selectedTrack === 'track1' ? 'track1_business' :
      selectedTrack === 'track2' ? 'track2_infra' : 'track3_appbuild';

    // Random question source
    const roll = Math.random();
    const strategy = roll < 0.33 ? 'bank' : roll < 0.66 ? 'mix' : 'ai';

    if (strategy === 'ai' || strategy === 'mix') {
      // Fire-and-forget: generate in background, don't block practice start
      const shuffled = [...EXAM_SECTIONS.part1.topics].sort(() => Math.random() - 0.5);
      const nPart1 = strategy === 'ai' ? 3 : 2;
      const count = strategy === 'ai' ? 4 : 3;
      const allTopics: { topic: string; count: number }[] = [
        ...shuffled.slice(0, nPart1).map(t => ({ topic: t, count })),
        { topic: trackTopic, count: strategy === 'ai' ? 5 : 4 },
      ];

      const genTopics = mode === 'part1'
        ? allTopics.filter(t => (EXAM_SECTIONS.part1.topics as readonly string[]).includes(t.topic))
        : mode === 'part2'
        ? [{ topic: trackTopic, count: strategy === 'ai' ? 6 : 5 }]
        : allTopics;

      genTopics.forEach(({ topic, count: n }) =>
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, count: n, types: ['single', 'multi', 'short', 'scenario'] }),
        }).catch(() => {})
      );
    }

    // Load questions from bank immediately
    let part1Questions: Question[] = [];
    let part2Questions: Question[] = [];

    if (mode === 'part1' || mode === 'both') {
      const p1Params = EXAM_SECTIONS.part1.topics.map(t => `topic=${t}`).join('&');
      const res = await fetch(`/api/questions?${p1Params}`);
      part1Questions = await res.json();
    }

    if (mode === 'part2' || mode === 'both') {
      const res = await fetch(`/api/questions?topic=${trackTopic}`);
      part2Questions = await res.json();
    }

    const p1 = part1Questions.slice(0, 15);
    const p2 = part2Questions.slice(0, 15);
    const all = mode === 'both' ? [...p1.slice(0, 10), ...p2.slice(0, 10)] : mode === 'part1' ? p1 : p2;

    setPart1Count(mode === 'both' ? 10 : mode === 'part1' ? p1.length : 0);
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

  // ─── Mode + track selection ───
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Luyện tập</h1>
            <p className="text-sm text-slate-500">
              Làm từng câu, kiểm tra đáp án ngay, có giải thích chi tiết.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Chọn chế độ luyện tập</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {([
                { key: 'part1' as PracticeMode, label: 'Phần I — Chung', sub: '50đ · Bắt buộc cho tất cả', color: 'blue' },
                { key: 'part2' as PracticeMode, label: 'Phần II — Track', sub: '50đ · Chuyên sâu theo track', color: 'emerald' },
                { key: 'both' as PracticeMode, label: 'Cả hai', sub: '100đ · Phần I + Phần II', color: 'purple' },
              ]).map((opt) => {
                const active = mode === opt.key;
                const border = active
                  ? opt.color === 'blue' ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                  : opt.color === 'emerald' ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                  : 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                  : 'border-slate-200 hover:border-slate-300 bg-white';
                return (
                  <button key={opt.key}
                    onClick={() => setMode(opt.key)}
                    className={`text-left p-3 rounded-lg border text-sm transition-all ${border}`}
                  >
                    <div className="font-semibold text-slate-800">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {(mode === 'part2' || mode === 'both') && (
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
          )}

          <button
            onClick={startPractice}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Đang chuẩn bị đề...' : 'Bắt đầu luyện tập'}
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
        <a href="/exam" className="text-blue-600 hover:underline">Thi thử →</a>
      </div>
    );
  }

  const isPart2 = part1Count > 0 && current >= part1Count;
  const sectionLabel = mode === 'part1' ? 'Phần I — Chung' :
    mode === 'part2' ? `Phần II — ${EXAM_SECTIONS[selectedTrack].label}` : '';
  const answeredCount = Object.keys(graded).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 sticky top-14 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">Luyện tập</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
            {mode === 'both'
              ? (isPart2 ? 'Phần II' : 'Phần I')
              : sectionLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar current={current + 1} total={questions.length} answered={answeredCount} />
        </div>
      </div>

      {/* Section divider — only for 'both' mode */}
      {mode === 'both' && current === part1Count && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <div className="font-bold text-emerald-700 text-lg">Phần II — {EXAM_SECTIONS[selectedTrack].label}</div>
          <div className="text-sm text-emerald-600 mt-1">Chuyên sâu Track — 50 điểm</div>
        </div>
      )}

      {mode === 'both' && current === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="font-bold text-blue-700 text-lg">Phần I — Chung</div>
          <div className="text-sm text-blue-600 mt-1">Bắt buộc cho tất cả học viên — 50 điểm</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <ExamNav total={questions.length} current={current} answers={answers} onSelect={setCurrent} />
        {mode === 'both' && part1Count > 0 && (
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
