import { Button } from './ui/button'
import { UserPlus, UserMinus } from 'lucide-react'

interface BatchActionsProps {
  selectedCount: number
  isLoading: boolean
  followableCount?: number
  unfollowableCount?: number
  onBatchFollow: () => void
  onBatchUnfollow: () => void
  onClearSelection: () => void
}

export default function BatchActions({
  selectedCount,
  isLoading,
  followableCount = 0,
  unfollowableCount = 0,
  onBatchFollow,
  onBatchUnfollow,
  onClearSelection,
}: BatchActionsProps) {
  if (selectedCount === 0) {
    return null
  }

  const estimatedTime = Math.round(selectedCount * 0.5) // 0.5s per user
  const timeStr =
    estimatedTime < 60
      ? `${estimatedTime}s`
      : `${Math.floor(estimatedTime / 60)}m ${estimatedTime % 60}s`

  return (
    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Batch Actions</h3>
          <p className="text-xs text-muted-foreground">
            {selectedCount} users selected • Est. time: ~{timeStr}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-xs">
          Clear
        </Button>
      </div>

      <div className="flex gap-2">
        {followableCount > 0 && (
          <Button
            onClick={onBatchFollow}
            disabled={isLoading}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Follow Back ({followableCount})
          </Button>
        )}

        {unfollowableCount > 0 && (
          <Button
            onClick={onBatchUnfollow}
            disabled={isLoading}
            variant="destructive"
            size="sm"
            className="flex-1"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Unfollow ({unfollowableCount})
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center bg-background/50 rounded p-2">
        💡 Jobs run in background - you can continue using the app!
      </div>
    </div>
  )
}
