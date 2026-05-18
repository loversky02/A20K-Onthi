import type {
  UserAnswer,
  GradedAnswer,
  Question,
  QuestionContent,
  QuestionAnswer,
  SingleChoiceAnswer,
  MultiSelectAnswer,
  ShortAnswerAnswer,
  ScenarioAnswer,
  CaseStudyAnswer,
} from '@/types';

export function gradeAnswer(question: Question, userAnswer: UserAnswer): GradedAnswer {
  const content: QuestionContent = JSON.parse(question.content);
  const answer: QuestionAnswer = JSON.parse(question.answer);
  const type = question.type;

  let earned = 0;
  let isCorrect = false;

  switch (type) {
    case 'single': {
      const ans = answer as SingleChoiceAnswer;
      if (typeof userAnswer.selected === 'number' && userAnswer.selected === ans.correct) {
        earned = question.points;
        isCorrect = true;
      }
      break;
    }
    case 'multi': {
      const ans = answer as MultiSelectAnswer;
      const selected = (Array.isArray(userAnswer.selected) ? userAnswer.selected : [userAnswer.selected]).filter(
        (s): s is number => s !== undefined
      );
      const correctSet = new Set(ans.correct);
      const selectedSet = new Set(selected);
      // Exact match = full points, partial = half
      if (selected.length > 0) {
        const intersection = ans.correct.filter((c) => selectedSet.has(c));
        if (intersection.length === correctSet.size && selected.length === correctSet.size) {
          earned = question.points;
          isCorrect = true;
        } else if (intersection.length > 0 && selected.length <= correctSet.size) {
          earned = Math.floor(question.points / 2);
        }
      }
      break;
    }
    case 'short': {
      const ans = answer as ShortAnswerAnswer;
      const text = (userAnswer.text || '').toLowerCase();
      const matched = ans.keywords.filter((kw) => text.includes(kw.toLowerCase()));
      const ratio = ans.keywords.length > 0 ? matched.length / ans.keywords.length : 0;
      if (ratio >= 0.6) {
        earned = ratio >= 1 ? question.points : Math.ceil(question.points * ratio);
        isCorrect = ratio >= 0.8;
      }
      break;
    }
    case 'scenario': {
      const ans = answer as ScenarioAnswer;
      // If has correct option (objective part)
      if (typeof ans.correct === 'number') {
        if (typeof userAnswer.selected === 'number' && userAnswer.selected === ans.correct) {
          earned += Math.floor(question.points * 0.5);
          isCorrect = true;
        }
      }
      // Check text explanation (subjective part)
      if (ans.keywords && userAnswer.text) {
        const text = userAnswer.text.toLowerCase();
        const matched = ans.keywords.filter((kw) => text.includes(kw.toLowerCase()));
        const ratio = ans.keywords.length > 0 ? matched.length / ans.keywords.length : 0;
        const textPoints = typeof ans.correct === 'number'
          ? Math.ceil(question.points * 0.5)
          : question.points;
        earned += Math.ceil(textPoints * ratio);
        if (ratio >= 0.5 && !isCorrect && typeof ans.correct === 'number') {
          isCorrect = true; // partial
        }
      } else if (typeof ans.correct !== 'number' && userAnswer.text) {
        // No keywords defined, manual grading needed — give partial
        earned = Math.floor(question.points * 0.5);
      }
      break;
    }
    case 'case_study': {
      const ans = answer as CaseStudyAnswer;
      if (ans.keywords && userAnswer.text) {
        const text = userAnswer.text.toLowerCase();
        const matched = ans.keywords.filter((kw) => text.includes(kw.toLowerCase()));
        const ratio = ans.keywords.length > 0 ? matched.length / ans.keywords.length : 0;
        earned = Math.ceil(question.points * ratio);
        isCorrect = ratio >= 0.6;
      } else if (userAnswer.text && userAnswer.text.length > 50) {
        earned = Math.floor(question.points * 0.4);
      }
      break;
    }
  }

  return {
    questionId: question.id,
    type: question.type,
    content,
    answer,
    points: question.points,
    earned,
    selected: userAnswer.selected,
    text: userAnswer.text,
    explanation: question.explanation,
    isCorrect,
  };
}

export function calculateTotal(graded: GradedAnswer[]): { score: number; total: number } {
  const total = graded.reduce((sum, g) => sum + g.points, 0);
  const score = graded.reduce((sum, g) => sum + g.earned, 0);
  return { score, total };
}
