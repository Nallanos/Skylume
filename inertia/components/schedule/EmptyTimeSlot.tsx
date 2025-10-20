import { memo, useCallback } from 'react'
import { Plus } from 'lucide-react'

interface EmptyTimeSlotProps {
  timeSlot: string
  date: string
  isFreeLimitReached: boolean
  onSlotClick: (date: string, timeSlot: string) => void
}

export const EmptyTimeSlot = memo(({
  timeSlot,
  date,
  isFreeLimitReached,
  onSlotClick
}: EmptyTimeSlotProps) => {
  const handleClick = useCallback(() => {
    if (!isFreeLimitReached) {
      onSlotClick(date, timeSlot)
    }
  }, [onSlotClick, date, timeSlot, isFreeLimitReached])

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
        {timeSlot}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {isFreeLimitReached ? 'Free limit reached' : 'New'}
        </span>
      </div>
    </div>
  )
})

EmptyTimeSlot.displayName = 'EmptyTimeSlot'
