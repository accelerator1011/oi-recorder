import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
import { DIFFICULTIES, getDifficultyStyle } from '@/lib/constants'
import { buildRecentViews, buildWeeklyTrend, computeProblemStats } from '@/lib/selectors'
import { useAttemptData } from '@/hooks/useAttemptData'
import { useStore } from '@/store/useStore'
import { boostSaturation, formatMinutes } from '@/lib/utils'
import DifficultyBadge from '@/components/DifficultyBadge'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import LoadingState from '@/components/LoadingState'
import PageHeader from '@/components/PageHeader'

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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg duration-150 animate-in fade-in-0 motion-reduce:animate-none">
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
  const darkMode = useStore((s) => s.darkMode)
  const data = useAttemptData()

  // 配色只取决于主题，与统计数据无关：单独算，切换明暗不必重跑统计
  const difficultyColors = useMemo(
    () =>
      DIFFICULTIES.map((difficulty) => {
        // 图表填充色比徽章色更「实」一档：徽章需要浅色文字保证可读性，
        // 而扇形只需要跟深色背景拉开层次，粉彩会显得发灰。
        const style = getDifficultyStyle(difficulty, darkMode)
        return { difficulty, name: style.label, color: boostSaturation(style.color) }
      }),
    [darkMode]
  )

  const stats = useMemo(() => {
    if (!data) return null
    const { index, attempts } = data
    const summary = computeProblemStats(attempts, index)

    const byDifficulty = difficultyColors
      .map(({ difficulty, name, color }) => ({
        name,
        color,
        value: summary.acByDifficulty.get(difficulty) ?? 0,
      }))
      .filter((entry) => entry.value > 0)

    const byTag = [...summary.acByTagName]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    return {
      ...summary,
      byDifficulty,
      byTag,
      weeklyData: buildWeeklyTrend(summary.acByDate, new Date()).map((point) => ({
        date: point.label,
        做题数: point.solved,
      })),
      recent: buildRecentViews(attempts, index),
    }
  }, [data, difficultyColors])

  if (!stats) {
    return <LoadingState />
  }

  if (stats.totalAttempts === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="首页" />
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
      <PageHeader title="首页" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="题目数" value={stats.totalProblems} />
        <StatCard icon={CheckCircle} label="已通过" value={stats.acProblemCount} />
        <StatCard icon={Clock} label="总耗时" value={formatMinutes(stats.totalTimeMin)} />
        <StatCard icon={ListTodo} label="进行中" value={stats.todoCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">难度分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byDifficulty.length === 0 ? (
              <ChartEmpty>暂无通过记录</ChartEmpty>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.byDifficulty}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {stats.byDifficulty.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={ChartTooltip} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
            )}
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
                <Tooltip
                  content={ChartTooltip}
                  cursor={{ stroke: 'hsl(var(--border))' }}
                  isAnimationActive={false}
                />
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
                  isAnimationActive={false}
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
          {stats.recent.map(({ attempt, problem, tags }) => (
            <Link
              key={attempt.id}
              to={`/problems/${problem.id}`}
              className="flex flex-wrap items-center gap-2 rounded-md p-2 text-sm transition-colors hover:bg-muted sm:flex-nowrap sm:gap-3"
            >
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                {attempt.date}
              </span>
              <DifficultyBadge difficulty={problem.difficulty} size="sm" />
              <span className="truncate font-medium">
                {problem.luoguId && (
                  <span className="mr-1 font-mono text-xs text-muted-foreground">
                    {problem.luoguId}
                  </span>
                )}
                {problem.title}
              </span>
              <div className="hidden flex-1 sm:block" />
              {tags.length > 0 && (
                <span className="truncate text-xs text-muted-foreground">
                  {tags.map((tag) => tag.name).join(' · ')}
                </span>
              )}
              <StatusBadge status={attempt.status} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatMinutes(attempt.timeSpentMin)}
              </span>
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
