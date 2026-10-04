const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadSource } = require('./helpers.cjs')

const {
  buildProblemIndex,
  buildRecentViews,
  buildWeeklyTrend,
  computeProblemStats,
  filterAttemptViews,
  joinAttempts,
} = loadSource('src/lib/selectors.ts', { './utils': loadSource('src/lib/utils.ts') })

const problem = (id, difficulty, overrides = {}) => ({
  id,
  luoguId: `P${String(1000 + id)}`,
  title: `题目 ${String(id)}`,
  difficulty,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const attempt = (id, problemId, date, status = 'AC') => ({
  id,
  problemId,
  date,
  status,
  language: 'C++',
  timeSpentMin: 30,
  createdAt: new Date(`${date}T00:00:00Z`),
})

const link = (id, problemId, tagId) => ({ id, problemId, tagId })

test('同一题多次 AC 只算一次通过，并归到最早那一天', () => {
  const index = buildProblemIndex([problem(1, 3)], [], [])
  const stats = computeProblemStats(
    [
      attempt(1, 1, '2026-10-05', 'WA'),
      attempt(2, 1, '2026-10-03'),
      attempt(3, 1, '2026-10-01'),
      attempt(4, 1, '2026-10-04'),
    ],
    index
  )

  assert.equal(stats.totalProblems, 1)
  assert.equal(stats.acProblemCount, 1)
  assert.equal(stats.todoCount, 0)
  assert.equal(stats.firstAcDateByProblemId.get(1), '2026-10-01')
  // 趋势只看首次 AC 那天，后面的 AC 不能再往别的日期堆
  assert.equal(stats.acByDate.size, 1)
  assert.equal(stats.acByDate.get('2026-10-01'), 1)
  // 耗时与记录数仍然按全部记录如实统计
  assert.equal(stats.totalAttempts, 4)
  assert.equal(stats.totalTimeMin, 120)
})

test('有记录但没 AC 的题目算进行中，难度分布只计通过题', () => {
  const index = buildProblemIndex([problem(1, 3), problem(2, 5)], [], [])
  const stats = computeProblemStats(
    [attempt(1, 1, '2026-10-01', 'WA'), attempt(2, 2, '2026-10-02'), attempt(3, 2, '2026-10-01')],
    index
  )

  assert.equal(stats.totalProblems, 2)
  assert.equal(stats.acProblemCount, 1)
  assert.equal(stats.todoCount, 1)
  assert.equal(stats.firstAcDateByProblemId.get(2), '2026-10-01')
  assert.equal(stats.acByDifficulty.get(5), 1)
  assert.equal(stats.acByDifficulty.get(3), undefined)
})

test('算法分布只统计通过题，同一题的多个标签各计一次', () => {
  const tags = [
    { id: 1, name: 'DP' },
    { id: 2, name: '图论' },
  ]
  const index = buildProblemIndex([problem(1, 4), problem(2, 6)], tags, [
    link(1, 1, 1),
    link(2, 1, 2),
    link(3, 2, 1),
  ])
  const stats = computeProblemStats(
    [attempt(1, 1, '2026-10-01'), attempt(2, 1, '2026-10-05'), attempt(3, 2, '2026-10-02', 'TLE')],
    index
  )

  // 题 2 尚未通过，它身上的 DP 不能混进来
  assert.equal(stats.acByTagName.get('DP'), 1)
  assert.equal(stats.acByTagName.get('图论'), 1)
})

test('题目已被删除的孤立记录不参与任何题目级统计', () => {
  const index = buildProblemIndex([problem(1, 3)], [], [])
  const attempts = [
    attempt(1, 1, '2026-10-01'),
    attempt(2, 999, '2026-10-02'),
    attempt(3, 999, '2026-10-03'),
  ]
  const stats = computeProblemStats(attempts, index)

  assert.equal(stats.totalProblems, 1)
  assert.equal(stats.acProblemCount, 1)
  assert.equal(stats.todoCount, 0)
  // 难度图表的合计必须与「已通过」卡片对得上
  const difficultySum = [...stats.acByDifficulty.values()].reduce((a, b) => a + b, 0)
  assert.equal(difficultySum, stats.acProblemCount)
  // 原始记录数与耗时仍如实统计，不因为题目缺失就被抹掉
  assert.equal(stats.totalAttempts, 3)
  assert.equal(stats.totalTimeMin, 90)
  // 孤立记录也不该出现在最近记录里
  assert.deepEqual(
    buildRecentViews(attempts, index).map((view) => view.attempt.id),
    [1]
  )
})

test('七日趋势只统计窗口内首次 AC 的题目', () => {
  const acByDate = new Map([
    ['2026-09-28', 1],
    ['2026-10-01', 2],
    ['2026-10-04', 1],
    ['2026-10-09', 5],
    ['2026-09-20', 9],
  ])
  const trend = buildWeeklyTrend(acByDate, new Date(2026, 9, 4))

  assert.deepEqual(
    trend.map((point) => point.label),
    ['9/28', '9/29', '9/30', '10/1', '10/2', '10/3', '10/4']
  )
  assert.deepEqual(
    trend.map((point) => point.solved),
    [1, 0, 0, 2, 0, 0, 1]
  )
  assert.equal(
    trend.reduce((sum, point) => sum + point.solved, 0),
    4
  )
})

test('七日趋势跨年时窗口仍然连续', () => {
  const acByDate = new Map([
    ['2025-12-28', 1],
    ['2026-01-01', 3],
  ])
  const trend = buildWeeklyTrend(acByDate, new Date(2026, 0, 3))

  assert.deepEqual(
    trend.map((point) => point.label),
    ['12/28', '12/29', '12/30', '12/31', '1/1', '1/2', '1/3']
  )
  assert.deepEqual(
    trend.map((point) => point.solved),
    [1, 0, 0, 0, 3, 0, 0]
  )
  assert.deepEqual(
    trend.map((point) => point.date),
    [
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]
  )
})

test('最近记录按日期倒序，同日按 id 倒序且不打乱入参数组', () => {
  const index = buildProblemIndex([problem(1, 3), problem(2, 4)], [], [])
  const attempts = [
    attempt(1, 1, '2026-10-01'),
    attempt(2, 2, '2026-10-03'),
    attempt(3, 1, '2026-10-03'),
    attempt(4, 2, '2026-10-02'),
  ]

  assert.deepEqual(
    buildRecentViews(attempts, index).map((view) => view.attempt.id),
    [3, 2, 4, 1]
  )
  assert.deepEqual(
    buildRecentViews(attempts, index, 2).map((view) => view.attempt.id),
    [3, 2]
  )
  assert.deepEqual(
    attempts.map((row) => row.id),
    [1, 2, 3, 4]
  )
})

test('筛选命中题名、题号与标签，忽略大小写', () => {
  const tags = [{ id: 1, name: 'Dynamic Programming' }]
  const index = buildProblemIndex(
    [problem(1, 3), problem(2, 5, { title: '并查集', luoguId: 'P3367' })],
    tags,
    [link(1, 1, 1)]
  )
  const views = joinAttempts(
    [attempt(1, 1, '2026-10-01'), attempt(2, 2, '2026-10-01', 'WA')],
    index
  )

  assert.equal(filterAttemptViews(views, {}).length, 2)
  assert.equal(filterAttemptViews(views, { search: '并查' }).length, 1)
  assert.equal(filterAttemptViews(views, { search: 'p3367' }).length, 1)
  assert.equal(filterAttemptViews(views, { search: 'dynamic' }).length, 1)
  // 纯空白输入不算筛选，而不是把列表过滤空
  assert.equal(filterAttemptViews(views, { search: '   ' }).length, 2)
  assert.equal(filterAttemptViews(views, { difficulty: 3 }).length, 1)
  assert.equal(filterAttemptViews(views, { difficulty: null }).length, 2)
  assert.equal(filterAttemptViews(views, { status: 'WA' }).length, 1)
  assert.equal(filterAttemptViews(views, { status: 'all' }).length, 2)
  // 条件叠加必须同时满足
  assert.equal(filterAttemptViews(views, { difficulty: 3, status: 'WA' }).length, 0)
})

test('缺少 id 的题目行不进索引，也不会拼出坏掉的视图', () => {
  const index = buildProblemIndex(
    [{ title: '无 id', difficulty: 3, createdAt: new Date() }],
    [],
    []
  )

  assert.equal(index.problemMap.size, 0)
  assert.deepEqual(joinAttempts([attempt(1, 7, '2026-10-01')], index), [])
  assert.deepEqual(computeProblemStats([attempt(1, 7, '2026-10-01')], index).acProblemCount, 0)
})
