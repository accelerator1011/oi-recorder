const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadDatabase } = require('./helpers.cjs')

require('fake-indexeddb/auto')
const Dexie = require('dexie').default

/**
 * v1/v2 时代 code 与 notes 直接内联在 attempts 行里，v3 才拆到 attemptContents。
 * 真实用户升级旧库时全靠 db.ts 里的 upgrade 回调，这条路径一旦出错就是
 * 代码与笔记全部丢失，因此必须直接用旧结构建库再升级来验证。
 */

/** v1 结构：problemTags 还没有 problemId / tagId 索引 */
class LegacyV1 extends Dexie {
  constructor(name) {
    super(name)
    this.version(1).stores({
      problems: '++id, luoguId, difficulty',
      tags: '++id, &name',
      problemTags: '++id, [problemId+tagId]',
      attempts: '++id, problemId, date, status',
    })
  }
}

/** v2 结构：只多了 problemTags 的两个索引，数据形状与 v1 相同 */
class LegacyV2 extends Dexie {
  constructor(name) {
    super(name)
    this.version(1).stores({
      problems: '++id, luoguId, difficulty',
      tags: '++id, &name',
      problemTags: '++id, [problemId+tagId]',
      attempts: '++id, problemId, date, status',
    })
    this.version(2).stores({
      problems: '++id, luoguId, difficulty',
      tags: '++id, &name',
      problemTags: '++id, [problemId+tagId], problemId, tagId',
      attempts: '++id, problemId, date, status',
    })
  }
}

const attempt = (overrides) => ({
  problemId: 1,
  language: 'C++',
  timeSpentMin: 30,
  createdAt: new Date('2024-05-01T00:00:00Z'),
  ...overrides,
})

/** 写一份典型的旧数据：一条带代码笔记、一条完全没有这两个字段 */
async function seed(name, Legacy) {
  const legacy = new Legacy(name)
  await legacy.problems.add({
    luoguId: 'P1001',
    title: '旧题目',
    difficulty: 3,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  })
  await legacy.tags.add({ name: 'DP' })
  await legacy.problemTags.add({ problemId: 1, tagId: 1 })
  await legacy.attempts.add(
    attempt({ date: '2024-05-01', status: 'AC', code: 'int main(){}', notes: '旧笔记' })
  )
  await legacy.attempts.add(attempt({ date: '2024-05-02', status: 'WA', timeSpentMin: 5 }))
  await legacy.close()
  return name
}

async function assertUpgraded(api) {
  const attempts = await api.getAllAttempts()
  assert.equal(attempts.length, 2)

  // 迁移后 attempts 行里不该再残留 code/notes，否则旧数据会一直占着空间
  for (const row of attempts) {
    assert.equal('code' in row, false, 'attempts 行仍残留 code')
    assert.equal('notes' in row, false, 'attempts 行仍残留 notes')
  }

  const contents = await api.db.attemptContents.toArray()
  const byId = new Map(contents.map((row) => [row.id, row]))

  const ac = attempts.find((row) => row.status === 'AC')
  assert.equal(byId.get(ac.id).code, 'int main(){}')
  assert.equal(byId.get(ac.id).notes, '旧笔记')

  // 缺 code/notes 的老行要补空串，而不是连内容行一起丢掉
  const wa = attempts.find((row) => row.status === 'WA')
  assert.equal(byId.get(wa.id).code, '')
  assert.equal(byId.get(wa.id).notes, '')

  // 题目、标签与关联不受影响
  assert.equal((await api.getAllProblems()).length, 1)
  const tags = await api.getTagsForProblem(1)
  assert.equal(tags.length, 1)
  assert.equal(tags[0].name, 'DP')

  // 编辑表单要能读回完整草稿
  const draft = await api.getAttemptDraft(ac.id)
  assert.equal(draft.code, 'int main(){}')
  assert.equal(draft.notes, '旧笔记')
  assert.equal(draft.status, 'AC')
}

test('v1 旧库升级后代码与笔记搬进 attemptContents', async (t) => {
  const api = loadDatabase(t, await seed(`migration-v1-${crypto.randomUUID()}`, LegacyV1))
  await assertUpgraded(api)
})

test('v2 旧库升级同样保住代码与笔记', async (t) => {
  const api = loadDatabase(t, await seed(`migration-v2-${crypto.randomUUID()}`, LegacyV2))
  await assertUpgraded(api)
})

test('重复打开已升级的库不会重复搬运数据', async (t) => {
  const name = `migration-twice-${crypto.randomUUID()}`
  await seed(name, LegacyV1)
  const api = loadDatabase(t, name)
  assert.equal(await api.db.attemptContents.count(), 2)

  // 模拟刷新页面：再用一个连接打开同一个库
  const reopened = loadDatabase(t, name)
  assert.equal(await reopened.db.attemptContents.count(), 2)
  assert.equal((await reopened.getAllAttempts()).length, 2)
})

test('旧库里存在重复洛谷题号时仍能正常打开', async (t) => {
  const name = `migration-dup-${crypto.randomUUID()}`
  const legacy = new LegacyV1(name)
  await legacy.problems.add({ luoguId: 'P1001', title: 'A', difficulty: 3, createdAt: new Date() })
  await legacy.problems.add({ luoguId: 'P1001', title: 'B', difficulty: 4, createdAt: new Date() })
  await legacy.close()

  // luoguId 上刻意没有唯一索引：存量库出现重复时也不能打不开
  const api = loadDatabase(t, name)
  assert.equal((await api.getAllProblems()).length, 2)
})
