import type { Attempt, Problem, ProblemTag, Tag } from './types'

/**
 * 把行数组转成 id → 行 的索引。
 * 顺带处理 id 可选这件事：没有 id 的行（理论上不会出现）直接跳过，
 * 调用方就不必到处写 `id!` 非空断言。
 */
export function indexById<T extends { id?: number }>(rows: T[]): Map<number, T> {
  const map = new Map<number, T>()
  for (const row of rows) {
    if (row.id !== undefined) map.set(row.id, row)
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
  problemMap: Map<number, Problem>
  tagMap: Map<number, Tag>
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
  problem: Problem
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
