const assert = require('node:assert/strict')
const { test } = require('node:test')
const { loadSource } = require('./helpers.cjs')

const { boostSaturation, formatMinutes, getErrorMessage, toLocalDateString } =
  loadSource('src/lib/utils.ts')

test('日期按本地时区拼成 YYYY-MM-DD，不受运行时区影响', () => {
  // 用本地构造函数造时间，避免 new Date('2026-10-05') 那种按 UTC 解析的写法
  assert.equal(toLocalDateString(new Date(2026, 9, 5)), '2026-10-05')
  assert.equal(toLocalDateString(new Date(2026, 0, 1)), '2026-01-01')
  // 月与日补零到两位
  assert.equal(toLocalDateString(new Date(2026, 11, 31)), '2026-12-31')
})

test('耗时的展示文案三处共用同一个函数', () => {
  assert.equal(formatMinutes(0), '0 min')
  assert.equal(formatMinutes(42), '42 min')
  assert.equal(formatMinutes(125), '125 min')
})

test('异常文案兜底为「未知错误」', () => {
  assert.equal(getErrorMessage(new Error('磁盘满了')), '磁盘满了')
  assert.equal(getErrorMessage('一个字符串'), '未知错误')
  assert.equal(getErrorMessage(undefined), '未知错误')
})

test('boostSaturation 输出合法色值，且同输入同结果', () => {
  for (const hex of ['#fe4c61', '#ffc116', '#00bfa5', '#1e3a8a', '#52c41a']) {
    const boosted = boostSaturation(hex)
    assert.match(boosted, /^#[0-9a-f]{6}$/, `${hex} 的结果必须是 6 位 hex`)
    assert.equal(boosted, boostSaturation(hex), '同一个输入必须得到同一个输出')
  }
})

test('boostSaturation 压低 HSL 明度、抬高 HSL 饱和度，输出不溢出色域', () => {
  // 独立按 8 位通道还原 HSL 的 L 与 S。注意别拿「最大最小通道之差」当饱和度：
  // 那是色度跨度，对已经很暗的颜色（如 #1e3a8a）会在压暗的同时反而收窄，
  // 但 HSL 饱和度本身确实上升了。
  const hslOf = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2 / 255
    const chroma = (max - min) / 255
    return { l, s: chroma / (1 - Math.abs(2 * l - 1) || 1) }
  }

  for (const hex of ['#ffc116', '#ff8f98', '#8ad964', '#4fd6c2', '#9fbcf2', '#1e3a8a']) {
    const before = hslOf(hex)
    const after = hslOf(boostSaturation(hex))
    assert.ok(after.l < before.l, `${hex} 提饱和后 HSL 明度应下降`)
    // 深色主题的浅色系 S 本就顶到 100%，此时只能持平而不是上升——
    // 真正让填充色不发灰的是那 0.06 的明度下调
    assert.ok(after.s >= before.s, `${hex} 提饱和后 HSL 饱和度不应下降`)
  }
  // 尚未顶到 100% 的颜色应当真的被推上去
  assert.ok(hslOf(boostSaturation('#9fbcf2')).s > hslOf('#9fbcf2').s)
  // 已经是纯白/纯黑时无论怎么调都必须留在合法范围内
  assert.match(boostSaturation('#ffffff'), /^#[0-9a-f]{6}$/)
  assert.match(boostSaturation('#000000'), /^#[0-9a-f]{6}$/)
})

test('boostSaturation 遇到非法色值直接报错，而不是静默退回原色', () => {
  // 唯一的色值来源是 DIFFICULTY_MAP 的 6 位字面量；解析不了说明常量表坏了
  assert.throws(() => boostSaturation('#fff'), /无法解析的颜色/)
  assert.throws(() => boostSaturation('rebeccapurple'), /无法解析的颜色/)
})
