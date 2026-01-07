
export enum OpType {
  ADD = '+',
  SUB = '-',
  MUL = '×',
  DIV = '÷'
}

export interface MathProblem {
  id: string;
  num1: number;
  num2: number;
  operation: OpType;
  correctAnswer: number;
  userAnswer?: number;
  isCorrect?: boolean;
}

export interface QuizConfig {
  questionCount: number;
  selectedOperations: OpType[];
}

export interface QuizHistoryItem {
  timestamp: number;
  totalQuestions: number;
  correctCount: number;
  score: number; // percentage
  operations: OpType[];
  problems?: MathProblem[]; 
}

export enum AppView {
  MENU = 'MENU',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS',
  HISTORY = 'HISTORY',
  HISTORY_DETAILS = 'HISTORY_DETAILS',
  MULTIPLICATION_TABLE = 'MULTIPLICATION_TABLE'
}
