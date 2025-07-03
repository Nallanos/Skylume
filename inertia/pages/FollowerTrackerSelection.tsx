import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Users, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

interface Account {
  id: number
  handle: string
  displayName?: string
  followersCount: number
  postsCount: number
  isRateLimited?: boolean
}

interface FollowerTrackerSelectionProps {
  accounts: Account[]
}

function FollowerTrackerSelection({ accounts }: FollowerTrackerSelectionProps) {
  const { props } = usePage()
  const user = props.user as any

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num
  }

  return (
    <>
      <Head title="Follower Tracker - Select Account" />
      <Layout user={user}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Follower Tracker</h1>
                <p className="text-muted-foreground">
                  Select an account to track and manage your followers
                </p>
              </div>
            </div>
          </div>

          {/* Account Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-500/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-semibold mb-1 truncate">
                        {account.handle}
                      </CardTitle>
                      {account.displayName && (
                        <p className="text-sm text-muted-foreground truncate">
                          {account.displayName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {account.isRateLimited ? (
                        <Badge variant="destructive" className="text-xs">
                          Rate Limited
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Followers
                      </p>
                      <p className="font-bold text-lg">
                        {formatNumber(account.followersCount || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Posts
                      </p>
                      <p className="font-bold text-lg">{formatNumber(account.postsCount || 0)}</p>
                    </div>
                  </div>

                  {/* Rate Limited Warning */}
                  {account.isRateLimited && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        This account is rate limited. Some features may not work properly.
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    asChild
                    className="w-full group-hover:bg-blue-600 transition-colors"
                    disabled={account.isRateLimited}
                  >
                    <a href={`/accounts/${account.id}/follower-tracker`}>
                      <Users className="h-4 w-4 mr-2" />
                      Track Followers
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {accounts.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Accounts Found</h3>
                <p className="text-muted-foreground mb-6">
                  You need to connect a Bluesky account before you can use the Follower Tracker.
                </p>
                <Button asChild>
                  <a href="/add/account">Connect Account</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </>
  )
}

export default FollowerTrackerSelection
