export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** 表单里可以选择的提交状态 */
export type SelectableStatus = 'AC' | '部分分' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE'

/**
 * 数据中可能出现的全部状态。除表单可选值外，还包含历史遗留的「进行中」：
 * 该值已从新建选项里移除，但老记录仍可能存有，读取与导入时必须兼容。
 */
export type Status = SelectableStatus | '进行中'

export type Language = 'C++' | 'C' | 'Python' | 'Java' | 'Pascal'

/**
 * '#RRGGBB' 形式的颜色字面量。按位解析颜色的函数（boostSaturation）
 * 依赖这个前提：解析失败即视为常量表被改坏。
 */
export type HexColor = `#${string}`

/**
 * 从数据库读出的行必然带自增主键。
 *
 * 下面几个接口上的 `id?` 只是插入路径的需要（新行还没有 id），
 * 读取路径不该把这份不确定性扩散出去：db.ts 的读取函数用 `WithId`
 * 收窄返回类型，调用方就不必在每个使用点重新怀疑 id 存不存在。
 */
export type WithId<T> = T & { id: number }

export interface Problem {
  id?: number
  luoguId?: string
  title: string
  difficulty: Difficulty
  createdAt: Date
}

export interface Tag {
  id?: number
  name: string
}

export interface ProblemTag {
  id?: number
  problemId: number
  tagId: number
}

/** 做题记录的元数据，不含代码与笔记 */
export interface Attempt {
  id?: number
  problemId: number
  date: string
  status: Status
  language: Language
  timeSpentMin: number
  createdAt: Date
}

/**
 * 代码与笔记单独建表存放，主键即对应 attempt 的 id（一对一）。
 * 拆表的唯一目的是让列表页/首页查询不必把每一条记录的代码都读进内存。
 */
export interface AttemptContent {
  id: number
  code: string
  notes: string
}
