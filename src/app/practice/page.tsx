'use client';

import { useEffect, useState } from 'react';
import ProgressBar from '@/components/ProgressBar';
import ExamNav from '@/components/ExamNav';
import QuestionCard from '@/components/QuestionCard';
import { EXAM_SECTIONS, TOPIC_LABELS, type Question, type UserAnswer, type GradedAnswer, type ExamSection, type Topic } from '@/types';

export default function PracticePage() {
  const [section, setSection] = useState<ExamSection>('part1');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [graded, setGraded] = useState<Record<string, GradedAnswer>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadQuestions = (sec: ExamSection) => {
    setLoading(true);
    setSection(sec);
    const secInfo = EXAM_SECTIONS[sec];
    const topicFilter = secInfo.topics.map(t => `topic=${t}`).join('&');
    fetch(`/api/questions?${topicFilter}`)
      .then((r) => r.json())
      .then((data: Question[]) => {
        const selected = data.slice(0, 20);
        setQuestions(selected);
        setAnswers(selected.map((q) => ({ questionId: q.id })));
        setGraded({});
        setCurrent(0);
        setLoading(false);
      });
  };

  useEffect(() => { loadQuestions('part1'); }, []);

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

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Đang tải câu hỏi...</div>;
  }

  const answeredCount = Object.keys(graded).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 sticky top-14 z-40">
        <h1 className="text-lg font-bold text-slate-800">Luyện tập</h1>
        <div className="flex items-center gap-2">
          <select
            value={section}
            onChange={(e) => loadQuestions(e.target.value as ExamSection)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            {Object.values(EXAM_SECTIONS).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <ProgressBar current={current + 1} total={questions.length} answered={answeredCount} />
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 mb-4">Chưa có câu hỏi nào cho phần này.</p>
          <a href="/generate" className="text-blue-600 hover:underline">Tạo câu hỏi →</a>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <ExamNav total={questions.length} current={current} answers={answers} onSelect={setCurrent} />
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
                onClick={() => {
                  setGraded((prev) => {
                    const next = { ...prev };
                    delete next[questions[current].id];
                    return next;
                  });
                  setAnswers((prev) => prev.map((a) =>
                    a.questionId === questions[current].id ? { questionId: a.questionId } : a
                  ));
                }}
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
        </>
      )}
    </div>
  );
}
