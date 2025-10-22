import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Trash2, ArrowLeft } from 'lucide-react'

interface BlacklistEntry {
  id: number
  did: string
  handle: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  reason: string | null
  createdAt: string
}

export default function Blacklist() {
  const { props } = usePage()
  const user = props.user as any
  
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadBlacklist()
  }, [])

  const loadBlacklist = async () => {
    try {
      const response = await fetch('/api/list-creator/blacklist')
      const data = await response.json()
      
      if (data.status === 'success') {
        setBlacklist(data.data)
      } else {
        setError(data.message || 'Failed to load blacklist')
      }
    } catch (err) {
      console.error('Error loading blacklist:', err)
      setError('Failed to load blacklist')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (did: string, handle: string) => {
    if (!confirm(`Remove @${handle} from blacklist?`)) {
      return
    }

    try {
      const response = await fetch(`/api/list-creator/blacklist/${encodeURIComponent(did)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(`@${handle} removed from blacklist`)
        setBlacklist(prev => prev.filter(entry => entry.did !== did))
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.message || 'Failed to remove from blacklist')
      }
    } catch (err) {
      console.error('Error removing from blacklist:', err)
      setError('Failed to remove from blacklist')
    }
  }

  return (
    <Layout user={user}>
      <Head title="Blacklist - List Creator" />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/list-creator'}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List Creator
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Blacklist</h1>
          <p className="text-muted-foreground">
            Profiles in your blacklist will be excluded from all future searches
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Loading blacklist...
            </CardContent>
          </Card>
        ) : blacklist.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Your blacklist is empty. Click the ban icon on any profile to add them here.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {blacklist.length} blacklisted profile{blacklist.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blacklist.map((entry) => (
                <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={entry.avatar || ''} alt={entry.handle} />
                        <AvatarFallback>
                          {entry.displayName?.[0] || entry.handle[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {entry.displayName || entry.handle}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{entry.handle}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {entry.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {entry.bio}
                      </p>
                    )}
                    {entry.reason && (
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          Reason: {entry.reason}
                        </Badge>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`https://bsky.app/profile/${entry.handle}`, '_blank')}
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(entry.did, entry.handle)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
