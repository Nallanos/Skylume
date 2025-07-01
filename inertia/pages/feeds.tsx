import { useState } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Plus, Loader, Trash2, Hash, Users } from 'lucide-react'

interface Feed {
  id: number
  account_id: number
  keywords: string
  createdAt: string
  account?: {
    handle: string
    displayName: string
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

  const [selectedAccount, setSelectedAccount] = useState('')
  const [keywords, setKeywords] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateFeed, setShowCreateFeed] = useState(feeds.length === 0)

  async function createFeed() {
    if (!selectedAccount || !keywords) return

    setIsLoading(true)
    try {
      await router.post('/feed/create', {
        account_id: selectedAccount,
        keywords,
      })
      setShowCreateFeed(false)
      setSelectedAccount('')
      setKeywords('')
    } catch (error) {
      console.error('Error creating feed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteFeed(feedId: number) {
    if (!confirm('Are you sure you want to delete this feed?')) return

    await router.delete(`/feed/delete/${feedId}`)
  }

  if (feeds.length === 0 || showCreateFeed) {
    return (
      <>
        <Head title="Feeds" />
        <Layout user={user}>
          <div className="max-w-4xl mx-auto">
            <header className="mb-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white mb-6 mx-auto">
                <Hash className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                Create Your First Feed
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Create custom feeds to track specific keywords and hashtags across Bluesky. Monitor
                conversations, competitors, and trends that matter to your brand.
              </p>
            </header>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Create Feed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="account">Select Account</Label>
                  <select
                    id="account"
                    className="w-full p-2 border rounded-md bg-background"
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    <option value="">Choose an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id.toString()}>
                        @{account.handle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., bluesky, social media, #hashtag"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate multiple keywords with commas
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={createFeed}
                    disabled={isLoading || !selectedAccount || !keywords}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Feed
                      </>
                    )}
                  </Button>

                  {feeds.length > 0 && (
                    <Button variant="outline" onClick={() => setShowCreateFeed(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
                          @{feed.account?.handle || 'Unknown'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(feed.createdAt).toLocaleDateString()}
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
                      <Label className="text-xs">Keywords</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {feed.keywords.split(',').map((keyword, index) => (
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
