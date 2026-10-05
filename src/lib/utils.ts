import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HexColor } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 从未知类型的异常里取出可展示的文案 */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '未知错误'
}

/** 耗时的展示文案。列表、详情、首页三处共用，避免各自拼出 "30min" / "30 min" 两种写法 */
export function formatMinutes(minutes: number): string {
  return `${String(minutes)} min`
}

/** '#RRGGBB' → [h, s, l]，三个分量均为 0..1 */
function hexToHsl(hex: HexColor): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  // 唯一的色值来源是 DIFFICULTY_MAP，全是 6 位 hex 字面量。
  // 走到这里说明常量表被改坏了，宁可当场报错，也不要静默退回原色画出一块错的填充。
  if (!match) throw new Error(`无法解析的颜色：${hex}`)

  const int = parseInt(match[1], 16)
  const r = ((int >> 16) & 0xff) / 255
  const g = ((int >> 8) & 0xff) / 255
  const b = (int & 0xff) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min

  if (delta === 0) return [0, 0, l]

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h: number
  if (max === r) {
    h = (g - b) / delta + (g < b ? 6 : 0)
  } else if (max === g) {
    h = (b - r) / delta + 2
  } else {
    h = (r - g) / delta + 4
  }
  return [h / 6, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const byte = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(channel(h + 1 / 3))}${byte(channel(h))}${byte(channel(h - 1 / 3))}`
}

/**
 * 让颜色「更实一点」：在 HSL 空间里放大饱和度，同时略微压低明度。
 *
 * 只抬 S 是不够的 —— 深色主题下的难度配色是偏粉彩的浅色，S 往往已经顶到 100%，
 * 真正让填充色显得发灰的是偏高的 L。压一点 L 才能让色相变纯，而整体明度下降有限，
 * 在深色背景上依旧清晰。
 *
 * 仅用于图表填充；文字/描边类配色仍走原始色值，避免影响可读性。
 */
export function boostSaturation(hex: HexColor, saturationFactor = 1.2, lightnessDelta = -0.06) {
  const [h, s, l] = hexToHsl(hex)
  const nextS = Math.min(1, s * saturationFactor)
  const nextL = Math.min(1, Math.max(0, l + lightnessDelta))
  return hslToHex(h, nextS, nextL)
}
