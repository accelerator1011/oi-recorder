import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteAttempt,
  getAllAttempts,
  getAllProblems,
  getAllTags,
  getAllProblemTags,
} from '@/lib/db'
import { DIFFICULTY_MAP, DIFFICULTIES, STATUS_OPTIONS } from '@/lib/constants'
import { buildProblemIndex, filterAttemptViews, joinAttempts } from '@/lib/selectors'
import type { Status } from '@/lib/types'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

function RecordList() {
  const navigate = useNavigate()
  const allAttempts = useLiveQuery(() => getAllAttempts(), [])
  const allProblems = useLiveQuery(() => getAllProblems(), [])
  const allTags = useLiveQuery(() => getAllTags(), [])
  const allProblemTags = useLiveQuery(() => getAllProblemTags(), [])

  const [search, setSearch] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const joined = useMemo(() => {
    if (!allAttempts || !allProblems || !allTags || !allProblemTags) return null
    return joinAttempts(allAttempts, buildProblemIndex(allProblems, allTags, allProblemTags))
  }, [allAttempts, allProblems, allTags, allProblemTags])

  const trimmedSearch = search.trim()
  const filtered = useMemo(() => {
    if (!joined) return []
    return filterAttemptViews(joined, {
      search: trimmedSearch,
      difficulty: filterDifficulty,
      status: filterStatus,
    })
  }, [joined, filterDifficulty, filterStatus, trimmedSearch])

  // 纯空白的搜索词不算「正在筛选」，否则会误报成「没有匹配的记录」
  const hasActiveFilter =
    trimmedSearch !== '' || filterDifficulty !== null || filterStatus !== 'all'

  // 删除最后一条记录会连带删掉题目和它的标签关联，确认框必须把这点说清楚
  const deleteTarget = useMemo(() => {
    if (deleteId === null || !joined || !allAttempts) return null
    const item = joined.find((view) => view.attempt.id === deleteId)
    if (!item) return null
    const siblingCount = allAttempts.filter((a) => a.problemId === item.problem.id).length
    return { title: item.problem.title, isLastOfProblem: siblingCount <= 1 }
  }, [deleteId, joined, allAttempts])

  const handleDelete = async (attemptId: number) => {
    try {
      await deleteAttempt(attemptId)
    } catch {
      toast.error('删除记录失败')
    }
  }

  if (!joined) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">全部记录</h1>
        <Link to="/records/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            新建记录
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索题号、题名、标签..."
            aria-label="搜索记录"
            className="pl-9"
          />
        </div>

        <Select
          value={filterDifficulty !== null ? String(filterDifficulty) : 'all'}
          onValueChange={(v) => setFilterDifficulty(v === 'all' ? null : Number(v))}
        >
          <SelectTrigger className="w-[130px]" aria-label="按难度筛选">
            <SelectValue placeholder="全部难度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="all">
              全部难度
            </SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {DIFFICULTY_MAP[d].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as Status | 'all')}>
          <SelectTrigger className="w-[130px]" aria-label="按状态筛选">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="all" value="all">
              全部状态
            </SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={hasActiveFilter ? '没有匹配的记录' : '还没有做题记录'}
          description={hasActiveFilter ? undefined : '点击右上角"新建记录"开始吧'}
          action={
            !hasActiveFilter ? (
              <Link to="/records/new">
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  新建记录
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(({ attempt, problem, tags }) => (
            <Card key={attempt.id} className="transition-shadow hover:shadow-md">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      {problem.luoguId && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {problem.luoguId}
                        </span>
                      )}
                      <Link
                        to={`/problems/${problem.id}`}
                        className="truncate font-medium underline-offset-4 hover:underline"
                      >
                        {problem.title}
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DifficultyBadge difficulty={problem.difficulty} size="sm" />
                      <StatusBadge status={attempt.status} size="sm" />
                      {tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span>{attempt.date}</span>
                    <span>{attempt.timeSpentMin} min</span>
                    <span>{attempt.language}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="操作菜单"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/records/${attempt.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/problems/${problem.id}`)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(attempt.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="删除记录"
        description={
          deleteTarget?.isLastOfProblem
            ? `「${deleteTarget.title}」只剩这一条记录，删除后该题目及其标签关联也会一并删除，且不可撤销。`
            : '确定删除这条记录吗？此操作不可撤销。'
        }
        confirmText="删除"
        destructive
        onConfirm={async () => {
          if (deleteId !== null) await handleDelete(deleteId)
        }}
      />
    </div>
  )
}

export default RecordList
