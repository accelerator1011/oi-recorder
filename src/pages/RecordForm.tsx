import { useState, useEffect, useRef } from 'react'
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
import { cn, toLocalDateString } from '@/lib/utils'

function RecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const defaultLanguage = useStore((s) => s.defaultLanguage)

  const [luoguId, setLuoguId] = useState('')
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>(3)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [editingProblemId, setEditingProblemId] = useState<number | undefined>(undefined)
  const [date, setDate] = useState(() => toLocalDateString(new Date()))
  const [timeSpentMin, setTimeSpentMin] = useState(0)
  const [status, setStatus] = useState<Status>('进行中')
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditing || !id) {
      setEditingProblemId(undefined)
      return
    }
    const numericId = Number(id)
    if (Number.isNaN(numericId)) {
      navigate('/records', { replace: true })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const attempt = await getAttempt(numericId)
        if (cancelled) return
        if (!attempt) {
          navigate('/records', { replace: true })
          return
        }
        const problem = await getProblem(attempt.problemId)
        if (cancelled) return
        if (!problem) return

        setEditingProblemId(problem.id)
        setLuoguId(problem.luoguId ?? '')
        setTitle(problem.title)
        setDifficulty(problem.difficulty)
        const tags = await getTagsForProblem(problem.id!)
        if (cancelled) return
        setSelectedTagIds(tags.map((t) => t.id!))
        setDate(attempt.date)
        setTimeSpentMin(attempt.timeSpentMin)
        setStatus(attempt.status)
        setLanguage(attempt.language)
        setCode(attempt.code)
        setNotes(attempt.notes)
      } catch (err) {
        if (!cancelled) {
          toast.error(`加载记录失败：${err instanceof Error ? err.message : '未知错误'}`)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isEditing, navigate])

  const blurSeqRef = useRef(0)

  const handleLuoguIdBlur = async () => {
    if (!luoguId.trim() || isEditing) return
    const seq = ++blurSeqRef.current
    try {
      const existing = await getProblemByLuoguId(luoguId.trim())
      if (seq !== blurSeqRef.current) return
      if (existing) {
        setTitle(existing.title)
        setDifficulty(existing.difficulty)
        const tags = await getTagsForProblem(existing.id!)
        if (seq !== blurSeqRef.current) return
        setSelectedTagIds(tags.map((t) => t.id!))
      }
    } catch {
      toast.error('查询题目信息失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

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

      if (isEditing && id) {
        await updateAttempt(Number(id), payload)
      } else {
        await createAttempt(payload)
      }
      toast.success(isEditing ? '记录已更新' : '记录已创建')
      navigate('/records')
    } catch (err) {
      toast.error(`保存失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PageHeader
        title={isEditing ? '编辑记录' : '新建记录'}
        actions={
          <Button type="submit" disabled={saving || !title.trim()} size="sm">
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
            onChange={(e) => setLuoguId(e.target.value)}
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
            onChange={(e) => setTitle(e.target.value)}
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
                onClick={() => setDifficulty(d)}
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
        <TagSelector selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="date">完成日期</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">耗时 (分钟)</Label>
          <Input
            id="time"
            type="number"
            value={timeSpentMin}
            onChange={(e) => setTimeSpentMin(Number(e.target.value))}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">状态</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
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
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
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
          <CodeEditor value={code} onChange={setCode} language={language} />
        </Card>
      </div>

      <div className="space-y-2">
        <Label>Markdown 笔记</Label>
        <MarkdownEditor value={notes} onChange={setNotes} />
      </div>
    </form>
  )
}

export default RecordForm
