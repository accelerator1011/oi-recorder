import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAllAttempts, getAllProblems, getAllProblemTags, getAllTags } from '@/lib/db'
import {
  buildProblemIndex,
  joinAttempts,
  type AttemptView,
  type ProblemIndex,
} from '@/lib/selectors'
import type { Attempt, WithId } from '@/lib/types'

interface AttemptViews {
  /** 题目侧的 id 索引，统计口径直接吃它 */
  index: ProblemIndex
  /** 能关联到题目的记录视图 */
  views: AttemptView[]
  /** 全部记录，含题目已不存在的孤立行 */
  attempts: WithId<Attempt>[]
}

/**
 * 记录 + 题目 + 标签的关联视图。
 *
 * 首页与列表页需要的是同一份查询与索引，四条 useLiveQuery 与建索引只在这里写一遍。
 * 任一查询未就绪时返回 null，由调用方渲染加载态：少一条记录就出统计比转圈更糟。
 */
export function useAttemptViews(): AttemptViews | null {
  const attempts = useLiveQuery(() => getAllAttempts(), [])
  const problems = useLiveQuery(() => getAllProblems(), [])
  const tags = useLiveQuery(() => getAllTags(), [])
  const problemTags = useLiveQuery(() => getAllProblemTags(), [])

  return useMemo(() => {
    if (!attempts || !problems || !tags || !problemTags) return null
    const index = buildProblemIndex(problems, tags, problemTags)
    return { index, views: joinAttempts(attempts, index), attempts }
  }, [attempts, problems, tags, problemTags])
}
