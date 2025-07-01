import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import PublicationCalendar from '../components/PublicationCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TrendingUp, Users, Heart, Repeat, MessageCircle } from 'lucide-react'

interface Post {
  text: string
  likes: number
  reposts: number
  replies: number
  date: string
  url: string
  engagement_rate: number
}

interface Account {
  id: number
  handle: string
  displayName: string
  followersCount: number
}

interface User {
  id: number
  email: string
}

interface AnalyticsProps {
  followers_history: { date: string; count: number }[]
  posting_days: { date: string; count: number }[]
  all_posts: Post[]
  account: Account
}

function Analytics({ followers_history, posting_days, all_posts, account }: AnalyticsProps) {
  const { props } = usePage()
  const user = props.user as User

  const totalEngagement = all_posts.reduce(
    (sum, post) => sum + post.likes + post.reposts + post.replies,
    0
  )
  const avgEngagementRate =
    all_posts.length > 0
      ? (all_posts.reduce((sum, post) => sum + post.engagement_rate, 0) / all_posts.length).toFixed(
          2
        )
      : '0'

  const topPosts = [...all_posts]
    .sort((a, b) => b.likes + b.reposts + b.replies - (a.likes + a.reposts + a.replies))
    .slice(0, 5)

  return (
    <>
      <Head title={`Analytics - @${account.handle}`} />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Insights and performance for @{account.handle}
              </p>
            </div>

            <div className="flex space-x-3 items-center">
              <Button asChild>
                <a href={`/analytics/${account.id}/audience`}>Advanced Audience Analysis</a>
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Followers</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{account.followersCount?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {followers_history.length > 1 && (
                    <span className="text-green-500">
                      +
                      {followers_history[followers_history.length - 1]?.count -
                        followers_history[0]?.count || 0}{' '}
                      this period
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{all_posts.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Posts analyzed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEngagement.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Likes, reposts & replies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEngagementRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Average across all posts</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Followers Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Followers Growth</CardTitle>
              </CardHeader>
              <CardContent>
                {followers_history.length > 0 ? (
                  <div className="h-64 relative">
                    <div className="flex items-end justify-between h-full gap-2 px-2 py-4">
                      {followers_history.map((point, index) => {
                        const maxCount = Math.max(...followers_history.map((p) => p.count))
                        const minCount = Math.min(...followers_history.map((p) => p.count))
                        const range = maxCount - minCount

                        // Calculate height as percentage of available space
                        let heightPercent = 10 // minimum height
                        if (range > 0) {
                          heightPercent = Math.max(10, ((point.count - minCount) / range) * 80 + 10)
                        } else {
                          heightPercent = 50 // if all values are the same
                        }

                        return (
                          <div
                            key={index}
                            className="flex flex-col items-center group relative"
                            style={{ width: `${Math.max(100 / followers_history.length, 8)}%` }}
                          >
                            <div
                              className="bg-blue-500 hover:bg-blue-400 rounded-t-sm transition-colors cursor-pointer shadow-sm w-full relative"
                              style={{
                                height: `${heightPercent}%`,
                                minHeight: '8px',
                                maxHeight: '90%',
                              }}
                              title={`${new Date(point.date).toLocaleDateString()}: ${point.count.toLocaleString()} followers`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {point.count.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity transform rotate-45 origin-left">
                              {new Date(point.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between text-xs text-muted-foreground">
                      <span>
                        {Math.max(...followers_history.map((p) => p.count)).toLocaleString()}
                      </span>
                      <span>
                        {Math.min(...followers_history.map((p) => p.count)).toLocaleString()}
                      </span>
                    </div>

                    {/* Bottom labels */}
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                      <span>
                        {new Date(followers_history[0]?.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>
                        {new Date(
                          followers_history[followers_history.length - 1]?.date
                        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>No followers data available</p>
                    <p className="text-sm">Connect your account to see growth analytics</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posting Activity */}
            <PublicationCalendar posting_days={posting_days} />
          </div>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {topPosts.length > 0 ? (
                <div className="space-y-4">
                  {topPosts.map((post, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm flex-1 mr-4">{post.text}</p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(post.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          {post.reposts}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.replies}
                        </div>
                        <div className="ml-auto">{post.engagement_rate.toFixed(2)}% engagement</div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={post.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No posts data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default Analytics
