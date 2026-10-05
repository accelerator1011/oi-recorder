const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadDatabase } = require('./helpers.cjs')

/**
 * parseBackupFile 是唯一挡在「清空整个数据库」之前的关卡：
 * 任何一条校验分支漏掉，都可能让脏数据覆盖用户全部记录。
 * 这里逐条钉住拒绝规则与规范化规则。
 */

function valid() {
  return {
    version: 1,
    exportedAt: '2026-10-04T00:00:00.000Z',
    problems: [
      { id: 1, title: 'A', difficulty: 3, luoguId: 'P1001', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    tags: [{ id: 1, name: 'DP' }],
    problemTags: [{ id: 1, problemId: 1, tagId: 1 }],
    attempts: [
      {
        id: 7,
        problemId: 1,
        date: '2026-10-04',
        status: 'AC',
        language: 'C++',
        timeSpentMin: 5,
        code: 'int main() {}',
        notes: '笔记',
      },
    ],
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value))

/** 用给定补丁改坏备份文件，并断言解析被对应的规则挡下 */
function assertRejected(api, mutate, expected) {
  const data = valid()
  mutate(data)
  assert.throws(() => api.parseBackupFile(JSON.stringify(data)), expected)
}

test('文件结构不合法时直接拒绝', (t) => {
  const api = loadDatabase(t)

  assert.throws(() => api.parseBackupFile('not json'), /不是合法的 JSON/)
  assert.throws(() => api.parseBackupFile('[]'), /最外层必须是一个对象/)
  assert.throws(() => api.parseBackupFile('null'), /最外层必须是一个对象/)
  assert.throws(
    () => api.parseBackupFile(JSON.stringify({ ...valid(), version: '1' })),
    /缺少合法的 version 字段/
  )
  assert.throws(
    () => api.parseBackupFile(JSON.stringify({ ...valid(), version: undefined })),
    /缺少合法的 version 字段/
  )

  for (const key of ['problems', 'tags', 'problemTags', 'attempts']) {
    const data = valid()
    delete data[key]
    assert.throws(() => api.parseBackupFile(JSON.stringify(data)), new RegExp(`缺少 ${key} 数组`))
  }

  assertRejected(api, (d) => d.problems.push('x'), /problems\[1\] 必须是对象/)
  assertRejected(api, (d) => d.attempts.push(7), /attempts\[1\] 必须是对象/)
  assertRejected(api, (d) => d.tags.push('x'), /tags\[1\] 必须是对象/)
  assertRejected(api, (d) => d.problemTags.push('x'), /problemTags\[1\] 必须是对象/)
  assertRejected(api, (d) => delete d.problems[0].id, /problems\[0\]\.id 必须是整数/)
  assertRejected(api, (d) => delete d.tags[0].id, /tags\[0\]\.id 必须是整数/)
})

test('题目字段的取值与唯一性被逐项校验', (t) => {
  const api = loadDatabase(t)

  assertRejected(
    api,
    (d) => d.problems.push({ ...clone(d.problems[0]), title: 'B' }),
    /与前面的题目重复/
  )
  assertRejected(api, (d) => (d.problems[0].title = '   '), /title 必须是非空字符串/)
  assertRejected(api, (d) => delete d.problems[0].title, /title 必须是非空字符串/)

  for (const difficulty of [0, 9, 1.5, -3, '3', null]) {
    assertRejected(
      api,
      (d) => (d.problems[0].difficulty = difficulty),
      /difficulty 必须是 1-8 之间的整数/
    )
  }
  // 边界值 1 和 8 必须放行
  for (const difficulty of [1, 8]) {
    const data = valid()
    data.problems[0].difficulty = difficulty
    assert.equal(api.parseBackupFile(JSON.stringify(data)).problems[0].difficulty, difficulty)
  }
})

test('标签与题目标签关联的悬空引用会被挡下', (t) => {
  const api = loadDatabase(t)

  // 标签名先 trim 再判重，带空格的同名字必须被挡下
  assertRejected(api, (d) => d.tags.push({ id: 2, name: ' DP ' }), /与前面的标签重名/)
  assertRejected(api, (d) => (d.tags[0].name = '  '), /name 必须是非空字符串/)
  assertRejected(api, (d) => d.tags.push({ id: 1, name: '图论' }), /与前面的标签重复/)

  assertRejected(api, (d) => (d.problemTags[0].problemId = 99), /引用了不存在的题目 #99/)
  assertRejected(api, (d) => (d.problemTags[0].tagId = 99), /引用了不存在的标签 #99/)
  assertRejected(
    api,
    (d) => d.problemTags.push({ id: 2, problemId: 1, tagId: 1 }),
    /与前面的记录重复/
  )
  assertRejected(api, (d) => (d.problemTags[0].problemId = '1'), /problemId \/ tagId 必须是整数/)
  // problemTags 的 id 是可选的，但给了就必须是非重复整数
  assertRejected(api, (d) => (d.problemTags[0].id = '1'), /problemTags\[0\]\.id 必须是整数/)
  assertRejected(
    api,
    (d) => d.problemTags.push({ id: 1, problemId: 1, tagId: 1 }),
    /problemTags\[1\]\.id 与前面的记录 id 重复/
  )
})

test('记录字段的日期、状态、语言、耗时与内容类型都会被校验', (t) => {
  const api = loadDatabase(t)

  assertRejected(
    api,
    (d) => d.attempts.push({ ...clone(d.attempts[0]), id: 8, problemId: 99 }),
    /attempts\[1\] 引用了不存在的题目 #99/
  )
  assertRejected(
    api,
    (d) => d.attempts.push({ ...clone(d.attempts[0]), id: 7, problemId: 1 }),
    /与前面的记录 id 重复/
  )

  // 2026-02-29 不存在、月份越界、日越界、未补零与非日期格式都要被拒
  for (const date of [
    '2026-02-29',
    '2026-13-01',
    '2026-10-32',
    '2026-00-10',
    '2026-10-00',
    '2026-1-1',
    '26-10-04',
    '2026/10/04',
    'invalid',
    '',
  ]) {
    assertRejected(api, (d) => (d.attempts[0].date = date), /date 必须是合法的 YYYY-MM-DD 日期/)
  }
  // 合法闰日必须放行
  const leap = valid()
  leap.attempts[0].date = '2024-02-29'
  assert.equal(api.parseBackupFile(JSON.stringify(leap)).attempts[0].date, '2024-02-29')

  assertRejected(api, (d) => (d.attempts[0].status = 'ACCEPTED'), /status 不是支持的状态/)
  assertRejected(api, (d) => (d.attempts[0].status = '进行中2'), /status 不是支持的状态/)
  assertRejected(api, (d) => (d.attempts[0].language = 'Rust'), /language 不是支持的语言/)
  // 历史遗留的「进行中」必须仍然可读，否则旧备份会导入失败
  const legacy = valid()
  legacy.attempts[0].status = '进行中'
  assert.equal(api.parseBackupFile(JSON.stringify(legacy)).attempts[0].status, '进行中')

  for (const timeSpentMin of [-1, '5', null, Number.NaN]) {
    assertRejected(
      api,
      (d) => (d.attempts[0].timeSpentMin = timeSpentMin),
      /timeSpentMin 必须是非负数字/
    )
  }
  assertRejected(api, (d) => (d.attempts[0].problemId = '1'), /attempts\[0\]\.problemId 必须是整数/)
  assertRejected(api, (d) => (d.attempts[0].code = null), /code 必须是字符串/)
  assertRejected(api, (d) => delete d.attempts[0].notes, /notes 必须是字符串/)
})

test('合法备份会被规范化，重复题号仍然放行', (t) => {
  const api = loadDatabase(t)
  const data = valid()
  data.problems[0].luoguId = '  P1001  '
  data.problems.push({ id: 2, title: 'B', difficulty: 4, luoguId: 'P1001' })
  data.problems.push({ id: 3, title: 'C', difficulty: 4, luoguId: '   ' })
  delete data.exportedAt

  const parsed = api.parseBackupFile(JSON.stringify(data))

  assert.equal(parsed.problems[0].luoguId, 'P1001')
  // 空串题号视为「未填写」，不能污染查重
  assert.equal(parsed.problems[2].luoguId, undefined)
  assert.equal(parsed.problems.length, 3)
  assert.ok(parsed.problems[0].createdAt instanceof Date)
  assert.equal(typeof parsed.exportedAt, 'string')
  assert.equal(parsed.version, 1)
})
