import { useId, useRef } from 'react'
import { DIFFICULTIES, getDifficultyStyle } from '@/lib/constants'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  value: Difficulty
  onChange: (difficulty: Difficulty) => void
}

/**
 * 难度选择器。手写 radiogroup 而不用 Radix：八个固定选项、样式完全由难度配色决定，
 * 引入组件库反而要花更多力气覆盖它的默认外观。
 *
 * 遵循 APG 的 radiogroup 交互：整个组只占一个 Tab 停靠点，方向键在选项间移动
 * 焦点并同时改变选中项，首尾环绕。
 */
function DifficultyPicker({ value, onChange }: Props) {
  const darkMode = useStore((s) => s.darkMode)
  const labelId = useId()
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectAt = (index: number, moveFocus: boolean) => {
    onChange(DIFFICULTIES[index])
    if (moveFocus) buttonRefs.current[index]?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent, current: Difficulty) => {
    const index = DIFFICULTIES.indexOf(current)
    const last = DIFFICULTIES.length - 1
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = index === last ? 0 : index + 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = index === 0 ? last : index - 1
    }
    if (nextIndex === null) return
    event.preventDefault()
    selectAt(nextIndex, true)
  }

  return (
    <div className="space-y-2">
      <Label id={labelId}>难度</Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={labelId}>
        {DIFFICULTIES.map((d, index) => {
          const style = getDifficultyStyle(d, darkMode)
          const active = value === d
          return (
            <button
              key={d}
              ref={(el) => {
                // 按 DIFFICULTIES 的下标存，与 selectAt 的取用方式保持一致
                buttonRefs.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={active}
              // 只有选中项留在 Tab 序列里，键盘用户不必连按八次
              tabIndex={active ? 0 : -1}
              onClick={() => selectAt(index, false)}
              onKeyDown={(event) => handleKeyDown(event, d)}
              className={cn(
                'flex min-w-[56px] flex-col items-center rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all',
                active ? 'scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
              )}
              style={{
                backgroundColor: active ? style.background : 'transparent',
                color: style.color,
                borderColor: active ? style.color : 'transparent',
              }}
            >
              <span className="text-lg font-bold">{d}</span>
              <span className="whitespace-nowrap">{style.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DifficultyPicker
