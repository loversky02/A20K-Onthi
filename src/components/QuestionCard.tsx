'use client';

import type { Question, UserAnswer, QuestionContent, SingleChoiceContent, MultiSelectContent, ShortAnswerContent, ScenarioContent, CaseStudyContent, GradedAnswer } from '@/types';
import { TOPIC_LABELS, TYPE_LABELS } from '@/types';

interface QuestionCardProps {
  question: Question;
  index: number;
  userAnswer?: UserAnswer;
  gradedAnswer?: GradedAnswer;  // for review mode
  onChange: (answer: UserAnswer) => void;
  readonly?: boolean;  // review mode
}

export default function QuestionCard({ question, index, userAnswer, gradedAnswer, onChange, readonly }: QuestionCardProps) {
  const content: QuestionContent = JSON.parse(question.content);
  const showResult = !!gradedAnswer;

  const renderSingle = (c: SingleChoiceContent) => (
    <div className="space-y-2 mt-3">
      {c.options.map((opt, i) => {
        const isSelected = typeof userAnswer?.selected === 'number' && userAnswer.selected === i;
        const isCorrectAnswer = gradedAnswer && gradedAnswer.answer && 'correct' in gradedAnswer.answer && (gradedAnswer.answer as { correct: number }).correct === i;
        const isWrong = showResult && isSelected && !isCorrectAnswer;
        let cls = 'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ';
        if (readonly) cls += 'cursor-default ';
        if (isWrong) cls += 'border-red-300 bg-red-50 ';
        else if (isCorrectAnswer && showResult) cls += 'border-emerald-300 bg-emerald-50 ';
        else if (isSelected) cls += 'border-blue-300 bg-blue-50 ';
        else cls += 'border-slate-200 hover:border-slate-300 bg-white';

        return (
          <div
            key={i}
            className={cls}
            onClick={() => !readonly && onChange({ questionId: question.id, selected: i })}
          >
            <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
              {isSelected ? 'bg-blue-500 text-white border-blue-500' : 'text-slate-400'}
            ">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-slate-700">{opt}</span>
          </div>
        );
      })}
    </div>
  );

  const renderMulti = (c: MultiSelectContent) => {
    const selected = Array.isArray(userAnswer?.selected) ? userAnswer.selected : [];
    const correctArr = gradedAnswer?.answer && 'correct' in gradedAnswer.answer ? (gradedAnswer.answer as { correct: number[] }).correct : [];
    return (
      <div className="space-y-2 mt-3">
        {c.options.map((opt, i) => {
          const isSelected = selected.includes(i);
          const isCorrectOpt = correctArr.includes(i);
          const isWrong = showResult && isSelected && !isCorrectOpt;
          const isMissed = showResult && !isSelected && isCorrectOpt;
          let cls = 'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ';
          if (readonly) cls += 'cursor-default ';
          if (isWrong) cls += 'border-red-300 bg-red-50 ';
          else if (isMissed) cls += 'border-amber-300 bg-amber-50 ';
          else if (isSelected && isCorrectOpt && showResult) cls += 'border-emerald-300 bg-emerald-50 ';
          else if (isSelected) cls += 'border-blue-300 bg-blue-50 ';
          else cls += 'border-slate-200 hover:border-slate-300 bg-white';

          return (
            <div
              key={i}
              className={cls}
              onClick={() => {
                if (readonly) return;
                const next = selected.includes(i)
                  ? selected.filter((s) => s !== i)
                  : [...selected, i];
                onChange({ questionId: question.id, selected: next });
              }}
            >
              <span className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
                ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-300 text-slate-400'}
                ${isMissed ? 'bg-amber-400 text-white border-amber-400' : ''}
              `}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-slate-700">{opt}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderShort = (c: ShortAnswerContent) => (
    <div className="mt-3">
      <textarea
        className="w-full p-3 border border-slate-200 rounded-lg min-h-[120px] text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y"
        placeholder="Nhập câu trả lời của bạn..."
        value={userAnswer?.text || ''}
        onChange={(e) => onChange({ questionId: question.id, text: e.target.value })}
        readOnly={readonly}
      />
      {showResult && gradedAnswer?.answer && 'modelAnswer' in gradedAnswer.answer && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-sm font-semibold text-emerald-700 mb-1">Đáp án mẫu:</div>
          <div className="text-sm text-emerald-800 whitespace-pre-wrap">{(gradedAnswer.answer as { modelAnswer: string }).modelAnswer}</div>
        </div>
      )}
    </div>
  );

  const renderScenario = (c: ScenarioContent) => (
    <div className="mt-3">
      <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
        {c.scenario}
      </pre>
      {c.options && c.options.length > 0 && renderSingle({ stem: c.stem, options: c.options })}
      <textarea
        className="w-full p-3 border border-slate-200 rounded-lg min-h-[100px] text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y mt-3"
        placeholder="Phân tích và giải thích..."
        value={userAnswer?.text || ''}
        onChange={(e) => onChange({
          questionId: question.id,
          selected: userAnswer?.selected,
          text: e.target.value,
        })}
        readOnly={readonly}
      />
      {showResult && gradedAnswer?.answer && 'modelAnswer' in gradedAnswer.answer && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-sm font-semibold text-emerald-700 mb-1">Đáp án mẫu:</div>
          <div className="text-sm text-emerald-800 whitespace-pre-wrap">{(gradedAnswer.answer as { modelAnswer: string }).modelAnswer}</div>
        </div>
      )}
    </div>
  );

  const renderCaseStudy = (c: CaseStudyContent) => (
    <div className="mt-3">
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
        {c.context}
      </div>
      {c.options && c.options.length > 0 && renderSingle({ stem: c.stem, options: c.options })}
      <textarea
        className="w-full p-3 border border-slate-200 rounded-lg min-h-[120px] text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y mt-3"
        placeholder="Phân tích case study..."
        value={userAnswer?.text || ''}
        onChange={(e) => onChange({
          questionId: question.id,
          selected: userAnswer?.selected,
          text: e.target.value,
        })}
        readOnly={readonly}
      />
      {showResult && gradedAnswer?.answer && 'modelAnswer' in gradedAnswer.answer && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="text-sm font-semibold text-emerald-700 mb-1">Đáp án mẫu:</div>
          <div className="text-sm text-emerald-800 whitespace-pre-wrap">{(gradedAnswer.answer as { modelAnswer: string }).modelAnswer}</div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (question.type) {
      case 'single': return renderSingle(content as SingleChoiceContent);
      case 'multi': return renderMulti(content as MultiSelectContent);
      case 'short': return renderShort(content as ShortAnswerContent);
      case 'scenario': return renderScenario(content as ScenarioContent);
      case 'case_study': return renderCaseStudy(content as CaseStudyContent);
      default: return <div className="text-red-500">Loại câu hỏi không xác định: {question.type}</div>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
          {TOPIC_LABELS[question.topic] || question.topic}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
          {TYPE_LABELS[question.type] || question.type}
        </span>
        <span className="text-xs text-slate-400 ml-auto">{question.points} điểm</span>
      </div>

      <div className="text-slate-800 font-medium leading-relaxed">
        <span className="text-slate-400 font-bold mr-2">Câu {index + 1}.</span>
        {'stem' in content ? (content as { stem: string }).stem : ''}
      </div>

      {renderContent()}

      {showResult && gradedAnswer?.explanation && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-semibold text-blue-700 mb-1">Giải thích:</div>
          <div className="text-sm text-blue-800">{gradedAnswer.explanation}</div>
        </div>
      )}

      {showResult && (
        <div className="mt-3 text-right">
          <span className={`text-sm font-semibold ${gradedAnswer.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
            {gradedAnswer.earned}/{question.points} điểm
          </span>
        </div>
      )}
    </div>
  );
}
