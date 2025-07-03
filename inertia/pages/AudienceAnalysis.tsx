import { useState } from 'react'
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
  embeddings: number[]
  size: number
  handles: string[]
  accountHandle: string
}

interface Cluster {
  id: number
  tag: string
  handles: string[]
  superClusterId: number | null
  embeddings: number[]
  size: number
  accountHandle: string
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

interface AudienceAnalysisProps {
  account: Account
  superClusters?: SuperCluster[]
  clusters?: Cluster[]
  analysis_job?: AnalysisJob
  analysis_running?: boolean
  isRealData?: boolean
}

function AudienceAnalysis({
  account,
  superClusters = [],
  clusters = [],
  analysis_job,
  analysis_running = false,
  isRealData = false,
}: AudienceAnalysisProps) {
  const { props } = usePage()
  const user = props.user as User

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
        window.location.reload()
      } else {
        console.error('Failed to start analysis')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
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
        window.location.reload()
      } else {
        console.error('Failed to stop analysis')
      }
    } catch (error) {
      console.error('Error stopping analysis:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-blue-500'
      case 'running':
        return 'bg-blue-600'
      case 'failed':
        return 'bg-red-500'
      case 'paused':
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
        return 'Running'
      case 'failed':
        return 'Failed'
      case 'paused':
        return 'Paused'
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
              {user?.plan !== 'pro' && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Pro Feature
                </Badge>
              )}

              {analysis_running ? (
                <Button
                  variant="outline"
                  onClick={handleStopAnalysis}
                  className="flex items-center gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Stop Analysis
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleStartAnalysis}
                  disabled={user?.plan !== 'pro'}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {clusters.length > 0 ? 'Refresh Analysis' : 'Start Analysis'}
                </Button>
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
                  <Button variant="default" size="sm" asChild>
                    <a href="/plan/change">Upgrade</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Status */}
          {analysis_job && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Analysis Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(analysis_job.status)}`}
                      ></div>
                      <span className="font-medium">{getStatusText(analysis_job.status)}</span>
                    </div>
                    {analysis_job.status === 'running' && (
                      <span className="text-sm text-muted-foreground">
                        {analysis_job.processed_followers} / {analysis_job.total_followers}{' '}
                        followers
                      </span>
                    )}
                  </div>

                  {analysis_job.status === 'running' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${analysis_job.progress}%` }}
                      ></div>
                    </div>
                  )}

                  {analysis_job.error_message && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{analysis_job.error_message}</span>
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
                  {superClusters.length + clusters.length}
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

          {/* Audience Clusters - Flow Visualization */}
          {(superClusters.length > 0 || clusters.length > 0) && (
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
                      superClusters.length + clusters.filter((c) => !c.superClusterId).length >
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
                  superClusters={superClusters}
                  clusters={clusters}
                  account={account}
                  isMinimized={isVisualizationMinimized}
                  showAllClusters={showAllClusters}
                />
              </CardContent>
            </Card>
          )}

          {/* Audience Clusters - List View */}
          {(superClusters.length > 0 || clusters.length > 0) && (
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
                      superClusters.length + clusters.filter((c) => !c.superClusterId).length >
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
                              {superClusters.length +
                                clusters.filter((c) => !c.superClusterId).length}
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
                        {superClusters.length + clusters.filter((c) => !c.superClusterId).length}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total audience segments identified
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4 max-w-sm mx-auto">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {superClusters.length}
                          </div>
                          <div className="text-xs text-muted-foreground">Super Clusters</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-slate-600">
                            {clusters.filter((c) => !c.superClusterId).length}
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
                    {(showAllSegments ? superClusters : superClusters.slice(0, 8)).map(
                      (superCluster) => {
                        const percentage = (superCluster.size / (account.followersCount || 1)) * 100
                        const childClusters = clusters.filter(
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
                    {!showAllSegments && superClusters.length > 8 && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                          <Target className="h-4 w-4" />+{superClusters.length - 8} more super
                          clusters
                        </div>
                      </div>
                    )}

                    {/* Orphaned Clusters (not belonging to any super cluster) */}
                    {clusters
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
                    {!showAllSegments && clusters.filter((c) => !c.superClusterId).length > 6 && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                          <Users className="h-4 w-4" />+
                          {clusters.filter((c) => !c.superClusterId).length - 6} more independent
                          clusters
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {superClusters.length === 0 && clusters.length === 0 && !analysis_running && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Analysis Data</h3>
                    <p className="text-muted-foreground">
                      Start your first audience analysis to discover insights about your followers.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    onClick={handleStartAnalysis}
                    disabled={user?.plan !== 'pro'}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start Analysis
                  </Button>
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
