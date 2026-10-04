const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadDatabase } = require('./helpers.cjs')

function backup() {
  return {
    version: 1,
    problems: [{ id: 1, title: 'A', difficulty: 3 }],
    tags: [],
    problemTags: [],
    attempts: [
      {
        id: 7,
        problemId: 1,
        date: '2026-10-04',
        status: 'AC',
        language: 'C++',
        timeSpentMin: 1,
        code: 'int main() {}',
        notes: '需要保留的笔记',
      },
    ],
  }
}

test('备份文件缺少记录 ID 时在校验阶段报错', (t) => {
  const api = loadDatabase(t)
  const data = backup()
  delete data.attempts[0].id
  assert.throws(() => api.parseBackupFile(JSON.stringify(data)), /attempts\[0\]\.id 必须是整数/)
})

test('直接导入缺少 ID 的记录也不能清空已有数据', async (t) => {
  const api = loadDatabase(t)
  const problemId = await api.upsertProblem({ title: '原有题目', difficulty: 3 })
  const data = backup()
  delete data.attempts[0].id
  await assert.rejects(api.importAll(data), /attempts\[0\]\.id 必须是整数/)
  assert.equal((await api.getProblem(problemId)).title, '原有题目')
})

test('正常备份导入后代码和笔记仍与原记录 ID 关联', async (t) => {
  const api = loadDatabase(t)
  await api.importAll(api.parseBackupFile(JSON.stringify(backup())))
  assert.equal((await api.getAttempt(7)).problemId, 1)
  assert.equal((await api.getAttemptContent(7)).id, 7)
  assert.equal((await api.getAttemptContent(7)).code, 'int main() {}')
  assert.equal((await api.getAttemptContent(7)).notes, '需要保留的笔记')
})

test('历史重复题号可导出再恢复，记录与标签仍归属各自题目', async (t) => {
  const api = loadDatabase(t)
  const data = backup()
  data.problems[0].luoguId = 'P1001'
  data.problems.push({ id: 2, title: 'B', difficulty: 4, luoguId: 'P1001' })
  data.tags.push({ id: 1, name: 'DP' })
  data.problemTags.push({ problemId: 2, tagId: 1 })
  data.attempts.push({ ...data.attempts[0], id: 8, problemId: 2, code: 'second code' })
  await api.importAll(api.parseBackupFile(JSON.stringify(data)))
  const exported = await api.exportAll()
  await api.importAll(api.parseBackupFile(JSON.stringify(exported)))
  assert.equal((await api.getAllProblems()).length, 2)
  assert.equal((await api.getAttempt(8)).problemId, 2)
  assert.equal((await api.getAttemptContent(8)).code, 'second code')
  assert.equal((await api.getTagsForProblem(1)).length, 0)
  assert.equal((await api.getTagsForProblem(2))[0].name, 'DP')
})
