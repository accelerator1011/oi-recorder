import Dexie, { type Table } from 'dexie'
import type {
  Attempt,
  AttemptContent,
  Difficulty,
  Language,
  Problem,
  ProblemTag,
  Status,
  Tag,
} from './types'
import { DIFFICULTIES, LANGUAGE_OPTIONS, STATUS_COLORS } from './constants'

class OIDatabase extends Dexie {
  problems!: Table<Problem>
  tags!: Table<Tag>
  problemTags!: Table<ProblemTag>
  attempts!: Table<Attempt>
  attemptContents!: Table<AttemptContent, number>

  constructor() {
    super('OiRecorderDB')
    // 关于 luoguId：这里刻意不使用唯一索引（&luoguId）。IndexedDB 在 createIndex 阶段
    // 若发现存量数据已有重复值（包括空串 ''）会抛出 ConstraintError 并导致整个数据库
    // 无法打开，存量库无法保证干净。因此题号唯一性由 upsertProblem 在应用层保证。
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
    // v3 把 code / notes 从 attempts 行里拆到独立的 attemptContents 表。
    // 列表页与首页只查 attempts，不再把每一条记录的代码读进内存。
    this.version(3)
      .stores({
        problems: '++id, luoguId, difficulty',
        tags: '++id, &name',
        problemTags: '++id, [problemId+tagId], problemId, tagId',
        attempts: '++id, problemId, date, status',
        attemptContents: 'id',
      })
      .upgrade(async (tx) => {
        const attempts = tx.table('attempts')
        const rows = (await attempts.toArray()) as Array<Record<string, unknown>>
        const contents = rows
          .filter((row) => typeof row.id === 'number')
          .map((row) => ({
            id: row.id as number,
            code: typeof row.code === 'string' ? row.code : '',
            notes: typeof row.notes === 'string' ? row.notes : '',
          }))
        if (contents.length) await tx.table('attemptContents').bulkPut(contents)
        // 迁移后必须把原行里的 code/notes 删掉，否则旧数据仍会占着空间
        await attempts.toCollection().modify((row) => {
          const record = row as Record<string, unknown>
          delete record.code
          delete record.notes
        })
      })
  }
}

export const db = new OIDatabase()

/* ── Problem CRUD ─────────────────────────────────────── */

export async function getAllProblems(): Promise<Problem[]> {
  return db.problems.toArray()
}

export function normalizeLuoguId(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * 按洛谷题号查找题目。返回最早创建（id 最小）的一条，保证结果稳定；
 * 空串/空白视为「未填写题号」，直接返回 undefined。
 */
export async function getProblemByLuoguId(luoguId: string): Promise<Problem | undefined> {
  const key = normalizeLuoguId(luoguId)
  if (!key) return undefined
  const matches = await db.problems.where('luoguId').equals(key).sortBy('id')
  return matches[0]
}

/**
 * 只阻止「新引入」的题号重复：如果题目本来就占用着这个题号（本次没改动），
 * 则放行，避免历史脏数据（旧版本可能已存在重复题号）导致用户无法保存。
 */
async function assertLuoguIdFree(
  luoguId: string | undefined,
  selfId: number,
  currentLuoguId: string | undefined
): Promise<void> {
  if (!luoguId || luoguId === currentLuoguId) return
  const conflict = await getProblemByLuoguId(luoguId)
  if (conflict && conflict.id !== selfId) {
    throw new Error(`洛谷题号 ${luoguId} 已被「${conflict.title}」占用`)
  }
}

export async function upsertProblem(
  data: Omit<Problem, 'id' | 'createdAt'>,
  id?: number
): Promise<number> {
  // 同一张表上的读写事务会串行执行，跨标签页的查重与写入也不会交错。
  return db.transaction('rw', db.problems, async () => upsertProblemInTransaction(data, id))
}

async function upsertProblemInTransaction(
  data: Omit<Problem, 'id' | 'createdAt'>,
  id?: number
): Promise<number> {
  const luoguId = normalizeLuoguId(data.luoguId)
  const fields = { luoguId, title: data.title, difficulty: data.difficulty }

  // 1) 按主键命中：只更新这三个字段，createdAt 保持原值
  if (id !== undefined) {
    const existing = await db.problems.get(id)
    if (existing) {
      await assertLuoguIdFree(luoguId, id, normalizeLuoguId(existing.luoguId))
      await db.problems.update(id, fields)
      return id
    }
  }

  // 2) 按洛谷题号命中：复用该题目，同时把本次提交的题名/难度写回去。
  //    旧实现在这里直接 `return existing.id`，用户刚改好的题名和难度会被静默丢弃。
  if (luoguId) {
    const existing = await getProblemByLuoguId(luoguId)
    if (existing?.id !== undefined) {
      await db.problems.update(existing.id, fields)
      return existing.id
    }
  }

  // 3) 新建
  return db.problems.add({ ...fields, createdAt: new Date() })
}

export async function getProblem(id: number): Promise<Problem | undefined> {
  return db.problems.get(id)
}

/* ── Tag CRUD ─────────────────────────────────────────── */

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy('name').toArray()
}

export async function createTag(name: string): Promise<number> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('标签名不能为空')
  // 查重与写入放在同一个读写事务里：tags 表对 name 有唯一索引，
  // 两个入口同时新建同名标签时，后到的那个必须拿到已有 id 而不是撞约束报错。
  return db.transaction('rw', db.tags, async () => {
    const existing = await db.tags.where('name').equals(trimmed).first()
    if (existing?.id !== undefined) return existing.id
    return db.tags.add({ name: trimmed })
  })
}

/**
 * 重命名标签。
 * 唯一索引会在重名时抛底层 ConstraintError，界面拿到的只会是「重命名失败」，
 * 所以这里先显式挡下空名与重名，给出能直接展示给用户的原因。
 * 改成自己原来的名字不算重名，按无操作处理。
 */
export async function updateTag(id: number, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('标签名不能为空')
  await db.transaction('rw', db.tags, async () => {
    const existing = await db.tags.get(id)
    if (!existing) throw new Error('标签不存在或已被删除')
    if (existing.name !== trimmed) {
      const conflict = await db.tags.where('name').equals(trimmed).first()
      if (conflict && conflict.id !== id) {
        throw new Error(`标签名「${trimmed}」已被占用，请换一个名字`)
      }
    }
    await db.tags.update(id, { name: trimmed })
  })
}

export async function deleteTag(id: number): Promise<void> {
  await db.transaction('rw', db.tags, db.problemTags, async () => {
    await db.problemTags.where('tagId').equals(id).delete()
    await db.tags.delete(id)
  })
}

export async function getTagUsageCounts(): Promise<Map<number, number>> {
  const all = await db.problemTags.toArray()
  const map = new Map<number, number>()
  for (const pt of all) {
    map.set(pt.tagId, (map.get(pt.tagId) ?? 0) + 1)
  }
  return map
}

/* ── ProblemTags ──────────────────────────────────────── */

export async function getAllProblemTags(): Promise<ProblemTag[]> {
  return db.problemTags.toArray()
}

export async function getTagsForProblem(problemId: number): Promise<Tag[]> {
  const ptRows = await db.problemTags.where('problemId').equals(problemId).toArray()
  if (ptRows.length === 0) return []
  const tagIds = ptRows.map((r) => r.tagId)
  return db.tags.where('id').anyOf(tagIds).toArray()
}

export async function setProblemTags(problemId: number, tagIds: number[]): Promise<void> {
  await db.transaction('rw', db.problemTags, db.tags, async () => {
    // 表单里的选中态只存 id。标签若在另一个标签页被删掉，直接写入就会留下
    // 指向不存在标签的关联行，标签页的用量统计也会因此算错。
    const wanted = [...new Set(tagIds)]
    if (wanted.length > 0) {
      const found = await db.tags.where('id').anyOf(wanted).primaryKeys()
      if (found.length !== wanted.length) throw new Error('所选标签已被删除，请重新选择')
    }
    await db.problemTags.where('problemId').equals(problemId).delete()
    if (wanted.length > 0) {
      await db.problemTags.bulkAdd(wanted.map((tagId) => ({ problemId, tagId })))
    }
  })
}

/* ── Attempt CRUD ─────────────────────────────────────── */

/** 新建/更新一条记录时的入参：元数据 + 代码 + 笔记 */
export type AttemptDraft = Omit<Attempt, 'id' | 'createdAt'> &
  Pick<AttemptContent, 'code' | 'notes'>

/** 题目信息、标签与记录内容必须一起成功或一起回滚。 */
export async function saveRecord(
  problem: Omit<Problem, 'id' | 'createdAt'>,
  tagIds: number[],
  attempt: Omit<AttemptDraft, 'problemId'>,
  attemptId?: number
): Promise<number> {
  if (!isValidDateString(attempt.date)) throw new Error('请填写合法的完成日期')
  // 作用域必须包含 setProblemTags 用到的 db.tags：
  // Dexie 的嵌套事务只允许引用父事务已声明的表，少一个就直接抛错。
  return db.transaction(
    'rw',
    db.problems,
    db.tags,
    db.problemTags,
    db.attempts,
    db.attemptContents,
    async () => {
      let problemId: number | undefined
      if (attemptId !== undefined) {
        const existing = await db.attempts.get(attemptId)
        if (!existing) throw new Error('记录不存在或已被删除')
        if (!(await db.problems.get(existing.problemId))) {
          throw new Error('这条记录关联的题目已不存在')
        }
        problemId = existing.problemId
      }
      problemId = await upsertProblem(problem, problemId)
      await setProblemTags(problemId, tagIds)
      const payload = { ...attempt, problemId }
      if (attemptId !== undefined) {
        await updateAttempt(attemptId, payload)
        return attemptId
      }
      return createAttempt(payload)
    }
  )
}

export async function getAttemptsByProblemId(problemId: number): Promise<Attempt[]> {
  const arr = await db.attempts.where('problemId').equals(problemId).sortBy('date')
  arr.reverse()
  return arr
}

/** 取某个题目下所有记录的代码/笔记，键为 attempt id */
export async function getAttemptContentsByProblemId(
  problemId: number
): Promise<Map<number, AttemptContent>> {
  const attemptIds = await db.attempts.where('problemId').equals(problemId).primaryKeys()
  if (attemptIds.length === 0) return new Map()
  const rows = await db.attemptContents.where('id').anyOf(attemptIds).toArray()
  return new Map(rows.map((row) => [row.id, row]))
}

export async function createAttempt(data: AttemptDraft): Promise<number> {
  if (!isValidDateString(data.date)) throw new Error('请填写合法的完成日期')
  return db.transaction('rw', db.attempts, db.attemptContents, async () => {
    const { code, notes, ...meta } = data
    const id = await db.attempts.add({ ...meta, createdAt: new Date() })
    await db.attemptContents.add({ id, code, notes })
    return id
  })
}

export async function updateAttempt(id: number, data: Partial<AttemptDraft>): Promise<void> {
  if (data.date !== undefined && !isValidDateString(data.date)) {
    throw new Error('请填写合法的完成日期')
  }
  await db.transaction('rw', db.attempts, db.attemptContents, async () => {
    const { code, notes, ...meta } = data
    if (Object.keys(meta).length > 0) await db.attempts.update(id, meta)
    if (code !== undefined || notes !== undefined) {
      const existing = await db.attemptContents.get(id)
      await db.attemptContents.put({
        id,
        code: code ?? existing?.code ?? '',
        notes: notes ?? existing?.notes ?? '',
      })
    }
  })
}

export async function deleteAttempt(id: number): Promise<void> {
  await db.transaction(
    'rw',
    db.attempts,
    db.attemptContents,
    db.problems,
    db.problemTags,
    async () => {
      const attempt = await db.attempts.get(id)
      if (!attempt) return

      await db.attemptContents.delete(id)
      await db.attempts.delete(id)
      const remainingAttempts = await db.attempts
        .where('problemId')
        .equals(attempt.problemId)
        .count()

      // 最后一条记录被删除后，题目本身失去意义，连同标签关联一起清理
      if (remainingAttempts === 0) {
        await db.problemTags.where('problemId').equals(attempt.problemId).delete()
        await db.problems.delete(attempt.problemId)
      }
    }
  )
}

export async function getAttempt(id: number): Promise<Attempt | undefined> {
  return db.attempts.get(id)
}

export async function getAttemptContent(id: number): Promise<AttemptContent | undefined> {
  return db.attemptContents.get(id)
}

/** 编辑表单用：把元数据与代码/笔记拼回一个对象 */
export async function getAttemptDraft(id: number): Promise<AttemptDraft | undefined> {
  const [attempt, content] = await Promise.all([db.attempts.get(id), db.attemptContents.get(id)])
  if (!attempt) return undefined
  return {
    problemId: attempt.problemId,
    date: attempt.date,
    status: attempt.status,
    language: attempt.language,
    timeSpentMin: attempt.timeSpentMin,
    code: content?.code ?? '',
    notes: content?.notes ?? '',
  }
}

export async function getAllAttempts(): Promise<Attempt[]> {
  return db.attempts.orderBy('date').reverse().toArray()
}

/* ── Counts ───────────────────────────────────────────── */

export interface DataCounts {
  problems: number
  tags: number
  attempts: number
}

export async function getDataCounts(): Promise<DataCounts> {
  const [problems, tags, attempts] = await Promise.all([
    db.problems.count(),
    db.tags.count(),
    db.attempts.count(),
  ])
  return { problems, tags, attempts }
}

/* ── Backup ───────────────────────────────────────────── */

/**
 * 备份文件里的记录是「代码/笔记内联」的扁平格式，与内部存储（拆表）不同。
 * 保持这个格式是为了向后兼容：旧版本导出的备份能直接导入，
 * 新版本导出的备份也能被旧版本读回。
 */
export type BackupAttempt = Attempt & Pick<AttemptContent, 'code' | 'notes'>

export interface BackupData {
  version: number
  exportedAt: string
  problems: Problem[]
  tags: Tag[]
  problemTags: ProblemTag[]
  attempts: BackupAttempt[]
}

export async function exportAll(): Promise<BackupData> {
  const [problems, tags, problemTags, attempts, contents] = await Promise.all([
    db.problems.toArray(),
    db.tags.toArray(),
    db.problemTags.toArray(),
    db.attempts.toArray(),
    db.attemptContents.toArray(),
  ])
  const contentMap = new Map(contents.map((row) => [row.id, row]))
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    problems,
    tags,
    problemTags,
    attempts: attempts.map((a) =>
      Object.assign({}, a, {
        code: (a.id === undefined ? undefined : contentMap.get(a.id)?.code) ?? '',
        notes: (a.id === undefined ? undefined : contentMap.get(a.id)?.notes) ?? '',
      })
    ),
  }
}

export async function importAll(data: BackupData): Promise<void> {
  // 即使调用方绕过文件解析，也必须在清空数据库前拒绝无法关联内容的记录。
  data.attempts.forEach((attempt, index) => {
    if (!Number.isInteger(attempt.id)) fail(`attempts[${index}].id 必须是整数`)
  })

  await db.transaction(
    'rw',
    db.problems,
    db.tags,
    db.problemTags,
    db.attempts,
    db.attemptContents,
    async () => {
      await db.problems.clear()
      await db.tags.clear()
      await db.problemTags.clear()
      await db.attempts.clear()
      await db.attemptContents.clear()

      if (data.problems.length)
        await db.problems.bulkPut(
          data.problems.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          }))
        )
      if (data.tags.length) await db.tags.bulkPut(data.tags)
      if (data.problemTags.length) await db.problemTags.bulkPut(data.problemTags)

      if (data.attempts.length) {
        const attempts: Attempt[] = []
        const contents: AttemptContent[] = []
        for (const item of data.attempts) {
          const { code, notes, ...meta } = item
          attempts.push({ ...meta, createdAt: new Date(meta.createdAt) })
          if (meta.id !== undefined) contents.push({ id: meta.id, code, notes })
        }
        await db.attempts.bulkPut(attempts)
        if (contents.length) await db.attemptContents.bulkPut(contents)
      }
    }
  )
}

/* ── 备份文件解析与校验 ───────────────────────────────── */

const STATUS_SET = new Set<string>(Object.keys(STATUS_COLORS))
const LANGUAGE_SET = new Set<string>(LANGUAGE_OPTIONS)
const DIFFICULTY_SET = new Set<number>(DIFFICULTIES)
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function fail(message: string): never {
  throw new Error(message)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

function toDate(value: unknown): Date {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return new Date()
}

function readOptionalId(value: unknown, path: string, seen: Set<number>): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value)) fail(`${path} 必须是整数`)
  const id = value as number
  if (seen.has(id)) fail(`${path} 与前面的记录 id 重复（${id}）`)
  seen.add(id)
  return id
}

/**
 * 解析并严格校验备份文件。
 * 结构或取值有任何不合法之处都会抛出带定位信息的 Error，脏数据不会进入数据库；
 * 返回的是规范化后的数据（题号去空白、createdAt 归一为 Date）。
 */
export function parseBackupFile(text: string): BackupData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    fail('文件不是合法的 JSON')
  }
  if (!isPlainObject(raw)) fail('备份文件的最外层必须是一个对象')

  if (typeof raw.version !== 'number') fail('缺少合法的 version 字段')
  for (const key of ['problems', 'tags', 'problemTags', 'attempts'] as const) {
    if (!Array.isArray(raw[key])) fail(`缺少 ${key} 数组`)
  }

  const problemRows = raw.problems as unknown[]
  const tagRows = raw.tags as unknown[]
  const problemTagRows = raw.problemTags as unknown[]
  const attemptRows = raw.attempts as unknown[]

  const problems: Problem[] = []
  const problemIds = new Set<number>()
  problemRows.forEach((item, index) => {
    const path = `problems[${index}]`
    if (!isPlainObject(item)) fail(`${path} 必须是对象`)
    const id = item.id
    if (!Number.isInteger(id)) fail(`${path}.id 必须是整数`)
    if (problemIds.has(id as number)) fail(`${path}.id 与前面的题目重复（${String(id)}）`)
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    if (!title) fail(`${path}.title 必须是非空字符串`)
    if (!DIFFICULTY_SET.has(item.difficulty as number)) {
      fail(`${path}.difficulty 必须是 1-8 之间的整数`)
    }
    const luoguId = typeof item.luoguId === 'string' ? normalizeLuoguId(item.luoguId) : undefined
    // 关联关系由 problemId 决定；保留历史重复题号，避免应用自己的备份无法恢复。
    problemIds.add(id as number)
    problems.push({
      id: id as number,
      title,
      difficulty: item.difficulty as Difficulty,
      luoguId,
      createdAt: toDate(item.createdAt),
    })
  })

  const tags: Tag[] = []
  const tagIds = new Set<number>()
  const tagNames = new Set<string>()
  tagRows.forEach((item, index) => {
    const path = `tags[${index}]`
    if (!isPlainObject(item)) fail(`${path} 必须是对象`)
    const id = item.id
    if (!Number.isInteger(id)) fail(`${path}.id 必须是整数`)
    if (tagIds.has(id as number)) fail(`${path}.id 与前面的标签重复（${String(id)}）`)
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!name) fail(`${path}.name 必须是非空字符串`)
    if (tagNames.has(name)) fail(`${path}.name 与前面的标签重名（${name}）`)
    tagIds.add(id as number)
    tagNames.add(name)
    tags.push({ id: id as number, name })
  })

  const problemTags: ProblemTag[] = []
  const problemTagIds = new Set<number>()
  const problemTagPairs = new Set<string>()
  problemTagRows.forEach((item, index) => {
    const path = `problemTags[${index}]`
    if (!isPlainObject(item)) fail(`${path} 必须是对象`)
    const id = readOptionalId(item.id, `${path}.id`, problemTagIds)
    const problemId = item.problemId
    const tagId = item.tagId
    if (!Number.isInteger(problemId) || !Number.isInteger(tagId)) {
      fail(`${path} 的 problemId / tagId 必须是整数`)
    }
    if (!problemIds.has(problemId as number)) {
      fail(`${path} 引用了不存在的题目 #${String(problemId)}`)
    }
    if (!tagIds.has(tagId as number)) fail(`${path} 引用了不存在的标签 #${String(tagId)}`)
    const pair = `${String(problemId)}:${String(tagId)}`
    if (problemTagPairs.has(pair)) {
      fail(`${path} 与前面的记录重复（题目 #${String(problemId)} + 标签 #${String(tagId)}）`)
    }
    problemTagPairs.add(pair)
    problemTags.push({ id, problemId: problemId as number, tagId: tagId as number })
  })

  const attempts: BackupAttempt[] = []
  const attemptIds = new Set<number>()
  attemptRows.forEach((item, index) => {
    const path = `attempts[${index}]`
    if (!isPlainObject(item)) fail(`${path} 必须是对象`)
    const id = readOptionalId(item.id, `${path}.id`, attemptIds)
    if (id === undefined) fail(`${path}.id 必须是整数`)
    const problemId = item.problemId
    if (!Number.isInteger(problemId)) fail(`${path}.problemId 必须是整数`)
    if (!problemIds.has(problemId as number)) {
      fail(`${path} 引用了不存在的题目 #${String(problemId)}`)
    }
    const date = item.date
    if (!isValidDateString(date)) fail(`${path}.date 必须是合法的 YYYY-MM-DD 日期`)
    const status = item.status
    if (typeof status !== 'string' || !STATUS_SET.has(status)) {
      fail(`${path}.status 不是支持的状态（${String(status)}）`)
    }
    const language = item.language
    if (typeof language !== 'string' || !LANGUAGE_SET.has(language)) {
      fail(`${path}.language 不是支持的语言（${String(language)}）`)
    }
    const timeSpentMin = item.timeSpentMin
    if (typeof timeSpentMin !== 'number' || !Number.isFinite(timeSpentMin) || timeSpentMin < 0) {
      fail(`${path}.timeSpentMin 必须是非负数字`)
    }
    const code = item.code
    if (typeof code !== 'string') fail(`${path}.code 必须是字符串`)
    const notes = item.notes
    if (typeof notes !== 'string') fail(`${path}.notes 必须是字符串`)
    attempts.push({
      id,
      problemId: problemId as number,
      date,
      status: status as Status,
      language: language as Language,
      timeSpentMin,
      code,
      notes,
      createdAt: toDate(item.createdAt),
    })
  })

  return {
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    problems,
    tags,
    problemTags,
    attempts,
  }
}
