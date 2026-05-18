'use client';

import { useState } from 'react';
import { TOPIC_LABELS, TYPE_LABELS, EXAM_SECTIONS, type Topic, type QuestionType } from '@/types';

const PART1_TOPICS: Topic[] = ['design_patterns', 'rag', 'prompt_eng', 'agent', 'observability', 'security'];
const TRACK_TOPICS: Topic[] = ['track1_business', 'track2_infra', 'track3_appbuild'];
const TYPES: QuestionType[] = ['single', 'multi', 'short', 'scenario', 'case_study'];

export default function GeneratePage() {
  const [topic, setTopic] = useState<Topic>('rag');
  const [count, setCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(new Set<QuestionType>(['single', 'multi', 'short']));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);

  const toggleType = (t: QuestionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const generate = async () => {
    if (selectedTypes.size === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, types: Array.from(selectedTypes) }),
      });
      const data = await resp.json();
      setResult(data);
    } catch {
      setResult({ error: 'Lỗi kết nối' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tạo câu hỏi với DeepSeek</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Topic: Part I */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Chủ đề — Phần I (Chung)
          </label>
          <div className="flex flex-wrap gap-2">
            {PART1_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  topic === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Topic: Tracks */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Chủ đề — Track Chuyên sâu
          </label>
          <div className="flex flex-wrap gap-2">
            {TRACK_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  topic === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Loại câu hỏi</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTypes.has(t) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Số lượng: <span className="text-blue-600">{count}</span>
          </label>
          <input type="range" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
        </div>

        <button
          onClick={generate}
          disabled={loading || selectedTypes.size === 0}
          className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Đang tạo...' : `Tạo ${count} câu hỏi`}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border p-6 ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {result.success ? (
            <div className="text-emerald-700">
              <div className="font-bold text-lg mb-1">Đã tạo thành công!</div>
              <div>{result.count} câu hỏi mới đã được thêm.</div>
              <a href="/exam" className="inline-block mt-3 text-sm font-medium text-emerald-600 hover:underline">Thi thử ngay →</a>
            </div>
          ) : (
            <div className="text-red-600">
              <div className="font-bold mb-1">Lỗi</div>
              <div className="text-sm">{result.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
