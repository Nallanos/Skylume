import { Button } from '../ui/button'
import { Plus, Lock, Calendar as CalendarIcon } from 'lucide-react'
import StreakDisplay from '../StreakDisplay'
import type { User, WeeklyStats } from '../../types/schedule'

interface ScheduleHeaderProps {
  user: User
  weeklyStats: WeeklyStats
  isFreeLimitReached: boolean
  onSchedulePost: () => void
  onCustomTimes: () => void
}

export const ScheduleHeader = ({
  user,
  weeklyStats,
  isFreeLimitReached,
  onSchedulePost,
  onCustomTimes
}: ScheduleHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Schedule Queue</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-muted-foreground">
            {weeklyStats.total > 0
              ? `${weeklyStats.total} post${weeklyStats.total > 1 ? 's' : ''} in queue${weeklyStats.remaining.length > 0 ? ` (${weeklyStats.visible} this week)` : ''}`
              : 'No posts scheduled'}
          </p>

          {user.currentStreak !== undefined && user.longestStreak !== undefined && user.streakStatus && (
            <StreakDisplay
              currentStreak={user.currentStreak}
              longestStreak={user.longestStreak}
              streakStatus={user.streakStatus}
              className="ml-2"
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isFreeLimitReached && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg text-sm font-medium">
            <Lock className="h-4 w-4" />
            Free limit reached ({weeklyStats.total}/7)
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onCustomTimes}
          className="h-8 px-3"
          title="Custom posting times"
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>

        <Button
          size="default"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isFreeLimitReached}
          onClick={onSchedulePost}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Post
        </Button>
      </div>
    </div>
  )
}
