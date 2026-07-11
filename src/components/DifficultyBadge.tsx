import { DIFFICULTY_MAP } from '@/lib/constants'
import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  difficulty: Difficulty
  size?: 'sm' | 'md'
}

function DifficultyBadge({ difficulty, size = 'md' }: Props) {
  const info = DIFFICULTY_MAP[difficulty]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
      style={{
        backgroundColor: info.color + '20',
        color: info.color,
        border: `1px solid ${info.color}40`,
      }}
    >
      {info.label}
    </span>
  )
}

export default DifficultyBadge
