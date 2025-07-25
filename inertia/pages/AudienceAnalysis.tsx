import { useState, useEffect } from 'react'
import { Head, usePage, Link } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import AudienceFlowChart from '../components/AudienceFlowChart'
import {
  Users,
  Target,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Network,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react'
interface Account {
  id: number
  handle: string
  displayName: string
  followersCount: number
  analysis_status?: string
  last_analysis_date?: string
}

interface User {
  id: number
  email: string
  plan?: string
}

interface SuperCluster {
  id: number
  tag: string
  size: number
  handles: string[]
  accountHandle: string
  robustnessLevel?: string | null
  robustnessTag?: string | null
  pipelineStep?: number | null
  clusteringMethod?: string | null
  skipTagging?: boolean
  processingStatus?: string | null
}

interface Cluster {
  id: number
  tag: string
  handles: string[]
  superClusterId: number | null
  size: number
  accountHandle: string
  persistence?: number | null
  cohesion?: number | null
  robustnessLevel?: string | null
  robustnessTag?: string | null
  pipelineStep?: number | null
  clusteringMethod?: string | null
  skipTagging?: boolean
  processingStatus?: string | null
}

interface AnalysisJob {
  id: number
  status: string
  progress: number
  total_followers: number
  processed_followers: number
  started_at: string
  completed_at?: string
  error_message?: string
}

interface CacheInfo {
  fromCache: boolean
  cachedAt: string
}

interface AudienceAnalysisProps {
  account: Account
  superClusters?: SuperCluster[]
  clusters?: Cluster[]
  analysis_job?: AnalysisJob
  analysis_running?: boolean
  isRealData?: boolean
  cache_info?: CacheInfo | null
}

function AudienceAnalysis({
  account,
  superClusters = [],
  clusters = [],
  analysis_job,
  analysis_running,
  isRealData = false,
  cache_info,
}: AudienceAnalysisProps) {
  const { props } = usePage()
  const user = props.user as User

  // Local state for real-time updates
  const [localAnalysisJob, setLocalAnalysisJob] = useState<AnalysisJob | undefined>(analysis_job)
  const [localAnalysisRunning, setLocalAnalysisRunning] = useState(analysis_running)
  const [isPolling, setIsPolling] = useState(false)

  // Cache state
  const [localClusters, setLocalClusters] = useState<Cluster[]>(clusters)
  const [localSuperClusters, setLocalSuperClusters] = useState<SuperCluster[]>(superClusters)

  const [localCacheInfo, setLocalCacheInfo] = useState<CacheInfo | null>(cache_info || null)
  const [refreshingCache, setRefreshingCache] = useState(false)

  // Use the isRealData flag from the controller to determine if we should show links
  const hasRealData = isRealData

  // State for visualization view management
  const [isVisualizationMinimized, setIsVisualizationMinimized] = useState(false)
  const [showAllClusters, setShowAllClusters] = useState(false)

  // State for segments view management
  const [isSegmentsMinimized, setIsSegmentsMinimized] = useState(false)
  const [showAllSegments, setShowAllSegments] = useState(true) // Démarrer avec toutes les données affichées
  const [collapsedSuperClusters, setCollapsedSuperClusters] = useState<Set<number>>(new Set())

  const toggleSuperClusterCollapse = (superClusterId: number) => {
    setCollapsedSuperClusters((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(superClusterId)) {
        newSet.delete(superClusterId)
      } else {
        newSet.add(superClusterId)
      }
      return newSet
    })
  }

  // Polling function to check analysis status
  const pollAnalysisStatus = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLocalAnalysisJob(data.analysis_job)
        setLocalAnalysisRunning(data.analysis_running)

        // Stop polling if analysis is completed or failed
        if (
          data.analysis_job &&
          ['completed', 'failed', 'paused', 'stopped'].includes(data.analysis_job.status)
        ) {
          setIsPolling(false)

          // If analysis just completed, refresh the page to show results
          if (
            data.analysis_job.status === 'completed' &&
            localAnalysisJob?.status !== 'completed'
          ) {
            setTimeout(() => {
              window.location.reload()
            }, 2000) // Wait 2 seconds to show completion status
          }
        }
      }
    } catch (error) {
      console.error('Error polling analysis status:', error)
    }
  }

  // Set up polling when analysis is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPolling && localAnalysisRunning) {
      interval = setInterval(pollAnalysisStatus, 2000) // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPolling, localAnalysisRunning, account.id])

  // Start polling when component mounts if analysis is already running
  useEffect(() => {
    if (localAnalysisRunning) {
      setIsPolling(true)
    }
  }, [localAnalysisRunning])

  const handleStartAnalysis = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        // Update local state immediately
        setLocalAnalysisRunning(true)
        setIsPolling(true)

        // Get the initial status
        pollAnalysisStatus()
      } else if (response.status === 409) {
        // Conflict - analysis already running
        console.warn('Analysis already running, trying to get current status')
        pollAnalysisStatus()
      } else {
        console.error('Failed to start analysis')
        alert('Failed to start analysis. Please try again.')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
      alert('Error starting analysis. Please try again.')
    }
  }

  const handleStopAnalysis = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        // Update local state immediately
        setLocalAnalysisRunning(false)
        setIsPolling(false)

        // Get the final status
        pollAnalysisStatus()
      } else {
        console.error('Failed to stop analysis')
        alert('Failed to stop analysis. Please try again.')
      }
    } catch (error) {
      console.error('Error stopping analysis:', error)
      alert('Error stopping analysis. Please try again.')
    }
  }

  const handleForceReset = async () => {
    if (
      !confirm(
        'Are you sure you want to force reset the analysis? This will stop any running analysis and clear all data.'
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/force-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        // Update local state immediately
        setLocalAnalysisRunning(false)
        setIsPolling(false)
        setLocalAnalysisJob(undefined)

        // Refresh the page to get clean state
        window.location.reload()
      } else {
        console.error('Failed to force reset analysis')
        alert('Failed to force reset analysis. Please try again.')
      }
    } catch (error) {
      console.error('Error force resetting analysis:', error)
      alert('Error force resetting analysis. Please try again.')
    }
  }

  // Cache refresh function
  const handleRefreshCache = async () => {
    setRefreshingCache(true)
    console.log('Refreshing cluster cache... This will fetch the latest information.')

    try {
      const response = await fetch(`/api/accounts/${account.id}/clusters/refresh-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update local state with fresh data
          setLocalClusters(data.data.clusters)
          setLocalSuperClusters(data.data.superClusters)
          setLocalCacheInfo({
            fromCache: data.data.fromCache,
            cachedAt: data.data.cachedAt,
          })

          console.log(
            `Cache refreshed successfully! Loaded ${data.data.clustersCount} clusters and ${data.data.superClustersCount} super clusters.`
          )
        } else {
          console.error('Failed to refresh cache:', data.message)
        }
      } else {
        console.error('Failed to refresh cache')
      }
    } catch (error) {
      console.error('Error refreshing cache:', error)
    } finally {
      setRefreshingCache(false)
    }
  }

  // Function to get fresh cluster data
  const handleGetClusterData = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/clusters/data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocalClusters(data.data.clusters)
          setLocalSuperClusters(data.data.superClusters)
          setLocalCacheInfo(data.data.cache_info)
          setLocalAnalysisJob(data.data.analysis_job)
          setLocalAnalysisRunning(data.data.analysis_running)
        }
      }
    } catch (error) {
      console.error('Error getting cluster data:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'running':
      case 'in_progress':
        return 'bg-blue-600'
      case 'pending':
        return 'bg-blue-400'
      case 'failed':
        return 'bg-red-500'
      case 'paused':
      case 'stopped':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'running':
      case 'in_progress':
        return 'Running'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      case 'paused':
        return 'Paused'
      case 'stopped':
        return 'Stopped'
      default:
        return 'Unknown'
    }
  }

  return (
    <>
      <Head title={`Audience Analysis - ${account.handle}`} />
      <Layout user={user}>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Audience Analysis</h1>
              <p className="text-muted-foreground">
                Deep insights into @{account.handle}'s follower base
              </p>
            </div>

            <div className="flex items-center gap-3">
              {localAnalysisRunning ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleStopAnalysis}
                    className="flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" />
                    Stop Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleForceReset}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Force Reset
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    onClick={handleStartAnalysis}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {localClusters.length > 0 ? 'Refresh Analysis' : 'Start Analysis'}
                  </Button>
                  {localClusters.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleRefreshCache}
                      disabled={refreshingCache}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingCache ? 'animate-spin' : ''}`} />
                      {refreshingCache ? 'Refreshing...' : 'Refresh Cache'}
                    </Button>
                  )}
                  {(localAnalysisJob?.status === 'failed' ||
                    localAnalysisJob?.status === 'paused') && (
                    <Button
                      variant="outline"
                      onClick={handleForceReset}
                      className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Pro Feature Warning */}
          {user?.plan !== 'pro' && (
            <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                    <Target className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                      Audience Insights Available with Pro
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                      Unlock detailed audience segmentation and engagement analysis.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => (window.location.href = '/plan/change')}
                  >
                    Upgrade
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Status */}
          {localAnalysisJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Analysis Status
                  {isPolling && (
                    <div className="ml-2 flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-muted-foreground">Live</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(localAnalysisJob.status)}`}
                      ></div>
                      <span className="font-medium">{getStatusText(localAnalysisJob.status)}</span>
                    </div>
                    {(localAnalysisJob.status === 'running' ||
                      localAnalysisJob.status === 'in_progress') && (
                      <span className="text-sm text-muted-foreground">
                        {localAnalysisJob.processed_followers || 0} / {account.followersCount || 0}{' '}
                        followers ({Math.round(localAnalysisJob.progress || 0)}%)
                      </span>
                    )}
                  </div>

                  {(localAnalysisJob.status === 'running' ||
                    localAnalysisJob.status === 'in_progress') && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(0, localAnalysisJob.progress || 0))}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress: {Math.round(localAnalysisJob.progress || 0)}%</span>
                        {localAnalysisJob.total_followers > 0 && (
                          <span>
                            {localAnalysisJob.processed_followers || 0} of{' '}
                            {localAnalysisJob.total_followers} followers
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {localAnalysisJob.status === 'completed' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Analysis completed successfully! Refreshing results...
                      </span>
                    </div>
                  )}

                  {localAnalysisJob.error_message && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{localAnalysisJob.error_message}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Followers
                </CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {account.followersCount.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Audience Segments
                </CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {localSuperClusters.length + localClusters.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Last Analysis
                </CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {account.last_analysis_date
                    ? new Date(account.last_analysis_date).toLocaleDateString()
                    : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cache Information */}
          {localCacheInfo && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Data {localCacheInfo.fromCache ? 'from cache' : 'freshly loaded'}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Last updated: {new Date(localCacheInfo.cachedAt).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audience Clusters - Flow Visualization */}
          {(localSuperClusters.length > 0 || localClusters.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Network className="h-5 w-5 text-slate-500" />
                    Audience Network Visualization
                  </CardTitle>

                  {/* Visualization Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVisualizationMinimized(!isVisualizationMinimized)}
                      className="flex items-center gap-2"
                    >
                      {isVisualizationMinimized ? (
                        <>
                          <Maximize2 className="h-4 w-4" />
                          Expand
                        </>
                      ) : (
                        <>
                          <Minimize2 className="h-4 w-4" />
                          Minimize
                        </>
                      )}
                    </Button>

                    {!isVisualizationMinimized &&
                      localSuperClusters.length +
                        localClusters.filter((c) => !c.superClusterId).length >
                        10 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllClusters(!showAllClusters)}
                          className="flex items-center gap-2"
                        >
                          {showAllClusters ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show More
                            </>
                          )}
                        </Button>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AudienceFlowChart
                  superClusters={localSuperClusters}
                  clusters={localClusters}
                  account={account}
                  isMinimized={isVisualizationMinimized}
                  showAllClusters={showAllClusters}
                />
              </CardContent>
            </Card>
          )}

          {/* Audience Clusters - List View */}
          {(localSuperClusters.length > 0 || localClusters.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Users className="h-5 w-5 text-slate-500" />
                    Detailed Audience Segments
                  </CardTitle>

                  {/* View Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSegmentsMinimized(!isSegmentsMinimized)}
                      className="flex items-center gap-2"
                    >
                      {isSegmentsMinimized ? (
                        <>
                          <Maximize2 className="h-4 w-4" />
                          Expand
                        </>
                      ) : (
                        <>
                          <Minimize2 className="h-4 w-4" />
                          Minimize
                        </>
                      )}
                    </Button>

                    {!isSegmentsMinimized &&
                      localSuperClusters.length +
                        localClusters.filter((c) => !c.superClusterId).length >
                        15 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllSegments(!showAllSegments)}
                          className="flex items-center gap-2"
                        >
                          {showAllSegments ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Compact View
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Full View (
                              {localSuperClusters.length +
                                localClusters.filter((c) => !c.superClusterId).length}
                              )
                            </>
                          )}
                        </Button>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Minimized State */}
                {isSegmentsMinimized && (
                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-blue-600">
                        {localSuperClusters.length +
                          localClusters.filter((c) => !c.superClusterId).length}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total audience segments identified
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4 max-w-sm mx-auto">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {localSuperClusters.length}
                          </div>
                          <div className="text-xs text-muted-foreground">Super Clusters</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-slate-600">
                            {localClusters.filter((c) => !c.superClusterId).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Independent Clusters</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Click "Expand" to see detailed breakdown
                      </p>
                    </div>
                  </div>
                )}

                {/* Full View */}
                {!isSegmentsMinimized && (
                  <div className="grid gap-6">
                    {/* Super Clusters */}
                    {(showAllSegments ? localSuperClusters : localSuperClusters.slice(0, 8)).map(
                      (superCluster) => {
                        const percentage = (superCluster.size / (account.followersCount || 1)) * 100
                        const childClusters = localClusters.filter(
                          (c) => c.superClusterId === superCluster.id
                        )
                        const isCollapsed = collapsedSuperClusters.has(superCluster.id)

                        return (
                          <div
                            key={`super-${superCluster.id}`}
                            className="p-5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Target className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                  {superCluster.tag}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                                >
                                  Super Cluster
                                </Badge>
                                {/* 🎯 NEW: Robustness indicator */}
                                {superCluster.robustnessTag && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                  >
                                    {superCluster.robustnessTag}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge
                                  variant="secondary"
                                  className="text-base px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                >
                                  {percentage.toFixed(1)}%
                                </Badge>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {superCluster.size.toLocaleString()} followers
                                </span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSuperClusterCollapse(superCluster.id)}
                                    className="opacity-60 hover:opacity-100 transition-opacity"
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronUp className="h-4 w-4" />
                                    )}
                                  </Button>
                                  {hasRealData && (
                                    <Link
                                      href={`/accounts/${account.id}/clusters/supercluster/${superCluster.id}`}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                                      >
                                        <Eye className="h-4 w-4" />
                                        View Details
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <>
                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                                  {superCluster.size} followers across {superCluster.handles.length}{' '}
                                  accounts
                                </p>

                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    >
                                      {superCluster.tag}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {superCluster.handles.length} unique accounts
                                    </Badge>
                                  </div>
                                </div>

                                {/* Child clusters */}
                                {childClusters.length > 0 && (
                                  <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-3">
                                      Sub-clusters ({childClusters.length})
                                    </h4>
                                    <div className="grid gap-3">
                                      {childClusters
                                        .slice(0, showAllSegments ? undefined : 5)
                                        .map((cluster) => {
                                          const clusterPercentage =
                                            (cluster.size / (account.followersCount || 1)) * 100
                                          return (
                                            <div
                                              key={cluster.id}
                                              className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group/child"
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-medium text-slate-900 dark:text-slate-100">
                                                  {cluster.tag}
                                                </h5>
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="text-xs">
                                                    {clusterPercentage.toFixed(1)}%
                                                  </Badge>
                                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {cluster.size.toLocaleString()} followers
                                                  </span>
                                                  {/* 🎯 NEW: Robustness badge for cluster */}
                                                  {cluster.robustnessTag && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                                    >
                                                      {cluster.robustnessTag}
                                                    </Badge>
                                                  )}
                                                  {hasRealData && (
                                                    <Link
                                                      href={`/accounts/${account.id}/clusters/cluster/${cluster.id}`}
                                                    >
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover/child:opacity-100 transition-opacity p-1"
                                                      >
                                                        <ExternalLink className="h-3 w-3" />
                                                      </Button>
                                                    </Link>
                                                  )}
                                                </div>
                                              </div>
                                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {cluster.size} followers across{' '}
                                                {cluster.handles.length} accounts
                                                {cluster.persistence !== undefined &&
                                                cluster.persistence !== null ? (
                                                  <span className="ml-2">
                                                    • Persistence: {cluster.persistence.toFixed(3)}
                                                  </span>
                                                ) : cluster.cohesion !== undefined &&
                                                  cluster.cohesion !== null ? (
                                                  <span className="ml-2">
                                                    • Cohesion:{' '}
                                                    {(cluster.cohesion * 100).toFixed(1)}%
                                                  </span>
                                                ) : null}
                                              </p>
                                            </div>
                                          )
                                        })}
                                      {!showAllSegments && childClusters.length > 5 && (
                                        <div className="text-center">
                                          <Badge variant="outline" className="text-xs">
                                            +{childClusters.length - 5} more sub-clusters
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      }
                    )}

                    {/* Show more indicator for super clusters */}
                    {!showAllSegments && localSuperClusters.length > 8 && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                          <Target className="h-4 w-4" />+{localSuperClusters.length - 8} more super
                          clusters
                        </div>
                      </div>
                    )}

                    {/* Orphaned Clusters (not belonging to any super cluster) */}
                    {localClusters
                      .filter((c) => !c.superClusterId)
                      .slice(0, showAllSegments ? undefined : 6)
                      .map((cluster) => {
                        const percentage = (cluster.size / (account.followersCount || 1)) * 100
                        return (
                          <div
                            key={cluster.id}
                            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-500" />
                                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                  {cluster.tag}
                                </h3>
                                {/* 🎯 NEW: Robustness badge for orphaned cluster */}
                                {cluster.robustnessTag && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                  >
                                    {cluster.robustnessTag}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                >
                                  {percentage.toFixed(1)}%
                                </Badge>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {cluster.size.toLocaleString()} followers
                                </span>
                                {hasRealData && (
                                  <Link
                                    href={`/accounts/${account.id}/clusters/cluster/${cluster.id}`}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                              {cluster.size} followers across {cluster.handles.length} accounts
                              {cluster.persistence !== undefined && cluster.persistence !== null ? (
                                <span className="ml-2">
                                  • Persistence: {cluster.persistence.toFixed(3)}
                                </span>
                              ) : cluster.cohesion !== undefined && cluster.cohesion !== null ? (
                                <span className="ml-2">
                                  • Cohesion: {(cluster.cohesion * 100).toFixed(1)}%
                                </span>
                              ) : null}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {cluster.tag}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {cluster.handles.length} accounts
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                    {/* Show more indicator for orphaned clusters */}
                    {!showAllSegments &&
                      localClusters.filter((c) => !c.superClusterId).length > 6 && (
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                            <Users className="h-4 w-4" />+
                            {localClusters.filter((c) => !c.superClusterId).length - 6} more
                            independent clusters
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {localSuperClusters.length === 0 &&
            localClusters.length === 0 &&
            !localAnalysisRunning && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">No Analysis Data</h3>
                      <p className="text-muted-foreground">
                        Start your first audience analysis to discover insights about your
                        followers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </Layout>
    </>
  )
}

export default AudienceAnalysis
