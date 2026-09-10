import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CheckCircle, Clock, ListTodo } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  type TooltipContentProps,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import {
  getAllAttempts,
  getAllProblems,
  getAllTags as getAllTagsOrdered,
  getAllProblemTags,
} from '@/lib/db'
import { DIFFICULTY_MAP, DIFFICULTIES } from '@/lib/constants'
import type { Attempt, ProblemTag, Tag } from '@/lib/types'
import { toLocalDateString } from '@/lib/utils'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'

const CHART_CONFIG = {
  grid: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))' },
  axis: {
    tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' },
    stroke: 'hsl(var(--border))',
  },
}

function ChartTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {label !== undefined && label !== '' && (
        <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            key={`${String(item.dataKey)}-${item.name}`}
            className="flex min-w-24 items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-mono font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-border">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

function Dashboard() {
  const attempts = useLiveQuery(() => getAllAttempts(), [])
  const problems = useLiveQuery(() => getAllProblems(), [])
  const allTags = useLiveQuery(() => getAllTagsOrdered(), [])
  const allProblemTags = useLiveQuery(() => getAllProblemTags(), [])

  const stats = useMemo(() => {
    if (!attempts || !problems || !allTags || !allProblemTags) return null

    const problemMap = new Map(problems.map((p) => [p.id!, p]))
    const tagMap = new Map(allTags.map((t) => [t.id!, t]))

    const totalProblems = new Set(attempts.map((attempt) => attempt.problemId)).size
    const totalAttempts = attempts.length
    const totalTimeMin = attempts.reduce((s, a) => s + a.timeSpentMin, 0)

    // 统计一律按「题目」去重：同一道题即使 AC 多次（含跨天重复提交）也只计一次，
    // 并统一归到首次 AC 的那一天，避免把一题算成多题而虚高图表数值。
    const firstAcByProblem = new Map<number, Attempt>()
    for (const a of attempts) {
      if (a.status !== 'AC') continue
      const prev = firstAcByProblem.get(a.problemId)
      if (!prev || a.date < prev.date) firstAcByProblem.set(a.problemId, a)
    }
    const acProblemCount = firstAcByProblem.size

    // 进行中 = 有记录但尚未 AC 的题目数
    const todoCount = totalProblems - acProblemCount

    const diffCounts: Record<number, number> = {}
    const tagCounts: Record<string, number> = {}
    const dateCounts: Record<string, number> = {}

    const ptByProblemId = new Map<number, ProblemTag[]>()
    for (const pt of allProblemTags) {
      const arr = ptByProblemId.get(pt.problemId)
      if (arr) {
        arr.push(pt)
      } else {
        ptByProblemId.set(pt.problemId, [pt])
      }
    }

    for (const a of firstAcByProblem.values()) {
      const p = problemMap.get(a.problemId)
      if (p) {
        diffCounts[p.difficulty] = (diffCounts[p.difficulty] ?? 0) + 1
      }
      dateCounts[a.date] = (dateCounts[a.date] ?? 0) + 1

      for (const pt of ptByProblemId.get(a.problemId) ?? []) {
        const tag = tagMap.get(pt.tagId)
        if (tag) {
          tagCounts[tag.name] = (tagCounts[tag.name] ?? 0) + 1
        }
      }
    }

    const byDifficulty = DIFFICULTIES.map((d) => ({
      name: DIFFICULTY_MAP[d].label,
      value: diffCounts[d] ?? 0,
      color: DIFFICULTY_MAP[d].color,
    }))

    const byTag = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    const today = new Date()
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - 6 + i)
      const ds = toLocalDateString(d)
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`
      return { date: dayLabel, fullDate: ds, 做题数: dateCounts[ds] ?? 0 }
    })

    const recent = attempts
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map((a) => ({
        ...a,
        problem: problemMap.get(a.problemId),
        tags: (ptByProblemId.get(a.problemId) ?? [])
          .map((pt) => tagMap.get(pt.tagId))
          .filter(Boolean) as Tag[],
      }))

    return {
      totalProblems,
      totalAttempts,
      totalTimeMin,
      todoCount,
      acProblemCount,
      byDifficulty,
      byTag,
      weeklyData,
      recent,
    }
  }, [attempts, problems, allTags, allProblemTags])

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (stats.totalAttempts === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">首页</h1>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="还没有做题记录"
          description="开始记录你的第一道题吧"
          action={
            <Link to="/records/new">
              <Button>创建第一条记录</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">首页</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="题目数" value={stats.totalProblems} />
        <StatCard icon={CheckCircle} label="已通过" value={stats.acProblemCount} />
        <StatCard icon={Clock} label="总耗时" value={`${stats.totalTimeMin} min`} />
        <StatCard icon={ListTodo} label="进行中" value={stats.todoCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">难度分布</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const diffData = stats.byDifficulty.filter((d) => d.value > 0)
              if (diffData.length === 0) {
                return <ChartEmpty>暂无通过记录</ChartEmpty>
              }
              return (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={diffData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {diffData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={ChartTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">近 7 日做题趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.weeklyData}>
                <CartesianGrid {...CHART_CONFIG.grid} />
                <XAxis dataKey="date" {...CHART_CONFIG.axis} />
                <YAxis allowDecimals={false} {...CHART_CONFIG.axis} />
                <Tooltip content={ChartTooltip} cursor={{ stroke: 'hsl(var(--border))' }} />
                <Line
                  type="monotone"
                  dataKey="做题数"
                  name="做题数"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: 'hsl(var(--chart-1))',
                    stroke: 'hsl(var(--card))',
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats.byTag.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">算法分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, stats.byTag.length * 28)}>
              <BarChart data={stats.byTag} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid {...CHART_CONFIG.grid} />
                <XAxis type="number" allowDecimals={false} {...CHART_CONFIG.axis} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  width={60}
                />
                <Tooltip
                  content={ChartTooltip}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }}
                />
                <Bar
                  dataKey="count"
                  name="通过题数"
                  fill="hsl(var(--chart-2))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">最近记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {stats.recent.map((item) => (
            <Link
              key={item.id}
              to={item.problem ? `/problems/${item.problem.id}` : '/records'}
              className="flex flex-wrap items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted sm:flex-nowrap sm:gap-3"
            >
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                {item.date}
              </span>
              {item.problem && <DifficultyBadge difficulty={item.problem.difficulty} size="sm" />}
              <span className="truncate font-medium">
                {item.problem?.luoguId && (
                  <span className="mr-1 font-mono text-xs text-muted-foreground">
                    {item.problem.luoguId}
                  </span>
                )}
                {item.problem?.title ?? '(未知)'}
              </span>
              <div className="hidden flex-1 sm:block" />
              <StatusBadge status={item.status} size="sm" />
              <span className="text-xs text-muted-foreground">{item.timeSpentMin}min</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen
  label: string
  value: string | number
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  )
}

export default Dashboard
