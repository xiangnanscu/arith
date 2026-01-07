
import { MathProblem, OpType } from '../types';

const uid = () => Math.random().toString(36).substring(2, 9);

interface ProblemTemplate {
  n1: number;
  n2: number;
  op: OpType;
  ans: number;
}

const generateFullDatabase = (): Record<OpType, ProblemTemplate[]> => {
  const db: Record<OpType, ProblemTemplate[]> = {
    [OpType.ADD]: [],
    [OpType.SUB]: [],
    [OpType.MUL]: [],
    [OpType.DIV]: [],
  };

  // Standard toddler range: focus on 0-20 for add/sub, 1-9 for mul/div
  for (let i = 0; i <= 20; i++) {
    for (let j = 0; j <= 20; j++) {
      if (i + j <= 20) {
        db[OpType.ADD].push({ n1: i, n2: j, op: OpType.ADD, ans: i + j });
      }
      if (i >= j && i <= 20) {
        db[OpType.SUB].push({ n1: i, n2: j, op: OpType.SUB, ans: i - j });
      }
    }
  }

  // Multiplication table up to 9
  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      db[OpType.MUL].push({ n1: i, n2: j, op: OpType.MUL, ans: i * j });
      db[OpType.DIV].push({ n1: i * j, n2: i, op: OpType.DIV, ans: j });
    }
  }

  return db;
};

const FULL_DB = generateFullDatabase();

export const generateQuiz = (count: number, operations: OpType[]): MathProblem[] => {
  if (operations.length === 0) return [];
  
  let pool: ProblemTemplate[] = [];
  operations.forEach(op => {
    pool = [...pool, ...FULL_DB[op]];
  });

  if (pool.length === 0) return [];

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map(p => ({
    id: uid(),
    num1: p.n1,
    num2: p.n2,
    operation: p.op,
    correctAnswer: p.ans
  }));
};
