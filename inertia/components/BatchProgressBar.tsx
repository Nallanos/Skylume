interface BatchProgressData {
  action: 'follow' | 'unfollow' | null
  jobId: string | null
  total: number
  completed: number
  successful: number
  failed: number
  status: 'running' | 'completed' | 'failed' | null
  currentDid?: string
  startTime?: number
}

interface BatchProgressBarProps {
  progress: BatchProgressData
  onDismiss: () => void
  onCancel?: () => void
  accountId?: string
}

export default function BatchProgressBar({
  progress,
  onDismiss,
  onCancel,
  accountId,
}: BatchProgressBarProps) {
  if (progress.status !== 'running' || !progress.action) {
    return null
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }

  const getTimeEstimation = () => {
    if (!progress.startTime || progress.completed === 0) return null

    const elapsed = (Date.now() - progress.startTime) / 1000
    const remaining = progress.total - progress.completed
    const avgTimePerUser = elapsed / progress.completed
    const estimatedTimeLeft = remaining * avgTimePerUser

    return { elapsed, estimatedTimeLeft, avgTimePerUser }
  }

  const timeInfo = getTimeEstimation()
  const progressPercent = Math.round((progress.completed / progress.total) * 100)

  const handleCancel = async () => {
    if (!onCancel || !accountId || !progress.jobId) return

    try {
      const response = await fetch(
        `/accounts/${accountId}/follower-tracker/cancel/${progress.action}/${progress.jobId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        onCancel()
      } else {
        console.error('Failed to cancel job')
      }
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-background border-2 border-primary/20 shadow-xl rounded-lg p-4 transition-all duration-300 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          {' '}
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <h4 className="text-sm font-semibold">
              {progress.action === 'follow' ? '➕ Following' : '➖ Unfollowing'} in background
            </h4>
          </div>
          <div className="flex items-center gap-1">
            {onCancel && (
              <button
                onClick={handleCancel}
                className="text-red-500 hover:text-red-700 text-xs p-1 hover:bg-red-50 rounded"
                title="Cancel job"
              >
                🛑
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground text-sm p-1 hover:bg-muted rounded"
              title="Minimize (job continues running)"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.completed}/{progress.total} processed
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <span className="text-green-500">✅</span> {progress.successful} successful
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <span className="text-red-500">❌</span> {progress.failed} failed
            </span>
          </div>

          {/* Time estimation */}
          {timeInfo && (
            <div className="text-xs text-muted-foreground">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>⏱️ Elapsed: {formatTime(timeInfo.elapsed)}</span>
                  <span>ETA: {formatTime(timeInfo.estimatedTimeLeft)}</span>
                </div>
                <div className="text-center">
                  <span>~{formatTime(timeInfo.avgTimePerUser)} per user</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded p-2">
            💡 Safe to continue using the app - this runs in the background!
          </div>
        </div>
      </div>
    </div>
  )
}
