import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAllAttempts, getAllProblems, getAllProblemTags, getAllTags } from '@/lib/db'
import { buildProblemIndex, type ProblemIndex } from '@/lib/selectors'
import type { Attempt, WithId } from '@/lib/types'

interface AttemptData {
  /** 题目侧的 id 索引，统计口径与视图构建都吃它 */
  index: ProblemIndex
  /** 全部记录，含题目已不存在的孤立行 */
  attempts: WithId<Attempt>[]
}

/**
 * 记录 + 题目 + 标签的原始数据与索引。
 *
 * 首页与列表页需要的是同一份查询与索引，四条 useLiveQuery 与建索引只在这里写一遍。
 * 这里刻意不预先 join 记录视图：首页只取「最近 N 条」，直接调 buildRecentViews
 * 即可，多算一份全量 join 纯属浪费；列表页则自己按需 join。
 *
 * 任一查询未就绪时返回 null，由调用方渲染加载态：少一条记录就出统计比转圈更糟。
 */
export function useAttemptData(): AttemptData | null {
  const attempts = useLiveQuery(() => getAllAttempts(), [])
  const problems = useLiveQuery(() => getAllProblems(), [])
  const tags = useLiveQuery(() => getAllTags(), [])
  const problemTags = useLiveQuery(() => getAllProblemTags(), [])

  return useMemo(() => {
    if (!attempts || !problems || !tags || !problemTags) return null
    return { index: buildProblemIndex(problems, tags, problemTags), attempts }
  }, [attempts, problems, tags, problemTags])
}
