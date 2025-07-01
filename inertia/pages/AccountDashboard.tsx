import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import PublicationCalendar from '../components/PublicationCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import {
  Users,
  TrendingUp,
  Calendar,
  MessageSquare,
  BarChart3,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

interface Account {
  id: number
  handle: string
  displayName: string
  followersCount: number
  followingCount: number
  postsCount: number
  avatar?: string
  description?: string
  verified?: boolean
  createdAt?: string
}

interface User {
  id: number
  email: string
  plan?: string
}

interface AccountDashboardProps {
  account: Account
  posting_days?: Array<{ date: string; count: number }>
}

function AccountDashboard({ account, posting_days = [] }: AccountDashboardProps) {
  const { props } = usePage()
  const user = props.user as User

  const handleRefreshStats = async () => {
    try {
      const response = await fetch(`/account/${account.id}/refresh-stats`)
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error refreshing stats:', error)
    }
  }

  return (
    <>
      <Head title={`${account.handle} - Account Dashboard`} />
      <Layout user={user}>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {account.handle[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">@{account.handle}</h1>
                  {account.verified && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{account.displayName || account.handle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefreshStats}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Stats
              </Button>
              <Button asChild>
                <a
                  href={`https://bsky.app/profile/${account.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Bluesky
                </a>
              </Button>
            </div>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{account.followersCount.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Following</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {account.followingCount?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {account.postsCount?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href={`/analytics/${account.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    View detailed analytics and engagement metrics for this account.
                  </p>
                </CardContent>
              </Card>
            </a>

            <a href={`/analytics/${account.id}/audience`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Audience Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Analyze your audience demographics and interests.
                  </p>
                  {user?.plan !== 'pro' && (
                    <Badge variant="outline" className="mt-2">
                      Pro Feature
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </a>

            <a href="/add/schedule">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Schedule Post
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Schedule a new post for this account.</p>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Account Description */}
          {account.description && (
            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{account.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Publication Calendar */}
          <PublicationCalendar posting_days={posting_days} />
        </div>
      </Layout>
    </>
  )
}

export default AccountDashboard
