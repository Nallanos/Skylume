import { Head, usePage, Link } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Users, Target, ArrowLeft, ExternalLink, TrendingUp, Hash, BarChart3 } from 'lucide-react'

interface Account {
  id: number
  handle: string
  displayName: string
  followersCount: number
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

interface ClusterDetailProps {
  account: Account
  cluster?: Cluster
  superCluster?: SuperCluster
  childClusters?: Cluster[]
  type: 'cluster' | 'supercluster'
}

function ClusterDetail({
  account,
  cluster,
  superCluster,
  childClusters = [],
  type,
}: ClusterDetailProps) {
  const { props } = usePage()
  const user = props.user
  const currentItem = type === 'supercluster' ? superCluster : cluster
  const percentage = currentItem ? (currentItem.size / (account.followersCount || 1)) * 100 : 0

  if (!currentItem) {
    return (
      <Layout user={user}>
        <Head title="Cluster Not Found" />
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Cluster Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The requested cluster could not be found.
              </p>
              <Link href={`/accounts/${account.id}/audience-analysis`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Analysis
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <>
      <Head title={`${currentItem.tag} - Cluster Details`} />
      <Layout user={user}>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/accounts/${account.id}/audience-analysis`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Analysis
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {currentItem.tag}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {type === 'supercluster' ? 'Super Cluster' : 'Cluster'} for {account.handle}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-lg px-4 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
            >
              {type === 'supercluster' ? (
                <Target className="h-5 w-5 mr-2" />
              ) : (
                <Users className="h-5 w-5 mr-2" />
              )}
              {percentage.toFixed(1)}% of audience
            </Badge>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Users className="h-4 w-4" />
                  Total Followers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {currentItem.size.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {percentage.toFixed(1)}% of {account.followersCount.toLocaleString()} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Hash className="h-4 w-4" />
                  Unique Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {currentItem.handles.length.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Active accounts in this {type === 'supercluster' ? 'super cluster' : 'cluster'}
                </p>
              </CardContent>
            </Card>

            {type === 'supercluster' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Target className="h-4 w-4" />
                    Sub-clusters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {childClusters.length}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Specialized communities within this super cluster
                  </p>
                </CardContent>
              </Card>
            )}

            {type === 'cluster' && cluster?.superClusterId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Target className="h-4 w-4" />
                    Parent Super Cluster
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    <Link
                      href={`/accounts/${account.id}/clusters/supercluster/${cluster.superClusterId}`}
                    >
                      View Parent
                      <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </Link>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Part of a larger interest group
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sub-clusters for Super Clusters */}
          {type === 'supercluster' && childClusters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Target className="h-5 w-5 text-slate-500" />
                  Sub-clusters ({childClusters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {childClusters.map((childCluster) => {
                    const childPercentage =
                      (childCluster.size / (account.followersCount || 1)) * 100
                    return (
                      <div
                        key={childCluster.id}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-slate-500" />
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                              {childCluster.tag}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {childPercentage.toFixed(1)}%
                            </Badge>
                            <Link
                              href={`/accounts/${account.id}/clusters/cluster/${childCluster.id}`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Followers:</span>
                            <div className="font-medium">{childCluster.size.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Accounts:</span>
                            <div className="font-medium">{childCluster.handles.length}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Avg per account:
                            </span>
                            <div className="font-medium">
                              {Math.round(childCluster.size / childCluster.handles.length)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Handles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="h-5 w-5 text-slate-500" />
                Key Accounts ({currentItem.handles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentItem.handles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentItem.handles.slice(0, 50).map((handle, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          @{handle}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Account #{index + 1}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No account handles available for this{' '}
                  {type === 'supercluster' ? 'super cluster' : 'cluster'}.
                </div>
              )}

              {currentItem.handles.length > 50 && (
                <div className="mt-4 text-center">
                  <Badge variant="outline" className="text-xs">
                    Showing 50 of {currentItem.handles.length} accounts
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights and Analytics Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <BarChart3 className="h-5 w-5 text-slate-500" />
                Insights & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 space-y-4">
                <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Advanced Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Detailed engagement patterns, growth trends, and behavioral insights for this{' '}
                    {type === 'supercluster' ? 'super cluster' : 'cluster'}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default ClusterDetail
