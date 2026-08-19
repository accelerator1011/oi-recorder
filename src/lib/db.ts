import Dexie, { type Table } from 'dexie'
import type { Attempt, Problem, ProblemTag, Tag } from './types'

class OIDatabase extends Dexie {
  problems!: Table<Problem>
  tags!: Table<Tag>
  problemTags!: Table<ProblemTag>
  attempts!: Table<Attempt>

  constructor() {
    super('OiRecorderDB')
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

export const db = new OIDatabase()

/* ── Problem CRUD ─────────────────────────────────────── */

export async function getAllProblems(): Promise<Problem[]> {
  return db.problems.toArray()
}

export async function getProblemByLuoguId(luoguId: string): Promise<Problem | undefined> {
  return db.problems.where('luoguId').equals(luoguId).first()
}

export async function upsertProblem(
  data: Omit<Problem, 'id' | 'createdAt'>,
  id?: number
): Promise<number> {
  if (id !== undefined) {
    const existing = await db.problems.get(id)
    if (existing) {
      await db.problems.put({
        ...existing,
        luoguId: data.luoguId,
        title: data.title,
        difficulty: data.difficulty,
      })
      return id
    }
  }
  if (data.luoguId) {
    const existing = await db.problems.where('luoguId').equals(data.luoguId).first()
    if (existing) {
      return existing.id!
    }
  }
  return db.problems.put({
    ...data,
    createdAt: new Date(),
  } as Problem)
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
  const existing = await db.tags.where('name').equals(trimmed).first()
  if (existing) return existing.id!
  return db.tags.put({ name: trimmed })
}

export async function updateTag(id: number, name: string): Promise<void> {
  await db.tags.update(id, { name: name.trim() })
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
  await db.transaction('rw', db.problemTags, async () => {
    await db.problemTags.where('problemId').equals(problemId).delete()
    const rows = tagIds.map((tagId) => ({ problemId, tagId }))
    if (rows.length > 0) {
      await db.problemTags.bulkAdd(rows)
    }
  })
}

/* ── Attempt CRUD ─────────────────────────────────────── */

export async function getAttemptsByProblemId(problemId: number): Promise<Attempt[]> {
  const arr = await db.attempts.where('problemId').equals(problemId).sortBy('date')
  arr.reverse()
  return arr
}

export async function createAttempt(data: Omit<Attempt, 'id' | 'createdAt'>): Promise<number> {
  return db.attempts.put({
    ...data,
    createdAt: new Date(),
  } as Attempt)
}

export async function updateAttempt(
  id: number,
  data: Partial<Omit<Attempt, 'id' | 'createdAt'>>
): Promise<void> {
  await db.attempts.update(id, data)
}

export async function deleteAttempt(id: number): Promise<void> {
  await db.transaction('rw', db.attempts, db.problems, db.problemTags, async () => {
    const attempt = await db.attempts.get(id)
    if (!attempt) return

    await db.attempts.delete(id)
    const remainingAttempts = await db.attempts.where('problemId').equals(attempt.problemId).count()

    if (remainingAttempts === 0) {
      await db.problemTags.where('problemId').equals(attempt.problemId).delete()
      await db.problems.delete(attempt.problemId)
    }
  })
}

export async function getAttempt(id: number): Promise<Attempt | undefined> {
  return db.attempts.get(id)
}

export async function getAllAttempts(): Promise<Attempt[]> {
  return db.attempts.orderBy('date').reverse().toArray()
}

/* ── Backup ───────────────────────────────────────────── */

export interface BackupData {
  version: number
  exportedAt: string
  problems: Problem[]
  tags: Tag[]
  problemTags: ProblemTag[]
  attempts: Attempt[]
}

export async function exportAll(): Promise<BackupData> {
  const [problems, tags, problemTags, attempts] = await Promise.all([
    db.problems.toArray(),
    db.tags.toArray(),
    db.problemTags.toArray(),
    db.attempts.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    problems,
    tags,
    problemTags,
    attempts,
  }
}

export async function importAll(data: BackupData): Promise<void> {
  await db.transaction('rw', db.problems, db.tags, db.problemTags, db.attempts, async () => {
    await db.problems.clear()
    await db.tags.clear()
    await db.problemTags.clear()
    await db.attempts.clear()

    if (data.problems.length)
      await db.problems.bulkPut(
        data.problems.map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }))
      )
    if (data.tags.length) await db.tags.bulkPut(data.tags)
    if (data.problemTags.length) await db.problemTags.bulkPut(data.problemTags)
    if (data.attempts.length)
      await db.attempts.bulkPut(
        data.attempts.map((a) => ({
          ...a,
          createdAt: new Date(a.createdAt),
        }))
      )
  })
}
