import { Head, Link, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import {
  Users,
  X,
  ArrowLeftRight,
  Heart,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Checkbox } from '../components/ui/checkbox'
import { toast } from 'sonner'
import BatchProgressBar from '../components/BatchProgressBar'
import BatchStatusBadge from '../components/BatchStatusBadge'
import BatchActions from '../components/BatchActions'
import RelationshipEvolutionChart from '../components/RelationshipEvolutionChart'
import FollowerTrackerSkeleton from '../components/FollowerTrackerSkeleton'

// Utility function to format numbers
const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '0'
  if (num === 0) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Composant mémorisé pour un follower individuel
const FollowerItem = memo(({
  follower,
  isSelected,
  isHovered,
  statusConfig,
  onSelectFollower,
  onMouseEnter,
  onMouseLeave,
  onBatchAction
}: {
  follower: FollowerWithStatus
  isSelected: boolean
  isHovered: boolean
  statusConfig: any
  onSelectFollower: (did: string) => void
  onMouseEnter: (did: string) => void
  onMouseLeave: () => void
  onBatchAction: (action: 'follow' | 'unfollow', dids: string[]) => void
}) => {
  const config = statusConfig[follower.status]
  
  const handleSelect = useCallback(() => {
    onSelectFollower(follower.did)
  }, [onSelectFollower, follower.did])

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(follower.did)
  }, [onMouseEnter, follower.did])

  const handleFollowAction = useCallback((action: 'follow' | 'unfollow') => {
    onBatchAction(action, [follower.did])
  }, [onBatchAction, follower.did])

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-sm ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleSelect}
      />

      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {follower.avatar ? (
            <img
              src={follower.avatar}
              alt={follower.handle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">
            {follower.displayName || follower.handle}
          </h3>
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-1">
          <a
            href={`https://bsky.app/profile/${follower.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
          >
            @{follower.handle}
          </a>
        </p>

        {follower.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {follower.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isHovered && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `https://bsky.app/profile/${follower.handle}`,
                    '_blank'
                  )
                }
              >
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              {follower.status === 'i_follow_only' && (
                <DropdownMenuItem
                  onClick={() => handleFollowAction('unfollow')}
                  className="text-destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfollow
                </DropdownMenuItem>
              )}
              {follower.status === 'they_follow_only' && (
                <DropdownMenuItem
                  onClick={() => handleFollowAction('follow')}
                  className="text-green-600"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow Back
                </DropdownMenuItem>
              )}
              {follower.status === 'mutual' && (
                <DropdownMenuItem
                  onClick={() => handleFollowAction('unfollow')}
                  className="text-destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfollow
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
})

interface FollowerWithStatus {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  description?: string
  labels?: string[]
  status: 'i_follow_only' | 'they_follow_only' | 'mutual'
  followersCount?: number
  followingCount?: number
  viewer?: any
}

interface Account {
  id: string
  handle: string
  did: string
  followersCount: number
}

interface FollowerTrackerProps {
  followers: FollowerWithStatus[]
  account: Account | null
  relationshipCounts?: {
    all: number
    mutual: number
    they_follow_only: number
    i_follow_only: number
  } | null
  relationshipHistory?: {
    date: string
    mutual: number
    i_follow_only: number
    they_follow_only: number
  }[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
    loadedAll?: boolean
  } | null
  isLoading?: boolean
  error?: string
}

const FollowerTracker = memo(function FollowerTracker({
  followers: initialFollowers,
  account,
  relationshipCounts: initialRelationshipCounts,
  relationshipHistory: initialRelationshipHistory,
  pagination: initialPagination,
  isLoading: initialLoading = false,
  error,
}: FollowerTrackerProps) {
  // Data state - using props directly since we don't do automatic loading
  const [followers] = useState<FollowerWithStatus[]>(initialFollowers)
  const [relationshipCounts] = useState(initialRelationshipCounts)
  const [relationshipHistory] = useState(initialRelationshipHistory || [])
  const [pagination] = useState(initialPagination)
  const [dataLoading] = useState(initialLoading)
  
  // UI state  
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)
  const [filters, setFilters] = useState<{
    status: string[]
    labels: string[]
    search: string
  }>({
    status: [],
    labels: [],
    search: '',
  })
  const [loadingAll, setLoadingAll] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    action: 'follow' | 'unfollow' | null
    jobId: string | null
    total: number
    completed: number
    successful: number
    failed: number
    status: 'running' | 'completed' | 'failed' | null
    currentDid?: string
    startTime?: number
  }>({ action: null, jobId: null, total: 0, completed: 0, successful: 0, failed: 0, status: null })
  const [refreshingCache, setRefreshingCache] = useState(false)
  const [virtualStart] = useState(0)
  const [virtualEnd, setVirtualEnd] = useState(50) // Initial render window
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCheckedActiveJobs = useRef(false)
  const batchProgressRef = useRef(batchProgress)

  // No automatic data loading - only load when user explicitly requests it
  // Removed the useEffect that automatically loaded data on mount

  // Check if all data is loaded
  const allDataLoaded = pagination?.loadedAll || false

  // Memoized filtering and searching for better performance
  const filteredFollowers = useMemo(() => {
    let filtered = followers

    // Apply status filters (can be multiple)
    if (filters.status.length > 0) {
      filtered = filtered.filter((follower) => filters.status.includes(follower.status))
    }

    // Apply label filters (can be multiple)
    if (filters.labels.length > 0) {
      filtered = filtered.filter((follower) => 
        filters.labels.some((label: string) => follower.labels?.includes(label))
      )
    }

    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (follower) =>
          follower.handle.toLowerCase().includes(searchLower) ||
          follower.displayName?.toLowerCase().includes(searchLower) ||
          follower.description?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [followers, filters])

  // Virtual scrolling - only render visible items
  const virtualizedFollowers = useMemo(() => {
    return filteredFollowers.slice(virtualStart, virtualEnd)
  }, [filteredFollowers, virtualStart, virtualEnd])

  // Load more when scrolling near bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200

      if (isNearBottom && virtualEnd < filteredFollowers.length) {
        setVirtualEnd((prev) => Math.min(prev + 50, filteredFollowers.length))
      }
    },
    [filteredFollowers.length, virtualEnd]
  )

  // Get unique labels from all followers - mémorisé pour éviter les recalculs
  const allLabels = useMemo(() => 
    Array.from(
      new Set(
        followers.flatMap((f) => f.labels || []).filter((label) => label && label.trim() !== '')
      )
    ).sort(),
    [followers]
  )

  // Status configurations
  const statusConfig = {
    i_follow_only: {
      label: "I follow them, they don't follow back",
      icon: X,
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      emoji: '⛔',
    },
    they_follow_only: {
      label: "They follow me, I don't follow them",
      icon: ArrowLeftRight,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      emoji: '🔄',
    },
    mutual: {
      label: 'Mutual follow',
      icon: Heart,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      emoji: '🤝',
    },
  }

  // Filter management functions
  const toggleStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status) 
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }))
  }, [])

  const toggleLabelFilter = useCallback((label: string) => {
    setFilters(prev => ({
      ...prev,
      labels: prev.labels.includes(label) 
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label]
    }))
  }, [])

  const updateSearchFilter = useCallback((search: string) => {
    setFilters(prev => ({
      ...prev,
      search
    }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({
      status: [],
      labels: [],
      search: '',
    })
  }, [])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.labels.length > 0) count++
    if (filters.search.trim()) count++
    return count
  }, [filters])

  const handleLoadAll = useCallback(() => {
    setLoadingAll(true)
    toast.info('Loading all followers... This may take a moment for large accounts.', {
      duration: 3000,
    })

    // Use the dedicated load-all endpoint instead of adding parameters
    router.get(
      `/accounts/${account?.id}/follower-tracker/load-all`,
      {},
      {
        onFinish: () => {
          setLoadingAll(false)
          const totalCount = relationshipCounts?.all || followers.length
          toast.success(
            `🎉 All ${totalCount} followers loaded! You can now use "Select All" for true bulk operations.`,
            {
              duration: 5000,
            }
          )
        },
        onError: () => {
          setLoadingAll(false)
          toast.error('Failed to load all followers. Please try again.', {
            duration: 4000,
          })
        },
      }
    )
  }, [account?.id, relationshipCounts?.all, followers.length])

  const handleSelectAll = useCallback(() => {
    const currentFollowers = filteredFollowers
    if (selectedFollowers.size === currentFollowers.length) {
      setSelectedFollowers(new Set())
    } else {
      setSelectedFollowers(new Set(currentFollowers.map((f) => f.did)))
    }
  }, [filteredFollowers, selectedFollowers.size])

  const handleSelectFollower = useCallback((did: string) => {
    const newSelected = new Set(selectedFollowers)
    if (newSelected.has(did)) {
      newSelected.delete(did)
    } else {
      newSelected.add(did)
    }
    setSelectedFollowers(newSelected)
  }, [selectedFollowers])

  const handleBatchAction = useCallback(async (action: 'follow' | 'unfollow') => {
    if (selectedFollowers.size === 0) {
      toast.error('Please select users first')
      return
    }

    // Filtrer les utilisateurs selon l'action demandée
    const validUserDids = Array.from(selectedFollowers).filter((did) => {
      const follower = filteredFollowers.find((f) => f.did === did)
      if (!follower) return false

      if (action === 'follow') {
        // On peut seulement follow ceux qui ne nous suivent que (they_follow_only)
        return follower.status === 'they_follow_only'
      } else {
        // On peut unfollow ceux qu'on suit (i_follow_only ou mutual)
        return follower.status === 'i_follow_only' || follower.status === 'mutual'
      }
    })

    if (validUserDids.length === 0) {
      const actionText = action === 'follow' ? 'follow back' : 'unfollow'
      toast.error(`No valid users to ${actionText} in current selection`)
      return
    }

    setBatchLoading(true)

    const selectedCount = validUserDids.length
    const actionText = action === 'follow' ? 'following' : 'unfollowing'

    toast.info(`Starting ${actionText} process for ${selectedCount} users...`)

    try {
      const response = await fetch(`/accounts/${account?.id}/follower-tracker/batch-${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({
          userDids: validUserDids,
        }),
      })

      const result = await response.json()

      if (result.success && result.jobId) {
        setBatchProgress({
          action,
          jobId: result.jobId,
          total: selectedCount,
          completed: 0,
          successful: 0,
          failed: 0,
          status: 'running',
          startTime: Date.now(),
        })

        toast.success(
          `🚀 ${actionText} job started! Processing ${selectedCount} users in background (⚡ ~0.5s per user). You can continue using the app.`,
          {
            duration: 5000,
          }
        )
        setSelectedFollowers(new Set())

        // Start polling for progress
        startProgressPolling(result.jobId, action)
      } else {
        toast.error(`Failed to start ${action} job: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Batch ${action} error:`, error)
      toast.error(`Failed to start ${action} job. Please try again.`)
    } finally {
      setBatchLoading(false)
    }
  }, [selectedFollowers, filteredFollowers, account?.id])

  // Fonction pour gérer les actions batch depuis FollowerItem
  const handleSingleAction = useCallback((action: 'follow' | 'unfollow', dids: string[]) => {
    setSelectedFollowers(new Set(dids))
    handleBatchAction(action)
  }, [handleBatchAction])

  // Progress polling function
  const startProgressPolling = useCallback(
    (jobId: string, action: 'follow' | 'unfollow') => {
      // Clear any existing polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }

      let notifiedSlowProgress = false

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/accounts/${account?.id}/follower-tracker/progress/${action}/${jobId}`
          )
          const progress = await response.json()

          if (progress.success) {
            setBatchProgress((prev) => ({
              ...prev,
              completed: progress.completed || 0,
              successful: progress.successful || 0,
              failed: progress.failed || 0,
              status: progress.status,
              currentDid: progress.currentDid,
            }))

            // Notify if progress is slow (after 30 seconds, if less than 20% complete)
            if (!notifiedSlowProgress && batchProgressRef.current.startTime) {
              const elapsed = (Date.now() - batchProgressRef.current.startTime) / 1000
              const progressPercent = (progress.completed || 0) / batchProgressRef.current.total
              if (elapsed > 30 && progressPercent < 0.2) {
                toast.info(
                  `⏳ Processing large batch - this may take a while. ${progress.completed}/${batchProgressRef.current.total} done so far.`,
                  {
                    duration: 5000,
                  }
                )
                notifiedSlowProgress = true
              }
            }

            if (progress.status === 'completed') {
              clearInterval(pollInterval)
              pollingIntervalRef.current = null
              const successRate = Math.round((progress.successful / progress.total) * 100)
              const totalTime = batchProgressRef.current.startTime
                ? (Date.now() - batchProgressRef.current.startTime) / 1000
                : 0
              const timeStr = totalTime
                ? ` in ${totalTime < 60 ? Math.round(totalTime) + 's' : Math.floor(totalTime / 60) + 'm ' + Math.round(totalTime % 60) + 's'}`
                : ''

              toast.success(
                `🎉 Background job completed${timeStr}! ${progress.successful}/${progress.total} users processed (${successRate}% success)`,
                {
                  duration: 8000,
                  action: {
                    label: 'Refresh Data',
                    onClick: () => router.reload(),
                  },
                }
              )

              // Reset state after a delay to let user see the completion
              setTimeout(() => {
                setBatchProgress({
                  action: null,
                  jobId: null,
                  total: 0,
                  completed: 0,
                  successful: 0,
                  failed: 0,
                  status: null,
                })
              }, 8000) // Extended to 8 seconds to give user more time to see results
            } else if (progress.status === 'failed') {
              clearInterval(pollInterval)
              pollingIntervalRef.current = null
              toast.error(`Background job failed: ${progress.error || 'Unknown error'}`, {
                duration: 8000,
              })
              setBatchProgress({
                action: null,
                jobId: null,
                total: 0,
                completed: 0,
                successful: 0,
                failed: 0,
                status: null,
              })
            } else if (progress.status === 'cancelled') {
              clearInterval(pollInterval)
              pollingIntervalRef.current = null
              toast.warning('Background job was cancelled', {
                duration: 5000,
              })
              setBatchProgress({
                action: null,
                jobId: null,
                total: 0,
                completed: 0,
                successful: 0,
                failed: 0,
                status: null,
              })
            }
          }
        } catch (error) {
          // Continue polling, don't break on network errors
        }
      }, 1000) // Poll every 1 second for better responsiveness

      // Store the interval reference
      pollingIntervalRef.current = pollInterval

      // Cleanup after 10 minutes max
      setTimeout(() => {
        clearInterval(pollInterval)
        pollingIntervalRef.current = null
        if (batchProgressRef.current.status === 'running') {
          toast.warning(
            'Progress polling stopped after 10 minutes. Job may still be running in background.'
          )
          setBatchProgress({
            action: null,
            jobId: null,
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0,
            status: null,
          })
        }
      }, 600000)
    },
    [account?.id]
  )

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.get(`${window.location.pathname}?${params.toString()}`)
  }, [])

  // Refresh cache function - optimisée
  const handleRefreshCache = useCallback(async () => {
    setRefreshingCache(true)
    toast.info('Refreshing follower data... This will fetch the latest information.')

    try {
      const response = await fetch(`/accounts/${account?.id}/follower-tracker/refresh-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`🎉 Cache refreshed! Updated ${result.count} relationships.`)
        // Reload the page to show fresh data
        router.reload()
      } else {
        toast.error('Failed to refresh cache. Please try again.')
      }
    } catch (error) {
      console.error('Cache refresh error:', error)
      toast.error('Failed to refresh cache. Please try again.')
    } finally {
      setRefreshingCache(false)
    }
  }, [account?.id])

  // Utility functions for batch actions - mémorisées
  const getFollowableCount = useCallback(() => {
    return Array.from(selectedFollowers).filter((did) => {
      const follower = filteredFollowers.find((f) => f.did === did)
      return follower?.status === 'they_follow_only'
    }).length
  }, [selectedFollowers, filteredFollowers])

  const getUnfollowableCount = useCallback(() => {
    return Array.from(selectedFollowers).filter((did) => {
      const follower = filteredFollowers.find((f) => f.did === did)
      return follower?.status === 'i_follow_only' || follower?.status === 'mutual'
    }).length
  }, [selectedFollowers, filteredFollowers])

  // Check for active jobs on component mount
  useEffect(() => {
    if (!account?.id || hasCheckedActiveJobs.current) return

    hasCheckedActiveJobs.current = true

    const checkActiveJobs = async () => {
      try {
        const response = await fetch(`/accounts/${account.id}/follower-tracker/active-jobs`)
        const result = await response.json()

        if (result.success && result.activeJobs.length > 0) {
          // Found active job(s), take the first one
          const activeJob = result.activeJobs[0]

          setBatchProgress({
            action: activeJob.action,
            jobId: activeJob.jobId,
            total: activeJob.total || 0,
            completed: activeJob.completed || 0,
            successful: activeJob.successful || 0,
            failed: activeJob.failed || 0,
            status: activeJob.status,
            currentDid: activeJob.currentDid,
            startTime: activeJob.startedAt ? new Date(activeJob.startedAt).getTime() : Date.now(),
          })

          // Resume polling
          startProgressPolling(activeJob.jobId, activeJob.action)

          toast.info(
            `🔄 Resuming ${activeJob.action} job: ${activeJob.completed || 0}/${activeJob.total || 0} completed`,
            {
              duration: 4000,
            }
          )
        }
      } catch (error) {
        console.error('Failed to check active jobs:', error)
      }
    }

    checkActiveJobs()
  }, [account?.id, startProgressPolling])

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Update ref when batchProgress changes
  useEffect(() => {
    batchProgressRef.current = batchProgress
  }, [batchProgress])

  // Show skeleton loading state
  if (dataLoading) {
    return (
      <Layout
        user={null}
        account={
          account
            ? {
                id: account.id,
                handle: account.handle,
                followersCount: account.followersCount,
              }
            : undefined
        }
      >
        <Head title="Follower Tracker" />
        <FollowerTrackerSkeleton />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout user={null}>
        <Head title="Follower Tracker" />
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Follower Data</h3>
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout user={null}>
        <Head title="Follower Tracker" />
        <div className="p-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Account Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Please select an account to view follower relationships
                </p>
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      user={null}
      account={
        account
          ? {
              id: account.id,
              handle: account.handle,
              followersCount: account.followersCount,
            }
          : undefined
      }
    >
      <Head title="Follower Tracker" />

      {/* Loading Overlay */}
      {loadingAll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <h3 className="text-lg font-semibold">Loading All Followers</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please wait while we fetch all follower relationships. This may take a moment for
              accounts with many followers.
            </p>
          </div>
        </div>
      )}

      {/* Background Job Status Bar - Enhanced UI */}
      <BatchProgressBar
        progress={batchProgress}
        accountId={account?.id}
        onDismiss={() =>
          setBatchProgress({
            action: null,
            jobId: null,
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0,
            status: null,
          })
        }
        onCancel={() => {
          setBatchProgress({
            action: null,
            jobId: null,
            total: 0,
            completed: 0,
            successful: 0,
            failed: 0,
            status: null,
          })
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Follower Tracker</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-muted-foreground">Track relationships for @{account.handle}</p>
                {allDataLoaded && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    All data loaded
                  </div>
                )}
                {loadingAll && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Loading...
                  </div>
                )}
                {batchProgress.status === 'running' && (
                  <BatchStatusBadge progress={batchProgress} />
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(account.followersCount)}
              </div>
              <div className="text-sm text-muted-foreground">Total Followers</div>
              {allDataLoaded && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Ready for bulk operations
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            // Use relationship counts from backend if available, otherwise show 0
            const count =
              relationshipCounts?.[status as keyof typeof relationshipCounts] || 0
            return (
              <Card key={status} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <config.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* No Data Loaded Notice */}
        {followers.length === 0 && !loadingAll && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Ready to Analyze Your Bluesky Relationships
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm sm:text-base">
                    Welcome to the Follower Tracker! This tool will help you understand and manage your follower relationships. 
                    {relationshipCounts?.all 
                      ? ` We found ${relationshipCounts.all} relationships in your cache.`
                      : ' Click "Load All Data" to start analyzing your followers and following.'
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleLoadAll} 
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                      disabled={loadingAll}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {loadingAll ? 'Loading...' : 'Load All Data'}
                      {relationshipCounts?.all && ` (${relationshipCounts.all})`}
                    </Button>
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                      <Link href="/dashboard">
                        Back to Dashboard
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Relationship Evolution Chart - only show if we have data */}
        {(relationshipHistory.length > 0 || followers.length > 0) && (
          <RelationshipEvolutionChart 
            relationshipHistory={relationshipHistory}
            currentCounts={{
              mutual: relationshipCounts?.mutual || followers.filter(f => f.status === 'mutual').length,
              i_follow_only: relationshipCounts?.i_follow_only || followers.filter(f => f.status === 'i_follow_only').length,
              they_follow_only: relationshipCounts?.they_follow_only || followers.filter(f => f.status === 'they_follow_only').length,
            }}
          />
        )}

        {/* Controls - only show if we have data loaded */}
        {followers.length > 0 && (
          <Card>
            <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Search followers..."
                    value={filters.search}
                    onChange={(e) => updateSearchFilter(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => updateSearchFilter('')}
                    variant="outline"
                    size="icon"
                    disabled={!filters.search}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  {/* Filters Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="relative">
                        <Settings className="h-4 w-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <div className="p-4 space-y-4">
                        {/* Status Filters */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Relationship Status</label>
                          <div className="space-y-2">
                            {Object.entries(statusConfig).map(([status, config]) => (
                              <div key={status} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`status-${status}`}
                                  checked={filters.status.includes(status)}
                                  onCheckedChange={() => toggleStatusFilter(status)}
                                />
                                <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                                  {config.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Label Filters */}
                        {allLabels.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Labels</label>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                              {allLabels.map((label) => (
                                <div key={label} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`label-${label}`}
                                    checked={filters.labels.includes(label)}
                                    onCheckedChange={() => toggleLabelFilter(label)}
                                  />
                                  <label htmlFor={`label-${label}`} className="text-sm cursor-pointer">
                                    {label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Clear Filters */}
                        <div className="pt-2 border-t">
                          <Button
                            onClick={clearAllFilters}
                            variant="outline"
                            size="sm"
                            className="w-full"
                            disabled={activeFiltersCount === 0}
                          >
                            Clear All Filters
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Batch Actions */}
              <div className="flex gap-2">
                {/* Cache refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCache}
                  disabled={refreshingCache || loadingAll}
                  title="Refresh data from Bluesky API"
                >
                  {refreshingCache ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>

                {!allDataLoaded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadAll}
                    disabled={loadingAll}
                    className={loadingAll ? 'cursor-not-allowed' : ''}
                  >
                    {loadingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Loading All...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Load All ({relationshipCounts?.all || 'many'})
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredFollowers.length === 0 || loadingAll}
                >
                  {' '}
                  {selectedFollowers.size === filteredFollowers.length
                    ? 'Deselect All'
                    : `Select All (${filteredFollowers.length})`}
                </Button>
              </div>

              {/* Batch Actions */}
              <BatchActions
                selectedCount={selectedFollowers.size}
                isLoading={batchLoading}
                followableCount={getFollowableCount()}
                unfollowableCount={getUnfollowableCount()}
                onBatchFollow={() => handleBatchAction('follow')}
                onBatchUnfollow={() => handleBatchAction('unfollow')}
                onClearSelection={() => setSelectedFollowers(new Set())}
              />
            </div>
          </CardContent>
        </Card>
        )}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && followers.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                
                {/* Status filters */}
                {filters.status.map((status: string) => (
                  <Badge key={status} variant="secondary" className="flex items-center gap-1">
                    {statusConfig[status as keyof typeof statusConfig]?.emoji} {statusConfig[status as keyof typeof statusConfig]?.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => toggleStatusFilter(status)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}

                {/* Label filters */}
                {filters.labels.map((label: string) => (
                  <Badge key={label} variant="secondary" className="flex items-center gap-1">
                    🏷️ {label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => toggleLabelFilter(label)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}

                {/* Search filter */}
                {filters.search && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    🔍 "{filters.search}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateSearchFilter('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {/* Clear all button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="ml-2"
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Followers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Followers & Following
              {pagination && (
                <Badge variant="secondary">
                  {allDataLoaded
                    ? `${filteredFollowers.length} loaded`
                    : `${followers.length} of ${pagination.totalCount} loaded`}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>{' '}
          <CardContent>
            {filteredFollowers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {loadingAll ? 'Loading followers...' : 
                   followers.length === 0 ? 'No Follower Data Loaded' : 'No Results Found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {loadingAll
                    ? 'Please wait while we load all your follower data.'
                    : followers.length === 0
                      ? 'Click "Load All Data" to fetch and analyze your follower relationships from Bluesky'
                      : filters.search || activeFiltersCount > 0
                        ? 'Try adjusting your search terms or filters'
                        : 'No results match your current filters'}
                </p>
                {followers.length === 0 && !loadingAll && (
                  <div className="space-y-4">
                    <Button 
                      onClick={handleLoadAll} 
                      size="lg"
                      className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-8 py-3"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Load All Follower Data
                      {relationshipCounts?.all && ` (${relationshipCounts.all})`}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will fetch your complete follower and following lists from Bluesky
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Performance Info */}
                <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    {filters.search || activeFiltersCount > 0
                      ? `${filteredFollowers.length} results found`
                      : `${virtualizedFollowers.length} of ${filteredFollowers.length} loaded`}
                  </div>
                  {allDataLoaded && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      ⚡ All data cached
                    </div>
                  )}
                </div>

                {/* Virtualized List Container */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto" onScroll={handleScroll}>
                  {virtualizedFollowers.map((follower) => (
                    <FollowerItem
                      key={follower.did}
                      follower={follower}
                      isSelected={selectedFollowers.has(follower.did)}
                      isHovered={hoveredUser === follower.did}
                      statusConfig={statusConfig}
                      onSelectFollower={handleSelectFollower}
                      onMouseEnter={setHoveredUser}
                      onMouseLeave={() => setHoveredUser(null)}
                      onBatchAction={handleSingleAction}
                    />
                  ))}

                  {/* Load more indicator */}
                  {virtualEnd < filteredFollowers.length && (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">
                        Scroll down to load more results...
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pagination */}
            {!allDataLoaded && pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing page {pagination.currentPage} of {pagination.totalPages}(
                  {pagination.totalCount} total results)
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const startPage = Math.max(1, pagination.currentPage - 2)
                      const pageNum = startPage + i

                      // Only show page numbers that are within the total pages
                      if (pageNum > pagination.totalPages) return null

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    }).filter(Boolean)}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
})

export default FollowerTracker
