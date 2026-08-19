import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Clock, Code2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { getProblem, getAttemptsByProblemId, getTagsForProblem } from '@/lib/db'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import CodeEditor from '@/components/CodeEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import EmptyState from '@/components/EmptyState'
import NotFound from '@/pages/NotFound'

function ProblemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const numericId = id ? Number(id) : NaN
  const problem = useLiveQuery(
    () => (Number.isNaN(numericId) ? undefined : getProblem(numericId)),
    [numericId]
  )
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setNotFound(false)
    if (Number.isNaN(numericId)) {
      setNotFound(true)
      return
    }
    let cancelled = false
    getProblem(numericId).then((p) => {
      if (!cancelled && p === undefined) {
        setNotFound(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [numericId])

  const isLoading = !notFound && problem === undefined

  const attempts = useLiveQuery(async () => {
    if (!id) return []
    try {
      return await getAttemptsByProblemId(Number(id))
    } catch {
      return []
    }
  }, [id])
  const tags = useLiveQuery(async () => {
    if (!id) return []
    try {
      return await getTagsForProblem(Number(id))
    } catch {
      return []
    }
  }, [id])

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

  if (notFound) {
    return <NotFound />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {problem!.luoguId && (
              <span className="font-mono text-sm text-muted-foreground">{problem!.luoguId}</span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{problem!.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={problem!.difficulty} />
            {tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {attempts?.length === 0 ? (
        <EmptyState title="暂无做题记录" />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            做题记录 ({attempts?.length})
          </h2>
          {attempts?.map((a) => {
            const isExpanded = expandedAttempts.has(a.id!)
            return (
              <Card key={a.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(a.id!)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(a.id!)
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-muted/50"
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
                    {a.timeSpentMin} min
                  </span>
                  <span className="text-sm text-muted-foreground">{a.language}</span>
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/records/${a.id}/edit`)
                    }}
                    className="h-8 w-8"
                    aria-label="编辑记录"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t border-border">
                    {a.code && (
                      <div className="border-b border-border">
                        <div className="flex items-center gap-1.5 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                          <Code2 className="h-3 w-3" />
                          代码
                        </div>
                        <div className="overflow-x-auto p-4 [&_.cm-content]:p-0 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none [&_.cm-gutters]:border-0 [&_.cm-gutters]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm">
                          <CodeEditor
                            value={a.code}
                            onChange={() => undefined}
                            language={a.language}
                            readOnly
                          />
                        </div>
                      </div>
                    )}
                    {a.notes && (
                      <div>
                        <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                          笔记
                        </div>
                        <div className="prose prose-sm max-w-none p-4 dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {a.notes}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {!a.code && !a.notes && (
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
