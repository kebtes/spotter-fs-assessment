import { RiskLevel } from '../types';

export const RISK_COLOR_MAP: Record<RiskLevel, { bg: string; text: string; border: string; hex: string }> = {
  LOW: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    hex: '#22c55e',
  },
  MODERATE: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    hex: '#eab308',
  },
  HIGH: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    hex: '#f97316',
  },
  SEVERE: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    hex: '#ef4444',
  },
  NO_TRAVEL: {
    bg: 'bg-red-950/60',
    text: 'text-red-300 font-black',
    border: 'border-red-700',
    hex: '#7f1d1d',
  },
};

export const ROUTE_LINE_COLORS = [
  '#3b82f6', // Recommended / Route 1: Bright Blue
  '#a855f7', // Option 2: Purple
  '#06b6d4', // Option 3: Cyan
];
