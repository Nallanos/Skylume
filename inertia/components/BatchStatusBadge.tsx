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

interface BatchStatusBadgeProps {
  progress: BatchProgressData
}

export default function BatchStatusBadge({ progress }: BatchStatusBadgeProps) {
  if (progress.status !== 'running') {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-sm">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      {progress.action === 'follow' ? 'Following' : 'Unfollowing'} in background (
      {progress.completed}/{progress.total})
    </div>
  )
}
