import { memo, useMemo, useCallback } from 'react'
import { Button } from '../ui/button'
import { Edit, Trash } from 'lucide-react'
import BlueskyAvatar from '../BlueskyAvatar'
import type { Scheduling } from '../../types/schedule'

interface ScheduledPostItemProps {
  post: Scheduling
  onEdit: (post: Scheduling) => void
  onDelete: (id: number) => void
}

export const ScheduledPostItem = memo(({
  post,
  onEdit,
  onDelete
}: ScheduledPostItemProps) => {
  const postTime = useMemo(() =>
    new Date(post.scheduleTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }), [post.scheduleTime]
  )

  const truncatedMessage = useMemo(() =>
    post.message.length > 60
      ? `${post.message.substring(0, 60)}...`
      : post.message
    , [post.message])

  const handleEdit = useCallback(() => onEdit(post), [onEdit, post])
  const handleDelete = useCallback(() => onDelete(post.id), [onDelete, post.id])

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
        {postTime}
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <BlueskyAvatar
          handle={post.account?.handle || ''}
          displayName={post.account?.displayName}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
            {truncatedMessage}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{post.account?.handle || 'unknown'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
})

ScheduledPostItem.displayName = 'ScheduledPostItem'
