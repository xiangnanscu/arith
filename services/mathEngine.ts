
import { MathProblem, OpType } from '../types';

const uid = () => Math.random().toString(36).substring(2, 9);

interface ProblemTemplate {
  n1: number;
  n2: number;
  op: OpType;
  ans: number;
}

const generateProblemDatabase = (): Record<OpType, ProblemTemplate[]> => {
  const db: Record<OpType, ProblemTemplate[]> = {
    [OpType.ADD]: [],
    [OpType.SUB]: [],
    [OpType.MUL]: [],
    [OpType.DIV]: [],
  };

  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      db[OpType.ADD].push({ n1: i, n2: j, op: OpType.ADD, ans: i + j });
    }
  }

  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      const sum = i + j;
      db[OpType.SUB].push({ n1: sum, n2: i, op: OpType.SUB, ans: j });
      if (i !== j) {
         db[OpType.SUB].push({ n1: sum, n2: j, op: OpType.SUB, ans: i });
      }
    }
  }
  const uniqueSub = new Set<string>();
  const cleanSub: ProblemTemplate[] = [];
  db[OpType.SUB].forEach(p => {
    const key = `${p.n1}-${p.n2}`;
    if (!uniqueSub.has(key)) {
      uniqueSub.add(key);
      cleanSub.push(p);
    }
  });
  db[OpType.SUB] = cleanSub;

  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      db[OpType.MUL].push({ n1: i, n2: j, op: OpType.MUL, ans: i * j });
    }
  }

  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      const product = i * j;
      if (i !== 0) {
        db[OpType.DIV].push({ n1: product, n2: i, op: OpType.DIV, ans: j });
      }
      if (j !== 0 && i !== j) {
        db[OpType.DIV].push({ n1: product, n2: j, op: OpType.DIV, ans: i });
      }
    }
  }
  
  const uniqueDiv = new Set<string>();
  const cleanDiv: ProblemTemplate[] = [];
  db[OpType.DIV].forEach(p => {
    const key = `${p.n1}/${p.n2}`;
    if (!uniqueDiv.has(key)) {
      uniqueDiv.add(key);
      cleanDiv.push(p);
    }
  });
  db[OpType.DIV] = cleanDiv;

  return db;
};

const DB = generateProblemDatabase();

const isZeroProblem = (p: ProblemTemplate) => {
  return p.n1 === 0 || p.n2 === 0;
};

export const generateQuiz = (count: number, operations: OpType[]): MathProblem[] => {
  if (operations.length === 0) return [];
  let pool: ProblemTemplate[] = [];
  operations.forEach(op => {
    pool = [...pool, ...DB[op]];
  });
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected: ProblemTemplate[] = [];
  let zeroProblemsCount = 0;
  for (const problem of shuffled) {
    if (selected.length >= count) break;
    const hasZero = isZeroProblem(problem);
    if (hasZero) {
      if (zeroProblemsCount < 1) {
        selected.push(problem);
        zeroProblemsCount++;
      }
    } else {
      selected.push(problem);
    }
  }
  return selected.map(p => ({
    id: uid(),
    num1: p.n1,
    num2: p.n2,
    operation: p.op,
    correctAnswer: p.ans
  }));
};

// 新增：凑十法专项题目生成器 (1X + Y, X+Y > 10)
export const generateTrainingProblem = (): MathProblem => {
  // X 为 1-9，Y 为 1-9，且 X+Y > 10
  const pairs: [number, number][] = [];
  for (let x = 1; x <= 9; x++) {
    for (let y = 1; y <= 9; y++) {
      if (x + y > 10) {
        pairs.push([10 + x, y]);
      }
    }
  }
  const [n1, n2] = pairs[Math.floor(Math.random() * pairs.length)];
  return {
    id: uid(),
    num1: n1,
    num2: n2,
    operation: OpType.ADD,
    correctAnswer: n1 + n2
  };
};
