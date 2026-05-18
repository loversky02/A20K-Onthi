import type { GradedAnswer } from '@/types';

interface ResultSummaryProps {
  score: number;
  total: number;
  timeSpent: number;
  graded: GradedAnswer[];
}

export default function ResultSummary({ score, total, timeSpent, graded }: ResultSummaryProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const correct = graded.filter((g) => g.isCorrect).length;
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  let grade: string;
  let gradeColor: string;
  if (pct >= 80) { grade = 'Giỏi'; gradeColor = 'text-emerald-600'; }
  else if (pct >= 60) { grade = 'Khá'; gradeColor = 'text-blue-600'; }
  else if (pct >= 40) { grade = 'Trung bình'; gradeColor = 'text-amber-600'; }
  else { grade = 'Cần cải thiện'; gradeColor = 'text-red-500'; }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Kết quả bài thi</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">{score}<span className="text-lg text-slate-400">/{total}</span></div>
          <div className="text-xs text-slate-500 mt-1">Điểm số</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className={`text-3xl font-bold ${gradeColor}`}>{pct}%</div>
          <div className="text-xs text-slate-500 mt-1">{grade}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">{correct}<span className="text-lg text-slate-400">/{graded.length}</span></div>
          <div className="text-xs text-slate-500 mt-1">Đúng hoàn toàn</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-800 font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
          <div className="text-xs text-slate-500 mt-1">Thời gian</div>
        </div>
      </div>

      <div className="space-y-2">
        {graded.map((g, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${g.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <span className="font-bold w-6 text-center">{i + 1}</span>
            <span className="flex-1">
              {'stem' in g.content ? (g.content as { stem: string }).stem : `Câu ${i + 1}`}
            </span>
            <span className="font-semibold">{g.earned}/{g.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
