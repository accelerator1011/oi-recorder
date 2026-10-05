import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useBlocker, useBeforeUnload } from 'react-router-dom'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  saveRecord,
  isValidDateString,
  getTagsForProblem,
  getAttempt,
  getAttemptDraft,
  getProblem,
  getProblemByLuoguId,
} from '@/lib/db'
import { STATUS_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants'
import { useStore } from '@/store/useStore'
import type { Difficulty, Status, Language } from '@/lib/types'
import CodeEditor from '@/components/CodeEditor'
import MarkdownEditor from '@/components/MarkdownEditor'
import DifficultyPicker from '@/components/DifficultyPicker'
import TagSelector from '@/components/TagSelector'
import PageHeader from '@/components/PageHeader'
import LoadingState from '@/components/LoadingState'
import ConfirmDialog from '@/components/ConfirmDialog'
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
import { getErrorMessage, toLocalDateString } from '@/lib/utils'

function RecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const numericId = Number(id)
  const defaultLanguage = useStore((s) => s.defaultLanguage)

  const [loading, setLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [luoguId, setLuoguId] = useState('')
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>(3)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [date, setDate] = useState(() => toLocalDateString(new Date()))
  // 用字符串保存，否则把输入框清空会立刻被 Number('') 变成 0，用户没法重新输入
  const [timeSpent, setTimeSpent] = useState('0')
  const [status, setStatus] = useState<Status>('AC')
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  // blocker 的判定与 beforeunload 都要读「当下」的脏标记，不能用 state：
  // 保存成功后紧接着 navigate('/records')，那一刻 React 还没重渲染，
  // 若判定函数依赖 state.dirty，会把我们自己的跳转也拦下来。
  const dirtyRef = useRef(false)
  const setDirtyFlag = useCallback((value: boolean) => {
    dirtyRef.current = value
    setDirty(value)
  }, [])

  const touch = useCallback(() => setDirtyFlag(true), [setDirtyFlag])

  const timeSpentMin = timeSpent.trim() === '' ? 0 : Number(timeSpent)
  const timeSpentValid = Number.isInteger(timeSpentMin) && timeSpentMin >= 0
  const dateValid = isValidDateString(date)

  useEffect(() => {
    if (!isEditing) return
    setLoading(true)
    setLoadError(null)

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

        const problemId = problem.id
        const [tags, draft] = await Promise.all([
          getTagsForProblem(problemId),
          getAttemptDraft(numericId),
        ])
        if (cancelled) return

        if (!draft) throw new Error('记录不存在或已被删除')
        setLuoguId(problem.luoguId ?? '')
        setTitle(problem.title)
        setDifficulty(problem.difficulty)
        setSelectedTagIds(tags.map((t) => t.id))
        setDate(attempt.date)
        setTimeSpent(String(attempt.timeSpentMin))
        setStatus(attempt.status)
        setLanguage(attempt.language)
        setCode(draft.code)
        setNotes(draft.notes)
        setDirtyFlag(false)
      } catch (err) {
        if (!cancelled) setLoadError(`加载记录失败：${getErrorMessage(err)}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, isEditing, navigate, numericId, setDirtyFlag, loadAttempt])

  // 拦截 SPA 内部跳转：侧边栏链接、卡片链接、浏览器前进/后退
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
      []
    )
  )

  // 拦截刷新 / 关闭标签页
  useBeforeUnload(
    useCallback((event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }, [])
  )

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
        const tags = await getTagsForProblem(existing.id)
        if (seq !== blurSeqRef.current) return
        setSelectedTagIds(tags.map((t) => t.id))
        touch()
      }
    } catch {
      toast.error('查询题目信息失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // loading / loadError 时表单根本没挂载（见下方早返回），这里只需挡住重复提交
    if (saving) return

    if (!title.trim()) {
      toast.error('请填写题名')
      return
    }
    if (!timeSpentValid) {
      toast.error('耗时必须是非负整数')
      return
    }
    if (!dateValid) {
      toast.error('请填写合法的完成日期')
      return
    }

    setSaving(true)
    try {
      await saveRecord(
        {
          luoguId: luoguId.trim() || undefined,
          title: title.trim(),
          difficulty,
        },
        selectedTagIds,
        { date, status, language, timeSpentMin, code, notes },
        isEditing ? numericId : undefined
      )
      setDirtyFlag(false)
      toast.success(isEditing ? '记录已更新' : '记录已创建')
      navigate('/records')
    } catch (err) {
      toast.error(`保存失败：${getErrorMessage(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
        <Button
          type="button"
          onClick={() => {
            setLoading(true)
            setLoadAttempt((value) => value + 1)
          }}
        >
          重试
        </Button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        <PageHeader
          title={isEditing ? '编辑记录' : '新建记录'}
          description={dirty ? '有未保存的修改' : undefined}
          actions={
            <Button
              type="submit"
              disabled={saving || !title.trim() || !timeSpentValid || !dateValid}
              size="sm"
            >
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
          <DifficultyPicker
            labelId="difficulty-label"
            value={difficulty}
            onChange={(d) => {
              touch()
              setDifficulty(d)
            }}
          />
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
              required
              aria-invalid={!dateValid}
              value={date}
              onChange={(e) => {
                touch()
                setDate(e.target.value)
              }}
            />
            {!dateValid && <p className="text-xs text-destructive">请填写合法的完成日期</p>}
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

      {/* 放在 <form> 之外：对话框按钮若在表单内会被当成提交按钮 */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          // 只有用户主动取消（「继续编辑」/Esc/点遮罩）才需要撤销这次跳转
          if (!open && blocker.state === 'blocked') blocker.reset()
        }}
        title="放弃未保存的修改？"
        description="这条记录还有未保存的修改，离开后填写的内容会丢失。"
        confirmText="放弃并离开"
        cancelText="继续编辑"
        destructive
        closeOnConfirm={false}
        onConfirm={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </>
  )
}

export default RecordForm
