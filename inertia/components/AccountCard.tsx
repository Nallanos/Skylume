import { Card, CardContent, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { BarChart3, Calendar, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

interface Account {
  id: number
  handle: string
  displayName?: string
  followersCount: number
  postsCount: number
  engagementRate?: string
  isRateLimited?: boolean
}

interface AccountCardProps {
  account: Account
}

function AccountCard({ account }: AccountCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Format metrics for better display
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num
  }

  const handleDelete = async () => {
    await router.post('/dashboard/accounts/delete', { id: account.id })
  }

  const refreshStats = async () => {
    setIsRefreshing(true)
    try {
      await router.get(`/account/${account.id}/refresh-stats`)
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
    // The page will reload after the request completes
  }

  return (
    <Card className="card-hover border-border overflow-hidden relative group bg-card hover:shadow-md transition-all duration-200">
      <CardContent className="pt-6 pb-2">
        {/* Account avatar and name section */}
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0 flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate text-lg text-foreground">{account.handle}</h3>
              {account.displayName && (
                <span className="text-sm text-muted-foreground truncate">
                  ({account.displayName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {account.isRateLimited ? (
                <Badge variant="destructive" className="text-xs px-2 py-1 font-medium">
                  <Shield className="h-3 w-3 mr-1.5" />
                  Rate Limited
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-1 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-medium"
                >
                  <Shield className="h-3 w-3 mr-1.5" />
                  Active
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
              aria-label="Refresh statistics"
              disabled={isRefreshing}
              onClick={refreshStats}
            >
              <RefreshCw
                className={`h-6 w-6 text-blue-600 dark:text-blue-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Rate Limited Warning */}
        {account.isRateLimited && (
          <p className="text-xs text-destructive mb-4 px-1">
            Rate limited, our application can no longer interact with your Bluesky account. For more
            information, check
            <a
              href="https://docs.bsky.app/docs/advanced-guides/rate-limits"
              target="_blank"
              rel="noopener"
              className="underline ml-1"
            >
              the documentation
            </a>
            .
          </p>
        )}

        {/* Statistics section */}
        <div className="grid grid-cols-3 gap-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-lg p-4 mb-2">
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Followers
            </span>
            <span className="font-bold text-lg text-foreground">
              {formatNumber(account.followersCount || 0)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-border/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Posts
            </span>
            <span className="font-bold text-lg text-foreground">
              {formatNumber(account.postsCount || 0)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Engagement
            </span>
            <span className="font-bold text-lg text-foreground">
              {account.engagementRate || '0%'}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Buttons section */}
      <CardFooter className="pt-3 pb-4 flex justify-between items-center border-t border-border/20">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-500/30"
            asChild
          >
            <a href={`/analytics/${account.id}/`}>
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Stats
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-500/30"
            asChild
          >
            <a href={`/add/schedule?account_id=${account.id}`}>
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-600 dark:text-gray-400" />
              Schedule
            </a>
          </Button>
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the @{account.handle} account? This action is
                irreversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

export default AccountCard
