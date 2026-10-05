import { DIFFICULTIES, getDifficultyStyle } from '@/lib/constants'
import { useStore } from '@/store/useStore'
import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  value: Difficulty
  onChange: (difficulty: Difficulty) => void
  labelId: string
}

/**
 * 难度选择器。手写 radiogroup 而不用 Radix：八个固定选项、样式完全由难度配色决定，
 * 引入组件库反而要花更多力气覆盖它的默认外观。
 */
function DifficultyPicker({ value, onChange, labelId }: Props) {
  const darkMode = useStore((s) => s.darkMode)

  // role="radiogroup" 的既定交互：方向键在选项间移动，首尾环绕
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
    onChange(DIFFICULTIES[nextIndex])
  }

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={labelId}>
      {DIFFICULTIES.map((d) => {
        const style = getDifficultyStyle(d, darkMode)
        const active = value === d
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
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
  )
}

export default DifficultyPicker
