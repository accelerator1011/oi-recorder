import { STATUS_COLORS } from '@/lib/constants'
import type { Status } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  status: Status
  size?: 'sm' | 'md'
}

function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2.5 py-0.5 text-sm',
        STATUS_COLORS[status]
      )}
    >
      {status}
    </span>
  )
}

export default StatusBadge
