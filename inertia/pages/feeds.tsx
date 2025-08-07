import { useState, useEffect } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import AddFeed from '../components/AddFeed'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Plus, Trash2, Hash } from 'lucide-react'

interface Feed {
  id: number
  account_id: string
  keywordsCursor: { [key: string]: string | null }
  userId: string
  accountHandle: string
  createdAt?: string
  account?: {
    id: string
    handle: string
    displayName?: string
  }
}

interface Account {
  id: number
  handle: string
  displayName: string
}

interface User {
  id: number
  email: string
  account?: Account[]
}

interface FeedsProps {
  feeds?: Feed[]
}

function Feeds({ feeds = [] }: FeedsProps) {
  const { props } = usePage()
  const user = props.user as User
  const accounts = user.account || []

  const [showCreateFeed, setShowCreateFeed] = useState(feeds.length === 0)

  // Reset showCreateFeed when feeds change (after successful creation)
  useEffect(() => {
    if (feeds.length > 0 && showCreateFeed) {
      setShowCreateFeed(false)
    }
  }, [feeds.length, showCreateFeed])

  async function deleteFeed(feedId: number) {
    if (!confirm('Are you sure you want to delete this feed?')) return

    await router.delete(`/feed/delete/${feedId}`)
  }

  if (feeds.length === 0 || showCreateFeed) {
    return (
      <>
        <Head title="Feeds" />
        <Layout user={user}>
          <AddFeed 
            accounts={accounts}
            isFirstFeed={feeds.length === 0}
            onCancel={feeds.length > 0 ? () => setShowCreateFeed(false) : undefined}
          />
        </Layout>
      </>
    )
  }

  return (
    <>
      <Head title="Feeds" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Your Feeds</h1>
              <p className="text-muted-foreground mt-1">
                Monitor keywords and hashtags across Bluesky
              </p>
            </div>

            <Button
              onClick={() => setShowCreateFeed(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Feed
            </Button>
          </div>

          {/* Feeds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feeds.map((feed) => (
              <Card key={feed.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                        <Hash className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          @{feed.account?.handle || feed.accountHandle || 'Unknown'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {feed.createdAt ? `Created ${new Date(feed.createdAt).toLocaleDateString()}` : 'Unknown date'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFeed(feed.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Keywords</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.keys(feed.keywordsCursor || {}).map((keyword: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-muted rounded-md text-xs">
                            {keyword.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={`/feed/${feed.id}`}>View Feed</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {feeds.length === 0 && (
            <div className="text-center py-12">
              <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No feeds yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first feed to start monitoring keywords and hashtags
              </p>
              <Button onClick={() => setShowCreateFeed(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Feed
              </Button>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export default Feeds
