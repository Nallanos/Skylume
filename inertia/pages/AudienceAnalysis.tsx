import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Users, Target, TrendingUp, Clock, AlertCircle, Play, Pause } from 'lucide-react'

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

interface Cluster {
  id: number
  name: string
  description: string
  follower_count: number
  percentage: number
  keywords: string[]
  avg_engagement_rate: number
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
  clusters?: Cluster[]
  analysis_job?: AnalysisJob
  analysis_running?: boolean
}

function AudienceAnalysis({
  account,
  clusters = [],
  analysis_job,
  analysis_running = false,
}: AudienceAnalysisProps) {
  const { props } = usePage()
  const user = props.user as User

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
        return 'bg-green-500'
      case 'running':
        return 'bg-blue-500'
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
                <Badge variant="outline" className="text-purple-600 border-purple-300">
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
            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                      Unlock Advanced Audience Insights
                    </h3>
                    <p className="text-purple-700 dark:text-purple-300 mt-1">
                      Get detailed audience segmentation, engagement patterns, and follower clusters
                      with Pro.
                    </p>
                  </div>
                  <Button asChild>
                    <a href="/plan/change">Upgrade to Pro</a>
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
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
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{account.followersCount.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audience Segments</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clusters.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Analysis</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {account.last_analysis_date
                    ? new Date(account.last_analysis_date).toLocaleDateString()
                    : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audience Clusters */}
          {clusters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Audience Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{cluster.name}</h3>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">{cluster.percentage.toFixed(1)}%</Badge>
                          <span className="text-sm text-muted-foreground">
                            {cluster.follower_count.toLocaleString()} followers
                          </span>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm mb-3">{cluster.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {cluster.keywords.slice(0, 5).map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {cluster.avg_engagement_rate.toFixed(1)}% avg engagement
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {clusters.length === 0 && !analysis_running && (
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
