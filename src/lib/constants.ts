import type { Difficulty, Language, Status } from './types'

export const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const DIFFICULTY_MAP: Record<Difficulty, { label: string; color: string }> = {
  1: { label: '入门', color: '#fe4c61' },
  2: { label: '普及-', color: '#f39c12' },
  3: { label: '普及', color: '#ffc116' },
  4: { label: '普及+/提高-', color: '#52c41a' },
  5: { label: '提高', color: '#00bfa5' },
  6: { label: '提高+/省选-', color: '#3498db' },
  7: { label: '省选/NOI-', color: '#9b59b6' },
  8: { label: 'NOI/NOI+/CTS', color: '#1e3a8a' },
}

export const STATUS_OPTIONS: Status[] = ['AC', '部分分', 'WA', 'TLE', 'MLE', 'RE', 'CE']

export const STATUS_COLORS: Record<Status, string> = {
  AC: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  部分分: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  WA: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TLE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MLE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RE: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  CE: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-400',
  进行中: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export const LANGUAGE_OPTIONS: Language[] = ['C++', 'C', 'Python', 'Java', 'Pascal']
