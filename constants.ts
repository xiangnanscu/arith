import { OpType } from './types';

export const COLORS = {
  primary: 'bg-indigo-500',
  secondary: 'bg-pink-500',
  accent: 'bg-amber-400',
  background: 'bg-slate-50',
  success: 'bg-green-500',
  error: 'bg-red-500',
  text: 'text-slate-800',
  white: 'text-white'
};

export const OPERATION_COLORS: Record<string, string> = {
  [OpType.ADD]: 'bg-blue-400 border-blue-600',
  [OpType.SUB]: 'bg-red-400 border-red-600',
  [OpType.MUL]: 'bg-amber-400 border-amber-600',
  [OpType.DIV]: 'bg-purple-400 border-purple-600'
};

export const OPERATION_NAMES: Record<string, string> = {
  [OpType.ADD]: '加法',
  [OpType.SUB]: '减法',
  [OpType.MUL]: '乘法',
  [OpType.DIV]: '除法'
};