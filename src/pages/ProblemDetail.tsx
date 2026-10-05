import { useState, useCallback, lazy, Suspense } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Clock, Code2 } from 'lucide-react'
import {
  getProblem,
  getAttemptsByProblemId,
  getAttemptContentsByProblemId,
  getTagsForProblem,
} from '@/lib/db'
import type { AttemptContent } from '@/lib/types'
import { formatMinutes } from '@/lib/utils'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import EmptyState from '@/components/EmptyState'
import LoadingState from '@/components/LoadingState'
import MarkdownView from '@/components/MarkdownView'
import NotFoundView from '@/components/NotFoundView'

// CodeMirror 相关代码约 1MB，只有真正展开某条记录时才需要。
// 静态引入会让「打开题目详情」这个最常用的动作也去下载整个编辑器。
const CodeEditor = lazy(() => import('@/components/CodeEditor'))

function ProblemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const numericId = Number(id)
  const validId = Number.isInteger(numericId) && numericId > 0

  // useLiveQuery 在查询未完成时返回 undefined，无法与「查到了 undefined」区分。
  // 这里让 querier 用 null 显式表示「确定没找到」，就能一次查询同时表达三种状态，
  // 不必再额外发一次 getProblem 去判断 404（旧实现的竞态就出在这里）。
  const problem = useLiveQuery(async () => {
    if (!validId) return null
    return (await getProblem(numericId)) ?? null
  }, [validId, numericId])

  const attempts = useLiveQuery(async () => {
    if (!validId) return []
    return getAttemptsByProblemId(numericId)
  }, [validId, numericId])

  const tags = useLiveQuery(async () => {
    if (!validId) return []
    return getTagsForProblem(numericId)
  }, [validId, numericId])

  const contents = useLiveQuery(async () => {
    if (!validId) return new Map<number, AttemptContent>()
    return getAttemptContentsByProblemId(numericId)
  }, [validId, numericId])

  const [expandedAttempts, setExpandedAttempts] = useState<Set<number>>(new Set())

  const toggleExpand = useCallback((attemptId: number) => {
    setExpandedAttempts((prev) => {
      const next = new Set(prev)
      if (next.has(attemptId)) {
        next.delete(attemptId)
      } else {
        next.add(attemptId)
      }
      return next
    })
  }, [])

  // 直接打开链接或刷新后再点返回，navigate(-1) 会把用户带出应用甚至关掉标签页。
  // react-router 对首次加载的 history entry 使用固定 key 'default'。
  const handleBack = useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/records')
    }
  }, [location.key, navigate])

  // 链接本身是合法的，只是它指向的题目已被删除——别把用户引去检查链接
  if (problem === null) {
    return (
      <NotFoundView title="题目不存在" description="这道题可能已被删除，或链接中的题号有误。" />
    )
  }

  if (
    problem === undefined ||
    attempts === undefined ||
    tags === undefined ||
    contents === undefined
  ) {
    return <LoadingState />
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="shrink-0"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {problem.luoguId && (
              <span className="font-mono text-sm text-muted-foreground">{problem.luoguId}</span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{problem.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={problem.difficulty} />
            {tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {attempts.length === 0 ? (
        <EmptyState title="暂无做题记录" />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            做题记录 ({attempts.length})
          </h2>
          {attempts.map((a) => {
            const attemptId = a.id
            const isExpanded = expandedAttempts.has(attemptId)
            const content = contents.get(attemptId)

            return (
              <Card key={attemptId}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(attemptId)}
                    aria-expanded={isExpanded}
                    aria-controls={`attempt-${attemptId}-panel`}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-md text-left transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <StatusBadge status={a.status} size="sm" />
                    <span className="text-sm text-muted-foreground">{a.date}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatMinutes(a.timeSpentMin)}
                    </span>
                    <span className="text-sm text-muted-foreground">{a.language}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/records/${attemptId}/edit`)}
                    className="h-8 w-8 shrink-0"
                    aria-label={`编辑 ${a.date} 的记录`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {isExpanded && (
                  <div id={`attempt-${attemptId}-panel`} className="border-t border-border">
                    {content?.code ? (
                      <div className="border-b border-border">
                        <div className="flex items-center gap-1.5 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                          <Code2 className="h-3 w-3" />
                          代码
                        </div>
                        <div className="overflow-x-auto p-4 [&_.cm-content]:p-0 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none [&_.cm-gutters]:border-0 [&_.cm-gutters]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm">
                          <Suspense
                            fallback={
                              <p className="text-sm text-muted-foreground">正在加载代码视图...</p>
                            }
                          >
                            <CodeEditor
                              value={content.code}
                              onChange={() => undefined}
                              language={a.language}
                              readOnly
                            />
                          </Suspense>
                        </div>
                      </div>
                    ) : null}
                    {content?.notes ? (
                      <div>
                        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                          笔记
                        </div>
                        <MarkdownView content={content.notes} className="p-4" />
                      </div>
                    ) : null}
                    {!content?.code && !content?.notes && (
                      <div className="p-4 text-sm text-muted-foreground">无代码/笔记</div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProblemDetail
