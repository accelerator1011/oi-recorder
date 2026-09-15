import { getDifficultyStyle } from '@/lib/constants'
import { useStore } from '@/store/useStore'
import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  difficulty: Difficulty
  size?: 'sm' | 'md'
}

function DifficultyBadge({ difficulty, size = 'md' }: Props) {
  const darkMode = useStore((s) => s.darkMode)
  const style = getDifficultyStyle(difficulty, darkMode)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
      style={{
        backgroundColor: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {style.label}
    </span>
  )
}

export default DifficultyBadge
