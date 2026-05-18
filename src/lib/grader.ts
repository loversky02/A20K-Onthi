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

// ─── Improved keyword matching ───

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[(){}[\].,;:!?<>`'"]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
  );
}

/**
 * Scores a student's text against a list of required keywords.
 * Returns 0-1 ratio with per-keyword partial credit for multi-word phrases.
 */
function keywordScore(keywords: string[], studentText: string): number {
  if (keywords.length === 0) return 0;
  const text = studentText.toLowerCase();
  const tokens = tokenize(studentText);

  let total = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();

    // Full exact match
    if (text.includes(kwLower)) {
      total += 1;
      continue;
    }

    // Partial: match individual words within the keyword phrase
    const kwTokens = kwLower.split(/\s+/);
    const matched = kwTokens.filter(t => tokens.has(t));

    if (kwTokens.length >= 2) {
      // Multi-word keyword: give proportional credit
      const kwRatio = matched.length / kwTokens.length;
      total += kwRatio >= 0.5 ? kwRatio : 0;
    } else {
      // Single word: need exact substring match (already checked above) or token match
      if (matched.length > 0) total += 1;
    }
  }

  return total / keywords.length;
}

// ─── Per-type grading ───

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
      if (!userAnswer.text) break;
      const ratio = keywordScore(ans.keywords, userAnswer.text);
      if (ratio >= 0.6) {
        earned = ratio >= 1 ? question.points : Math.ceil(question.points * ratio);
        isCorrect = ratio >= 0.8;
      }
      break;
    }
    case 'scenario': {
      const ans = answer as ScenarioAnswer;
      // Objective part (multiple choice within scenario)
      if (typeof ans.correct === 'number') {
        if (typeof userAnswer.selected === 'number' && userAnswer.selected === ans.correct) {
          earned += Math.floor(question.points * 0.5);
          isCorrect = true;
        }
      }
      // Subjective part (text explanation)
      if (ans.keywords && userAnswer.text) {
        const ratio = keywordScore(ans.keywords, userAnswer.text);
        const textPoints = typeof ans.correct === 'number'
          ? Math.ceil(question.points * 0.5)
          : question.points;
        const textEarned = Math.ceil(textPoints * ratio);
        earned += textEarned;
        if (ratio >= 0.5 && !isCorrect && typeof ans.correct === 'number') {
          isCorrect = true;
        }
      } else if (typeof ans.correct !== 'number' && userAnswer.text) {
        // No keywords — fallback: reward substantial answers
        earned = userAnswer.text.length > 50
          ? Math.floor(question.points * 0.5)
          : Math.floor(question.points * 0.2);
      }
      break;
    }
    case 'case_study': {
      const ans = answer as CaseStudyAnswer;
      if (ans.keywords && userAnswer.text) {
        const ratio = keywordScore(ans.keywords, userAnswer.text);
        earned = Math.round(question.points * ratio);
        isCorrect = ratio >= 0.6;
      } else if (userAnswer.text && userAnswer.text.length > 80) {
        // No keywords — reward substantial, well-structured answers
        earned = Math.floor(question.points * 0.5);
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
