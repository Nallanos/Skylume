import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import AccountCard from '../components/AccountCard'
import AddAccount from '../components/AddAccount'
import { Plus, Users, BarChart2, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card'

interface Account {
  id: number
  handle: string
  displayName: string
  followersCount: number
  postsCount: number
  engagementRate?: string
  isRateLimited?: boolean
}

interface User {
  id: number
  email: string
  scheduledCount?: number
  followersCount?: number
  followersGrowth?: number
  subscription?: {
    plan: string
  }
}

interface DashboardProps {
  accounts: Account[]
}

function Dashboard({ accounts }: DashboardProps) {
  const { props } = usePage()
  const user = props.user as User

  if (accounts.length === 0) {
    return (
      <>
        <Head title="Dashboard" />
        <Layout user={user}>
          <div className="animate-fade-in-up">
            <AddAccount />
          </div>
        </Layout>
      </>
    )
  }

  return (
    <>
      <Head title="Dashboard" />
      <Layout user={user}>
        {/* Welcome Section */}
        <div className="py-8 rounded-2xl">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span>{user.email.split('@')[0]}</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your Bluesky presence and schedule your next posts.
          </p>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              {accounts.length} connected Bluesky account{accounts.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href="/add/account">
              <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
              Add Account
            </a>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="overflow-hidden border-primary/10 group relative hover:shadow-md hover:border-blue-400/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardHeader className="pb-2 pt-4 relative">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{accounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active Bluesky accounts</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/10 group relative hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardHeader className="pb-2 pt-4 relative">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{user.scheduledCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending publications</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-primary/10 group relative hover:shadow-md hover:border-blue-400/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardHeader className="pb-2 pt-4 relative">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">
                {user.followersCount || 0}
                {user.followersGrowth !== undefined && user.followersGrowth > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                    +{user.followersGrowth}
                  </span>
                )}
                {user.followersGrowth !== undefined && user.followersGrowth < 0 && (
                  <span className="text-xs text-blue-500 dark:text-blue-300 ml-1">
                    {user.followersGrowth}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total followers</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Your Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium mb-1">Schedule a Post</h3>
                  <p className="text-sm text-muted-foreground">Plan your content in advance</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button asChild variant="outline" className="w-full">
                  <a href="/add/schedule">Schedule</a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium mb-1">DM Campaign</h3>
                  <p className="text-sm text-muted-foreground">Create direct message campaigns</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button asChild variant="outline" className="w-full">
                  <a href="/add/campaign">Create</a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium mb-1">Manage Feeds</h3>
                  <p className="text-sm text-muted-foreground">Monitor relevant content</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button asChild variant="outline" className="w-full">
                  <a href="/feed">Manage</a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="cursor-pointer transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                    <BarChart2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium mb-1">Analytics</h3>
                  <p className="text-sm text-muted-foreground">Track your performance</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button asChild variant="outline" className="w-full">
                  <a href="/analytics">View</a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default Dashboard
