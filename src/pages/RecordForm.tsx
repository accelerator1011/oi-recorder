import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  upsertProblem,
  setProblemTags,
  getTagsForProblem,
  createAttempt,
  updateAttempt,
  getAttempt,
  getAttemptDraft,
  getProblem,
  getProblemByLuoguId,
} from '@/lib/db'
import { DIFFICULTY_MAP, DIFFICULTIES, STATUS_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants'
import { useStore } from '@/store/useStore'
import type { Difficulty, Status, Language } from '@/lib/types'
import CodeEditor from '@/components/CodeEditor'
import MarkdownEditor from '@/components/MarkdownEditor'
import TagSelector from '@/components/TagSelector'
import PageHeader from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, getErrorMessage, toLocalDateString } from '@/lib/utils'

function RecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const numericId = Number(id)
  const defaultLanguage = useStore((s) => s.defaultLanguage)

  const [loading, setLoading] = useState(isEditing)
  const [luoguId, setLuoguId] = useState('')
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>(3)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [editingProblemId, setEditingProblemId] = useState<number | undefined>(undefined)
  const [date, setDate] = useState(() => toLocalDateString(new Date()))
  // 用字符串保存，否则把输入框清空会立刻被 Number('') 变成 0，用户没法重新输入
  const [timeSpent, setTimeSpent] = useState('0')
  const [status, setStatus] = useState<Status>('AC')
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const touch = useCallback(() => setDirty(true), [])

  const timeSpentMin = timeSpent.trim() === '' ? 0 : Number(timeSpent)
  const timeSpentValid = Number.isInteger(timeSpentMin) && timeSpentMin >= 0

  useEffect(() => {
    if (!isEditing) return

    if (!Number.isInteger(numericId) || numericId <= 0) {
      toast.error('记录不存在')
      navigate('/records', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const attempt = await getAttempt(numericId)
        if (cancelled) return
        if (!attempt) {
          toast.error('记录不存在或已被删除')
          navigate('/records', { replace: true })
          return
        }

        const problem = await getProblem(attempt.problemId)
        if (cancelled) return
        if (!problem) {
          // 旧实现这里静默 return，表单会停在空白状态，再点保存就凭空新建一道题
          toast.error('这条记录关联的题目已不存在')
          navigate('/records', { replace: true })
          return
        }

        const problemId = problem.id ?? attempt.problemId
        const [tags, draft] = await Promise.all([
          getTagsForProblem(problemId),
          getAttemptDraft(numericId),
        ])
        if (cancelled) return

        setEditingProblemId(problem.id)
        setLuoguId(problem.luoguId ?? '')
        setTitle(problem.title)
        setDifficulty(problem.difficulty)
        setSelectedTagIds(tags.flatMap((t) => (t.id === undefined ? [] : [t.id])))
        setDate(attempt.date)
        setTimeSpent(String(attempt.timeSpentMin))
        setStatus(attempt.status)
        setLanguage(attempt.language)
        setCode(draft?.code ?? '')
        setNotes(draft?.notes ?? '')
        setDirty(false)
      } catch (err) {
        if (!cancelled) toast.error(`加载记录失败：${getErrorMessage(err)}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, isEditing, navigate, numericId])

  // 刷新或关闭标签页前的兜底提醒。注意：SPA 内部跳转（侧边栏、浏览器后退）
  // 不会触发 beforeunload，要拦住它们需要把路由换成 data router 后用 useBlocker。
  useEffect(() => {
    if (!dirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const blurSeqRef = useRef(0)

  const handleLuoguIdBlur = async () => {
    if (!luoguId.trim() || isEditing) return
    const seq = ++blurSeqRef.current
    try {
      const existing = await getProblemByLuoguId(luoguId.trim())
      if (seq !== blurSeqRef.current) return
      if (existing?.id !== undefined) {
        setTitle(existing.title)
        setDifficulty(existing.difficulty)
        const tags = await getTagsForProblem(existing.id)
        if (seq !== blurSeqRef.current) return
        setSelectedTagIds(tags.flatMap((t) => (t.id === undefined ? [] : [t.id])))
        touch()
      }
    } catch {
      toast.error('查询题目信息失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || loading) return

    if (!title.trim()) {
      toast.error('请填写题名')
      return
    }
    if (!timeSpentValid) {
      toast.error('耗时必须是非负整数')
      return
    }

    setSaving(true)
    try {
      const problemId = await upsertProblem(
        {
          luoguId: luoguId.trim() || undefined,
          title: title.trim(),
          difficulty,
        },
        isEditing ? editingProblemId : undefined
      )
      await setProblemTags(problemId, selectedTagIds)

      const payload = {
        problemId,
        date,
        status,
        language,
        timeSpentMin,
        code,
        notes,
      }

      if (isEditing) {
        await updateAttempt(numericId, payload)
      } else {
        await createAttempt(payload)
      }
      setDirty(false)
      toast.success(isEditing ? '记录已更新' : '记录已创建')
      navigate('/records')
    } catch (err) {
      toast.error(`保存失败：${getErrorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PageHeader
        title={isEditing ? '编辑记录' : '新建记录'}
        description={dirty ? '有未保存的修改' : undefined}
        actions={
          <Button type="submit" disabled={saving || !title.trim() || !timeSpentValid} size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="luoguId">洛谷题号</Label>
          <Input
            id="luoguId"
            value={luoguId}
            onChange={(e) => {
              touch()
              setLuoguId(e.target.value)
            }}
            onBlur={handleLuoguIdBlur}
            placeholder="可选，如 P1001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">
            题名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              touch()
              setTitle(e.target.value)
            }}
            placeholder="题目名称"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label id="difficulty-label">难度</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="difficulty-label">
          {DIFFICULTIES.map((d) => {
            const info = DIFFICULTY_MAP[d]
            const active = difficulty === d
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  touch()
                  setDifficulty(d)
                }}
                className={cn(
                  'flex min-w-[56px] flex-col items-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all',
                  active ? 'scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                )}
                style={{
                  backgroundColor: active ? info.color + '20' : 'transparent',
                  color: info.color,
                  borderColor: active ? info.color : 'transparent',
                }}
              >
                <span className="text-lg font-bold">{d}</span>
                <span className="whitespace-nowrap">{info.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>算法标签</Label>
        <TagSelector
          selectedIds={selectedTagIds}
          onChange={(ids) => {
            touch()
            setSelectedTagIds(ids)
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="date">完成日期</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => {
              touch()
              setDate(e.target.value)
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">耗时 (分钟)</Label>
          <Input
            id="time"
            type="number"
            value={timeSpent}
            onChange={(e) => {
              touch()
              setTimeSpent(e.target.value)
            }}
            min={0}
            step={1}
            aria-invalid={!timeSpentValid}
          />
          {!timeSpentValid && <p className="text-xs text-destructive">请填写非负整数分钟数</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">状态</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              touch()
              setStatus(v as Status)
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">语言</Label>
          <Select
            value={language}
            onValueChange={(v) => {
              touch()
              setLanguage(v as Language)
            }}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>代码</Label>
        <Card className="overflow-hidden">
          <CodeEditor
            value={code}
            onChange={(value) => {
              touch()
              setCode(value)
            }}
            language={language}
          />
        </Card>
      </div>

      <div className="space-y-2">
        <Label>Markdown 笔记</Label>
        <MarkdownEditor
          value={notes}
          onChange={(value) => {
            touch()
            setNotes(value)
          }}
        />
      </div>
    </form>
  )
}

export default RecordForm
