
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
  SETTINGS = 'SETTINGS',
  TRAINING = 'TRAINING',
  MULTIPLICATION_TABLE = 'MULTIPLICATION_TABLE'
}

export enum TrainingStep {
  CHOOSE_WHICH = 0, // 选择拆哪个
  HOW_TO_SPLIT = 1, // 输入拆分的两个数字
  COMBINE_TEN = 2,  // 凑整（17+3=20）
  FINAL_ADD = 3,    // 最后加法（20+6=?）
  SUCCESS = 4       // 完成
}