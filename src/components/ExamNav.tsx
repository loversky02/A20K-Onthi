import type { UserAnswer } from '@/types';

interface ExamNavProps {
  total: number;
  current: number;
  answers: UserAnswer[];
  onSelect: (index: number) => void;
}

export default function ExamNav({ total, current, answers, onSelect }: ExamNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: total }, (_, i) => {
        const a = answers[i];
        const isAnswered = a && (
          (typeof a.selected === 'number') ||
          (Array.isArray(a.selected) && a.selected.length > 0) ||
          (typeof a.text === 'string' && a.text.trim().length > 0)
        );
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all
              ${i === current ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700' :
                isAnswered ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-500 hover:bg-slate-200'}
            `}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
