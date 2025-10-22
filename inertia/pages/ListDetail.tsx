import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Loader2, UserPlus, ExternalLink, Check, ArrowLeft, Trash2, Ban } from 'lucide-react'
import { Progress } from '../components/ui/progress'

interface ListMember {
  id: number
  did: string
  handle: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  followersCount: number
  score: number | null
  isFollowed: boolean
}

interface List {
  id: number
  name: string
  description: string | null
  memberCount: number
  listUri: string | null
  createdAt: string
  members: ListMember[]
}

interface ListDetailProps {
  list: List
}

export default function ListDetail({ list }: ListDetailProps) {
  const { props } = usePage()
  const user = props.user as any
  
  const members = list.members
  const [isFollowingAll, setIsFollowingAll] = useState(false)
  const [followProgress, setFollowProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [blacklistStates, setBlacklistStates] = useState<Record<string, boolean>>({})

  const unfollowedCount = members.filter(m => !m.isFollowed).length
  const followedCount = members.filter(m => m.isFollowed).length

  const handleBlacklist = async (member: ListMember) => {
    if (!confirm(`Blacklist @${member.handle}? They will be excluded from all future searches.`)) {
      return
    }

    setBlacklistStates(prev => ({ ...prev, [member.did]: true }))
    
    try {
      const response = await fetch('/api/list-creator/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did: member.did,
          handle: member.handle,
          display_name: member.displayName,
          bio: member.bio,
          avatar: member.avatar,
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(`@${member.handle} has been blacklisted`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.message || 'Failed to blacklist profile')
        setBlacklistStates(prev => ({ ...prev, [member.did]: false }))
      }
    } catch (err) {
      console.error('Error blacklisting profile:', err)
      setError('Failed to blacklist profile')
      setBlacklistStates(prev => ({ ...prev, [member.did]: false }))
    }
  }

  const handleFollowAll = async () => {
    setIsFollowingAll(true)
    setError(null)
    setSuccess(null)
    setFollowProgress(0)

    try {
      // Get user's first account (TODO: allow account selection)
      const response = await fetch(`/api/list-creator/lists/${list.id}/follow-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: user.accounts?.[0]?.id || ''
        }),
      })

      const data = await response.json()

      if (data.status === 'error') {
        setError(data.message || 'Failed to follow all')
      } else {
        setSuccess(`Successfully followed ${data.data.followed} profiles!`)
        // Refresh the page to get updated follow statuses
        window.location.reload()
      }
    } catch (err) {
      console.error('Error following all:', err)
      setError('Failed to follow all members')
    } finally {
      setIsFollowingAll(false)
    }
  }

  return (
    <Layout user={user}>
      <Head title={`${list.name} - List Detail`} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List Creator
        </Button>

        {/* List Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">{list.name}</CardTitle>
                <CardDescription className="text-base">
                  {list.description || 'No description'}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{list.memberCount}</div>
                <div className="text-sm text-muted-foreground">members</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge variant="secondary" className="text-sm py-2">
                <Check className="mr-1 h-4 w-4" />
                {followedCount} followed
              </Badge>
              <Badge variant="outline" className="text-sm py-2">
                <UserPlus className="mr-1 h-4 w-4" />
                {unfollowedCount} to follow
              </Badge>
            </div>

            <div className="flex gap-3">
              {unfollowedCount > 0 && (
                <Button
                  onClick={handleFollowAll}
                  disabled={isFollowingAll}
                  size="lg"
                  className="flex-1"
                >
                  {isFollowingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Following All Members...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Follow All {unfollowedCount} Members
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                size="lg"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
                    try {
                      const response = await fetch(`/api/list-creator/lists/${list.id}`, {
                        method: 'DELETE',
                      })
                      const data = await response.json()
                      if (data.status === 'success') {
                        window.location.href = '/list-creator'
                      } else {
                        setError(data.message || 'Failed to delete list')
                      }
                    } catch (err) {
                      setError('Failed to delete list')
                    }
                  }
                }}
                className={unfollowedCount === 0 ? 'w-full' : 'flex-shrink-0'}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete List
              </Button>
            </div>

            {isFollowingAll && (
              <div className="mt-4">
                <Progress value={followProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Following members... This may take a few minutes
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 border-green-500 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Members List */}
        <h2 className="text-2xl font-bold mb-4">List Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar || ''} alt={member.handle} />
                    <AvatarFallback>
                      {member.displayName?.[0] || member.handle[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {member.displayName || member.handle}
                      </h3>
                      {member.isFollowed && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{member.handle}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {member.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {member.bio}
                  </p>
                )}
                {member.score && (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs">
                      Match: {(member.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(`https://bsky.app/profile/${member.handle}`, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBlacklist(member)}
                    disabled={blacklistStates[member.did]}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Blacklist this profile"
                  >
                    <Ban className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {list.listUri && (
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => {
                const parts = list.listUri!.split('/')
                window.open(`https://bsky.app/profile/${parts[2]}/lists/${parts.pop()}`, '_blank')
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Bluesky
            </Button>
          </div>
        )}
      </div>
    </Layout>
  )
}
