// ─── Question Types ───

export type QuestionType = 'single' | 'multi' | 'short' | 'scenario' | 'case_study';

export type Topic =
  | 'design_patterns'
  | 'rag'
  | 'prompt_eng'
  | 'agent'
  | 'observability'
  | 'security'
  | 'track1_business'
  | 'track2_infra'
  | 'track3_appbuild';

export type ExamSection = 'part1' | 'track1' | 'track2' | 'track3';

export interface SectionInfo {
  key: ExamSection;
  label: string;
  subtitle: string;
  topics: Topic[];
  points: number;
  timeMinutes: number;
}

export const EXAM_SECTIONS: Record<ExamSection, SectionInfo> = {
  part1: {
    key: 'part1',
    label: 'Phần I — Chung',
    subtitle: 'AI Design Patterns, RAG, Prompt Engineering, Agent, Observability, Bảo mật',
    topics: ['design_patterns', 'rag', 'prompt_eng', 'agent', 'observability', 'security'],
    points: 50,
    timeMinutes: 60,
  },
  track1: {
    key: 'track1',
    label: 'Track 1 — Business',
    subtitle: 'Product Management, ROI, AI Roadmap, EU AI Act, Luật TTNT VN',
    topics: ['track1_business'],
    points: 50,
    timeMinutes: 60,
  },
  track2: {
    key: 'track2',
    label: 'Track 2 — Infrastructure',
    subtitle: 'Data Lakehouse, GPU FinOps, Model Serving, CI/CD & Security cho AI',
    topics: ['track2_infra'],
    points: 50,
    timeMinutes: 60,
  },
  track3: {
    key: 'track3',
    label: 'Track 3 — App Build',
    subtitle: 'Advanced Agent Patterns, RAG Nâng Cao, LoRA, RAGAS Metrics, Code Challenge',
    topics: ['track3_appbuild'],
    points: 50,
    timeMinutes: 60,
  },
};

// ─── Content shapes per question type ───

export interface SingleChoiceContent {
  stem: string;              // câu hỏi
  options: string[];         // 4 đáp án (A, B, C, D)
}

export interface MultiSelectContent {
  stem: string;
  options: string[];         // 4-5 đáp án
}

export interface ShortAnswerContent {
  stem: string;
}

export interface ScenarioContent {
  scenario: string;          // đoạn code/log mô tả
  stem: string;              // câu hỏi
  options?: string[];        // optional, nếu là trắc nghiệm trong scenario
}

export interface CaseStudyContent {
  context: string;           // mô tả tình huống dài
  stem: string;
  options?: string[];
}

export type QuestionContent =
  | SingleChoiceContent
  | MultiSelectContent
  | ShortAnswerContent
  | ScenarioContent
  | CaseStudyContent;

// ─── Answer shapes ───

export interface SingleChoiceAnswer {
  correct: number;           // index đáp án đúng (0-based)
}

export interface MultiSelectAnswer {
  correct: number[];         // indexes các đáp án đúng
}

export interface ShortAnswerAnswer {
  keywords: string[];        // keyword cần có để tính điểm
  modelAnswer: string;       // câu trả lời mẫu
}

export interface ScenarioAnswer {
  correct?: number;          // nếu là trắc nghiệm
  keywords?: string[];       // nếu cần giải thích
  modelAnswer: string;
}

export interface CaseStudyAnswer {
  correct?: number;
  keywords?: string[];
  modelAnswer: string;
}

export type QuestionAnswer =
  | SingleChoiceAnswer
  | MultiSelectAnswer
  | ShortAnswerAnswer
  | ScenarioAnswer
  | CaseStudyAnswer;

// ─── DB row shape ───

export interface Question {
  id: string;
  type: QuestionType;
  topic: Topic;
  content: string;           // JSON
  answer: string;            // JSON
  explanation: string | null;
  points: number;
  created_at: string;
}

// ─── Exam result ───

export interface UserAnswer {
  questionId: string;
  selected?: number | number[];  // index(es) for single/multi
  text?: string;                 // for short/scenario/case
}

export interface GradedAnswer extends UserAnswer {
  type: QuestionType;
  content: QuestionContent;
  answer: QuestionAnswer;
  points: number;
  earned: number;
  explanation: string | null;
  isCorrect: boolean;
}

export interface ExamResult {
  id: string;
  score: number;
  total_points: number;
  time_spent: number;
  student_name: string;
  student_id: string;
  track: string;
  created_at: string;
  answers: GradedAnswer[];
}

// ─── Generate request ───

export interface GenerateRequest {
  topic: Topic;
  count: number;
  types: QuestionType[];
}

// ─── Topic label map ───

export const TOPIC_LABELS: Record<Topic, string> = {
  design_patterns: 'AI Design Patterns',
  rag: 'RAG Pipeline',
  prompt_eng: 'Prompt Engineering',
  agent: 'Agent Architecture',
  observability: 'Observability',
  security: 'Bảo mật AI',
  track1_business: 'Track 1 — Business',
  track2_infra: 'Track 2 — Infrastructure',
  track3_appbuild: 'Track 3 — App Build',
};

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Trắc nghiệm',
  multi: 'Multi-select',
  short: 'Trả lời ngắn',
  scenario: 'Scenario Debug',
  case_study: 'Case Study',
};
