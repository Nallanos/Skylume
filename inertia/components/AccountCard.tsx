import { Card, CardContent, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { BarChart3, Calendar, RefreshCw, Shield, Trash2, Users, AtSign, Hash, MessageCircle } from 'lucide-react'
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
  platform: 'bluesky' | 'twitter' | 'threads'
  username?: string
  profileImageUrl?: string
}

interface AccountCardProps {
  account: Account
  onAccountUpdate?: (updatedAccount: Account) => void
}

const PLATFORM_CONFIG = {
  bluesky: {
    name: 'Bluesky',
    icon: AtSign,
    color: 'bg-blue-500',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:bg-blue-500/5'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Hash,
    color: 'bg-black',
    borderColor: 'border-gray-500/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    hoverColor: 'hover:bg-gray-500/5'
  },
  threads: {
    name: 'Threads',
    icon: MessageCircle,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:bg-purple-500/5'
  }
}

function AccountCard({ account, onAccountUpdate }: AccountCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localAccount, setLocalAccount] = useState(account)

  const platformConfig = PLATFORM_CONFIG[account.platform]
  const PlatformIcon = platformConfig.icon

  // Format metrics for better display
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num
  }

  const handleDelete = async () => {
    if (account.platform === 'bluesky') {
      await router.post('/dashboard/accounts/delete', { id: localAccount.id })
    } else if (account.platform === 'twitter') {
      await router.post(`/auth/twitter/disconnect/${localAccount.id}`)
    } else if (account.platform === 'threads') {
      await router.post(`/auth/threads/disconnect/${localAccount.id}`)
    }
  }

  const refreshStats = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/account/${localAccount.id}/refresh-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.account) {
          // Mettre à jour l'état local
          const updatedAccount = { ...localAccount, ...data.account }
          setLocalAccount(updatedAccount)
          
          // Notifier le composant parent si une callback est fournie
          if (onAccountUpdate) {
            onAccountUpdate(updatedAccount)
          }
          
          console.log('Stats refreshed successfully')
        }
      } else {
        console.error('Failed to refresh stats:', response.statusText)
        // Fallback vers l'ancienne méthode en cas d'erreur
        await router.get(`/account/${localAccount.id}/refresh-stats`)
      }
    } catch (error) {
      console.error('Error refreshing stats:', error)
      // Fallback vers l'ancienne méthode en cas d'erreur
      try {
        await router.get(`/account/${localAccount.id}/refresh-stats`)
      } catch (fallbackError) {
        console.error('Fallback refresh also failed:', fallbackError)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Card className="border-border overflow-hidden relative group bg-card transition-all duration-200">
      <CardContent className="p-2">
        {/* Account avatar and name section */}
        <div className="flex items-center justify-between mb-6 p-4">
          <div className="min-w-0 flex-1 mr-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${platformConfig.color} text-white`}>
                <PlatformIcon className="h-3 w-3" />
              </div>
              <Badge variant="outline" className="text-xs">
                {platformConfig.name}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate text-lg text-foreground">{localAccount.handle}</h3>
              {localAccount.displayName && (
                <span className="text-sm text-muted-foreground truncate">
                  ({localAccount.displayName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {localAccount.isRateLimited ? (
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
              className={`rounded-full transition-colors ${platformConfig.hoverColor}`}
              aria-label="Refresh statistics"
              disabled={isRefreshing}
              onClick={refreshStats}
            >
              <RefreshCw
                className={`h-12 w-12 ${platformConfig.textColor} transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Rate Limited Warning */}
        {localAccount.isRateLimited && (
          <p className="text-xs text-destructive mb-4 px-1">
            Rate limited, our application can no longer interact with your {platformConfig.name} account.
            {account.platform === 'bluesky' && (
              <>
                {' '}For more information, check
                <a
                  href="https://docs.bsky.app/docs/advanced-guides/rate-limits"
                  target="_blank"
                  rel="noopener"
                  className="underline ml-1"
                >
                  the documentation
                </a>
                .
              </>
            )}
          </p>
        )}

        {/* Statistics section */}
        <div className="grid grid-cols-3 gap-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-lg p-4 mb-2">
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Followers
            </span>
            <span className="font-bold text-lg text-foreground">
              {formatNumber(localAccount.followersCount || 0)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center border-x border-border/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Posts
            </span>
            <span className="font-bold text-lg text-foreground">
              {formatNumber(localAccount.postsCount || 0)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Engagement
            </span>
            <span className="font-bold text-lg text-foreground">
              {localAccount.engagementRate || '0%'}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Buttons section - Only show for Bluesky accounts */}
      <CardFooter className="pt-3 pb-4 flex justify-between items-center border-t border-border/20">
        {account.platform === 'bluesky' ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 ${platformConfig.borderColor} ${platformConfig.textColor} ${platformConfig.hoverColor} hover:border-opacity-50`}
              asChild
            >
              <a href={`/analytics/${localAccount.id}/`}>
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                Stats
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 ${platformConfig.borderColor} ${platformConfig.textColor} ${platformConfig.hoverColor} hover:border-opacity-50`}
              asChild
            >
              <a href={`/accounts/${localAccount.id}/follower-tracker`}>
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Tracker
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 ${platformConfig.borderColor} ${platformConfig.textColor} ${platformConfig.hoverColor} hover:border-opacity-50`}
              asChild
            >
              <a href={`/add/schedule?account_id=${localAccount.id}&platform=${account.platform}`}>
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Schedule
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}

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
                Are you sure you want to delete the @{localAccount.handle} account? This action is
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
