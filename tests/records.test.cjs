const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadDatabase } = require('./helpers.cjs')

const problem = { title: 'A', luoguId: 'P1001', difficulty: 3 }
const attempt = {
  date: '2026-10-04',
  status: 'AC',
  language: 'C++',
  timeSpentMin: 1,
  code: 'code',
  notes: 'notes',
}

test('新建时内容写入失败，题目、标签和记录全部回滚', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  api.db.attemptContents.hook('creating', () => {
    throw new Error('模拟存储失败')
  })
  await assert.rejects(api.saveRecord(problem, [tagId], attempt), /模拟存储失败/)
  assert.equal((await api.getAllProblems()).length, 0)
  assert.equal((await api.getAllProblemTags()).length, 0)
  assert.equal((await api.getAllAttempts()).length, 0)
  assert.equal(await api.db.attemptContents.count(), 0)
})

test('编辑时内容写入失败，原题名、难度、标签与内容全部保留', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  const id = await api.saveRecord(problem, [tagId], attempt)
  const before = await api.exportAll()
  api.db.attemptContents.hook('updating', () => {
    throw new Error('模拟存储失败')
  })
  await assert.rejects(
    api.saveRecord(
      { ...problem, title: 'changed', difficulty: 8 },
      [],
      { ...attempt, code: 'changed' },
      id
    ),
    /模拟存储失败/
  )
  const after = await api.exportAll()
  assert.deepEqual(after.problems, before.problems)
  assert.deepEqual(after.problemTags, before.problemTags)
  assert.deepEqual(after.attempts, before.attempts)
})

test('编辑已删除记录时拒绝保存，不产生孤立题目', async (t) => {
  const api = loadDatabase(t)
  await assert.rejects(api.saveRecord(problem, [], attempt, 999), /记录不存在/)
  assert.equal((await api.getAllProblems()).length, 0)
})

test('两个数据库连接并发新建同一题号，复用同一道题', async (t) => {
  const name = `concurrency-test-${crypto.randomUUID()}`
  const a = loadDatabase(t, name)
  const b = loadDatabase(t, name)
  const ids = await Promise.all([
    a.saveRecord(problem, [], attempt),
    b.saveRecord(problem, [], attempt),
  ])
  assert.equal(new Set(ids).size, 2)
  assert.equal((await a.getAllProblems()).length, 1)
  assert.equal(new Set((await a.getAllAttempts()).map((row) => row.problemId)).size, 1)
  assert.equal(await a.db.attemptContents.count(), 2)
})

test('并发修改题号时，只允许一道题占用目标题号', async (t) => {
  const name = `concurrency-test-${crypto.randomUUID()}`
  const a = loadDatabase(t, name)
  const b = loadDatabase(t, name)
  const first = await a.upsertProblem({ ...problem, luoguId: 'P1002' })
  const second = await b.upsertProblem({ ...problem, luoguId: 'P1003' })
  const results = await Promise.allSettled([
    a.upsertProblem(problem, first),
    b.upsertProblem(problem, second),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal((await a.getAllProblems()).filter((row) => row.luoguId === 'P1001').length, 1)
})

test('空日期和不存在的日期不能保存，合法闰日可备份恢复', async (t) => {
  const api = loadDatabase(t)
  await Promise.all(
    ['', '2026-02-29', '2026-04-31', 'invalid'].flatMap((date) => [
      assert.rejects(api.saveRecord(problem, [], { ...attempt, date }), /完成日期/),
      assert.rejects(api.createAttempt({ ...attempt, date, problemId: 1 }), /完成日期/),
    ])
  )
  assert.equal((await api.getAllProblems()).length, 0)
  const id = await api.saveRecord(problem, [], { ...attempt, date: '2024-02-29' })
  await assert.rejects(api.updateAttempt(id, { date: '' }), /完成日期/)
  await api.importAll(api.parseBackupFile(JSON.stringify(await api.exportAll())))
  assert.equal((await api.getAttempt(id)).date, '2024-02-29')
})
