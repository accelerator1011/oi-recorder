import type { Attempt, Difficulty, Problem, ProblemTag, Status, Tag } from './types'
import { toLocalDateString } from './utils'

/**
 * 把行数组转成 id → 行 的索引。
 * 顺带处理 id 可选这件事：没有 id 的行（理论上不会出现）直接跳过，
 * 调用方就不必到处写 `id!` 非空断言。
 *
 * 值类型收窄成 `T & { id: number }`：进索引的行一定带着 id，
 * 下游拼 URL 或做 key 时不必再判断一次。
 */
export function indexById<T extends { id?: number }>(rows: T[]): Map<number, T & { id: number }> {
  const map = new Map<number, T & { id: number }>()
  for (const row of rows) {
    if (row.id !== undefined) map.set(row.id, row as T & { id: number })
  }
  return map
}

/** 按 problemId 归组题目-标签关联行 */
export function groupProblemTags(rows: ProblemTag[]): Map<number, ProblemTag[]> {
  const map = new Map<number, ProblemTag[]>()
  for (const row of rows) {
    const list = map.get(row.problemId)
    if (list) {
      list.push(row)
    } else {
      map.set(row.problemId, [row])
    }
  }
  return map
}

/**
 * 首页与列表页共用的题目侧索引，避免两处各写一遍 join。
 */
export interface ProblemIndex {
  problemMap: Map<number, Problem & { id: number }>
  tagMap: Map<number, Tag & { id: number }>
  problemTagRows: Map<number, ProblemTag[]>
  /** problemId → 该题目的标签列表 */
  tagsByProblemId: Map<number, Tag[]>
}

export function buildProblemIndex(
  problems: Problem[],
  tags: Tag[],
  problemTags: ProblemTag[]
): ProblemIndex {
  const problemMap = indexById(problems)
  const tagMap = indexById(tags)
  const problemTagRows = groupProblemTags(problemTags)

  const tagsByProblemId = new Map<number, Tag[]>()
  for (const [problemId, rows] of problemTagRows) {
    tagsByProblemId.set(
      problemId,
      rows.flatMap((row) => {
        const tag = tagMap.get(row.tagId)
        return tag ? [tag] : []
      })
    )
  }

  return { problemMap, tagMap, problemTagRows, tagsByProblemId }
}

export function tagsOf(index: ProblemIndex, problemId: number): Tag[] {
  return index.tagsByProblemId.get(problemId) ?? []
}

/** 列表页视图：一条记录 + 它所属的题目 + 题目标签 */
export interface AttemptView {
  attempt: Attempt
  problem: Problem & { id: number }
  tags: Tag[]
}

/** 只保留能关联到题目的记录；找不到题目的孤立记录会被跳过 */
export function joinAttempts(attempts: Attempt[], index: ProblemIndex): AttemptView[] {
  const views: AttemptView[] = []
  for (const attempt of attempts) {
    const problem = index.problemMap.get(attempt.problemId)
    if (!problem) continue
    views.push({ attempt, problem, tags: tagsOf(index, attempt.problemId) })
  }
  return views
}

/**
 * 首页统计口径。全部是纯计算，不碰 React 与图表，方便直接做回归测试。
 *
 * 核心规则：一律按「题目」去重。同一道题无论 AC 多少次、跨多少天，
 * 通过题数、难度分布、算法分布、七日趋势都只算一次，
 * 且统一归到该题「首次 AC」的那一天。
 */
export interface ProblemStats {
  /** 有记录且题目仍存在的题目数 */
  totalProblems: number
  totalAttempts: number
  totalTimeMin: number
  /** 已通过题目数（按题目去重） */
  acProblemCount: number
  /** 有记录但尚未 AC 的题目数 */
  todoCount: number
  /** 题目 id → 首次 AC 日期（YYYY-MM-DD） */
  firstAcDateByProblemId: Map<number, string>
  /** 难度 → 通过题数 */
  acByDifficulty: Map<Difficulty, number>
  /** 标签名 → 通过题数 */
  acByTagName: Map<string, number>
  /** 首次 AC 日期 → 当天通过的题数 */
  acByDate: Map<string, number>
}

export function computeProblemStats(attempts: Attempt[], index: ProblemIndex): ProblemStats {
  const problemIdsWithAttempts = new Set<number>()
  const firstAcDateByProblemId = new Map<number, string>()
  let totalTimeMin = 0

  for (const attempt of attempts) {
    totalTimeMin += attempt.timeSpentMin
    // 题目行已不存在的孤立记录不参与题目级统计。
    // 否则「已通过」卡片会计数而难度/算法图表直接跳过同一题，两者对不上。
    if (!index.problemMap.has(attempt.problemId)) continue
    problemIdsWithAttempts.add(attempt.problemId)
    if (attempt.status !== 'AC') continue
    const prev = firstAcDateByProblemId.get(attempt.problemId)
    // date 是定长的 YYYY-MM-DD 字符串，字典序即时间序，可直接比较
    if (prev === undefined || attempt.date < prev) {
      firstAcDateByProblemId.set(attempt.problemId, attempt.date)
    }
  }

  const acByDifficulty = new Map<Difficulty, number>()
  const acByTagName = new Map<string, number>()
  const acByDate = new Map<string, number>()

  for (const [problemId, date] of firstAcDateByProblemId) {
    const problem = index.problemMap.get(problemId)
    if (!problem) continue
    acByDifficulty.set(problem.difficulty, (acByDifficulty.get(problem.difficulty) ?? 0) + 1)
    acByDate.set(date, (acByDate.get(date) ?? 0) + 1)
    for (const tag of tagsOf(index, problemId)) {
      acByTagName.set(tag.name, (acByTagName.get(tag.name) ?? 0) + 1)
    }
  }

  const totalProblems = problemIdsWithAttempts.size
  const acProblemCount = firstAcDateByProblemId.size
  return {
    totalProblems,
    totalAttempts: attempts.length,
    totalTimeMin,
    acProblemCount,
    todoCount: totalProblems - acProblemCount,
    firstAcDateByProblemId,
    acByDifficulty,
    acByTagName,
    acByDate,
  }
}

export interface WeeklyTrendPoint {
  /** X 轴文案，如 10/4 */
  label: string
  /** 对应的本地 YYYY-MM-DD */
  date: string
  /** 当天首次 AC 的题数 */
  solved: number
}

/**
 * 近 7 日趋势，窗口是 [today-6, today]，按本地日期归桶。
 * 传入 today 而不是内部取当前时间，跨零点的行为才能被测试固定住。
 */
export function buildWeeklyTrend(acByDate: Map<string, number>, today: Date): WeeklyTrendPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today)
    day.setDate(day.getDate() - 6 + i)
    const date = toLocalDateString(day)
    return {
      label: `${String(day.getMonth() + 1)}/${String(day.getDate())}`,
      date,
      solved: acByDate.get(date) ?? 0,
    }
  })
}

/** 最近记录：日期倒序，同日按 id 倒序（后建的在前），只保留能关联到题目的记录 */
export function buildRecentViews(
  attempts: Attempt[],
  index: ProblemIndex,
  limit = 5
): AttemptView[] {
  const sorted = attempts
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
  return joinAttempts(sorted, index).slice(0, limit)
}

/** 列表页的搜索与筛选条件 */
export interface AttemptFilter {
  search?: string
  difficulty?: Difficulty | number | null
  status?: Status | 'all'
}

/**
 * 搜索命中题名、题号或任一标签；搜索词先 trim，
 * 纯空白的输入视为「不筛选」，而不是把列表过滤到空。
 */
export function filterAttemptViews(
  views: AttemptView[],
  { search, difficulty, status }: AttemptFilter
): AttemptView[] {
  const q = search?.trim().toLowerCase() ?? ''
  return views.filter(({ attempt, problem, tags }) => {
    if (difficulty !== undefined && difficulty !== null && problem.difficulty !== difficulty) {
      return false
    }
    if (status !== undefined && status !== 'all' && attempt.status !== status) return false
    if (!q) return true
    return (
      problem.title.toLowerCase().includes(q) ||
      (problem.luoguId ?? '').toLowerCase().includes(q) ||
      tags.some((tag) => tag.name.toLowerCase().includes(q))
    )
  })
}
