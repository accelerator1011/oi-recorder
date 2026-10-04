const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadDatabase } = require('./helpers.cjs')

/**
 * tags 表对 name 建了唯一索引，标签的创建/重命名最容易踩到约束冲突。
 * 这里钉住：冲突要变成用户看得懂的原因，而不是漏到底层 ConstraintError。
 */

test('创建标签拒绝空名，同名则复用既有标签', async (t) => {
  const api = loadDatabase(t)

  await assert.rejects(api.createTag('   '), /标签名不能为空/)

  const first = await api.createTag('DP')
  const again = await api.createTag('DP')
  const spaced = await api.createTag('  DP  ')
  assert.equal(first, again)
  assert.equal(first, spaced)
  assert.deepEqual(
    (await api.getAllTags()).map((tag) => tag.name),
    ['DP']
  )
})

test('并发新建同名标签时复用同一个标签', async (t) => {
  const name = `tag-race-${crypto.randomUUID()}`
  const a = loadDatabase(t, name)
  const b = loadDatabase(t, name)

  const ids = await Promise.all([a.createTag('图论'), b.createTag('图论')])
  assert.equal(new Set(ids).size, 1)
  assert.equal((await a.getAllTags()).length, 1)
})

test('重命名拒绝空名，并且不会留下无名标签', async (t) => {
  const api = loadDatabase(t)
  const id = await api.createTag('DP')

  await assert.rejects(api.updateTag(id, '   '), /标签名不能为空/)
  assert.equal((await api.getAllTags())[0].name, 'DP')
})

test('重命名撞上已存在的标签时给出可读原因', async (t) => {
  const api = loadDatabase(t)
  const dp = await api.createTag('DP')
  const graph = await api.createTag('图论')

  // 旧实现直接把 Dexie 的 ConstraintError 抛给界面，用户只能看到「重命名失败」
  await assert.rejects(api.updateTag(graph, 'DP'), /标签名「DP」已被占用/)

  const tags = await api.getAllTags()
  assert.deepEqual(
    tags.map((tag) => tag.name).sort(),
    ['DP', '图论'],
    '重名被拒后两个标签都应原样保留'
  )
  assert.equal(tags.find((tag) => tag.id === dp).name, 'DP')
  assert.equal(tags.find((tag) => tag.id === graph).name, '图论')
})

test('改成自己原来的名字不算重名', async (t) => {
  const api = loadDatabase(t)
  const id = await api.createTag('DP')

  await api.updateTag(id, 'DP')
  await api.updateTag(id, '  DP ')
  assert.equal((await api.getAllTags())[0].name, 'DP')
})

test('重命名不存在的标签会明确报错，而不是静默无操作', async (t) => {
  const api = loadDatabase(t)

  await assert.rejects(api.updateTag(999, 'DP'), /标签不存在或已被删除/)
})

test('重命名不影响既有的题目标签关联', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  const problemId = await api.upsertProblem({ title: 'A', difficulty: 3 })
  await api.setProblemTags(problemId, [tagId])

  await api.updateTag(tagId, '动态规划')

  const tags = await api.getTagsForProblem(problemId)
  assert.equal(tags.length, 1)
  assert.equal(tags[0].name, '动态规划')
  assert.equal((await api.getTagUsageCounts()).get(tagId), 1)
})

test('删除标签会一并清掉题目标签关联', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  const problemId = await api.upsertProblem({ title: 'A', difficulty: 3 })
  await api.setProblemTags(problemId, [tagId])

  await api.deleteTag(tagId)

  assert.equal((await api.getAllTags()).length, 0)
  assert.equal((await api.getAllProblemTags()).length, 0)
  // 题目本身必须保留，删标签不该牵连题目
  assert.equal((await api.getProblem(problemId)).title, 'A')
})

test('标签已被删除时拒绝写入，不留下悬空的关联行', async (t) => {
  const api = loadDatabase(t)
  const problemId = await api.upsertProblem({ title: 'A', difficulty: 3 })
  const alive = await api.createTag('DP')
  const doomed = await api.createTag('图论')
  await api.setProblemTags(problemId, [alive])
  await api.deleteTag(doomed)

  await assert.rejects(api.setProblemTags(problemId, [alive, doomed]), /所选标签已被删除/)

  // 原来那条合法关联必须原样保留，不能被这次失败连带清掉
  assert.deepEqual(
    (await api.getAllProblemTags()).map((row) => row.tagId),
    [alive]
  )
})

test('保存记录时带上已删除的标签会整体回滚', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  const doomed = await api.createTag('图论')
  await api.deleteTag(doomed)

  await assert.rejects(
    api.saveRecord({ title: 'A', difficulty: 3 }, [tagId, doomed], {
      date: '2026-10-04',
      status: 'AC',
      language: 'C++',
      timeSpentMin: 1,
      code: '',
      notes: '',
    }),
    /所选标签已被删除/
  )

  assert.equal((await api.getAllProblems()).length, 0, '题目也要跟着回滚，不能残留')
  assert.equal((await api.getAllProblemTags()).length, 0)
  assert.equal((await api.getAllAttempts()).length, 0)
})

test('重复传入同一个标签 id 不会触发唯一约束', async (t) => {
  const api = loadDatabase(t)
  const tagId = await api.createTag('DP')
  const problemId = await api.upsertProblem({ title: 'A', difficulty: 3 })

  await api.setProblemTags(problemId, [tagId, tagId, tagId])

  assert.equal((await api.getAllProblemTags()).length, 1)
})
