import { useState } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { UserPlus, Check, Loader2, ExternalLink, Ban } from 'lucide-react'
import { cn } from '../lib/utils'

interface ProfileResult {
  username: string
  did: string
  bio: string
  displayName?: string
  avatar?: string
  followersCount?: number
  score: number
}

interface ListCreatorResultsProps {
  profiles: ProfileResult[]
}

export default function ListCreatorResults({ profiles }: ListCreatorResultsProps) {
  const [followingStates, setFollowingStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
  const [blacklistStates, setBlacklistStates] = useState<Record<string, 'idle' | 'loading' | 'success'>>({})

  const handleFollow = async (username: string) => {
    setFollowingStates(prev => ({ ...prev, [username]: 'loading' }))
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setFollowingStates(prev => ({ ...prev, [username]: 'success' }))
      console.log(`Followed: ${username}`)
    } catch (error) {
      console.error(`Error following ${username}:`, error)
      setFollowingStates(prev => ({ ...prev, [username]: 'error' }))
      setTimeout(() => {
        setFollowingStates(prev => ({ ...prev, [username]: 'idle' }))
      }, 3000)
    }
  }

  const handleBlacklist = async (profile: ProfileResult) => {
    if (!confirm(`Blacklist @${profile.username}? They will be excluded from all future searches.`)) {
      return
    }

    setBlacklistStates(prev => ({ ...prev, [profile.did]: 'loading' }))
    try {
      const response = await fetch('/api/list-creator/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did: profile.did,
          handle: profile.username,
          display_name: profile.displayName,
          bio: profile.bio,
          avatar: profile.avatar,
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        setBlacklistStates(prev => ({ ...prev, [profile.did]: 'success' }))
        // Optionally reload the page to remove blacklisted profiles
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        alert(data.message || 'Failed to blacklist profile')
        setBlacklistStates(prev => ({ ...prev, [profile.did]: 'idle' }))
      }
    } catch (error) {
      console.error('Error blacklisting profile:', error)
      alert('Failed to blacklist profile')
      setBlacklistStates(prev => ({ ...prev, [profile.did]: 'idle' }))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500'
    if (score >= 0.5) return 'bg-yellow-500'
    if (score >= 0.3) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (profiles.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile, index) => {
        const followState = followingStates[profile.username] || 'idle'
        const scorePercent = Math.round(profile.score * 100)

        return (
          <Card key={profile.username} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-700' : 
                    'bg-gray-500'
                  )}>
                    #{index + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">
                      {profile.displayName || `@${profile.username}`}
                    </h3>
                    <a
                      href={`https://bsky.app/profile/${profile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge className={cn(getScoreColor(profile.score), "text-white")}>
                      {scorePercent}%
                    </Badge>

                    {profile.followersCount !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {profile.followersCount.toLocaleString()} followers
                      </span>
                    )}

                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all", getScoreColor(profile.score))}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex gap-2">
                  <Button
                    onClick={() => handleBlacklist(profile)}
                    disabled={blacklistStates[profile.did] === 'loading' || blacklistStates[profile.did] === 'success'}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {blacklistStates[profile.did] === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : blacklistStates[profile.did] === 'success' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleFollow(profile.username)}
                    disabled={followState === 'loading' || followState === 'success'}
                    variant={followState === 'success' ? 'outline' : 'default'}
                    size="sm"
                    className="min-w-[100px]"
                  >
                    {followState === 'loading' && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Following...
                      </>
                    )}
                    {followState === 'success' && (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Followed
                      </>
                    )}
                    {followState === 'idle' && (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Follow
                      </>
                    )}
                    {followState === 'error' && (
                      <>
                        Error
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
