import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CheckCircle, Clock, ListTodo } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
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
import type { Tag } from '@/lib/types'
import { toLocalDateString } from '@/lib/utils'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'

const CHART_CONFIG = {
  grid: { strokeDasharray: '3 3', stroke: 'hsl(var(--border))', opacity: 0.5 },
  axis: {
    tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' },
    stroke: 'hsl(var(--border))',
  },
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

    const totalProblems = problems.length
    const totalAttempts = attempts.length
    const totalTimeMin = attempts.reduce((s, a) => s + a.timeSpentMin, 0)
    const todoCount = attempts.filter((a) => a.status === '进行中').length
    const acCount = attempts.filter((a) => a.status === 'AC').length

    const diffCounts: Record<number, number> = {}
    const tagCounts: Record<string, number> = {}
    const dateCounts: Record<string, number> = {}

    const ptByProblemId = new Map<number, typeof allProblemTags>()
    for (const pt of allProblemTags) {
      let arr = ptByProblemId.get(pt.problemId)
      if (!arr) {
        arr = []
        ptByProblemId.set(pt.problemId, arr)
      }
      arr.push(pt)
    }

    for (const a of attempts) {
      const p = problemMap.get(a.problemId)
      if (p) {
        diffCounts[p.difficulty] = (diffCounts[p.difficulty] ?? 0) + 1
      }
      dateCounts[a.date] = (dateCounts[a.date] ?? 0) + 1

      const ptRows = ptByProblemId.get(a.problemId) ?? []
      for (const pt of ptRows) {
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
      acCount,
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="题目数" value={stats.totalProblems} />
        <StatCard icon={CheckCircle} label="总记录" value={stats.totalAttempts} />
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
                    >
                      {diffData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
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
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="做题数"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'hsl(var(--foreground))' }}
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
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[0, 4, 4, 0]} />
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
              to={`/problems/${item.problem?.id}`}
              className="flex items-center gap-3 rounded-md p-2 text-sm transition-colors hover:bg-muted"
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
              <div className="flex-1" />
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
