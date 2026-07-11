export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type Status = 'AC' | '部分分' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | '进行中'

export type Language = 'C++' | 'C' | 'Python' | 'Java' | 'Pascal'

export interface Problem {
  id?: number
  luoguId?: string
  title: string
  difficulty: Difficulty
  createdAt: Date
}

export interface Tag {
  id?: number
  name: string
}

export interface ProblemTag {
  id?: number
  problemId: number
  tagId: number
}

export interface Attempt {
  id?: number
  problemId: number
  date: string
  status: Status
  language: Language
  timeSpentMin: number
  code: string
  notes: string
  createdAt: Date
}
