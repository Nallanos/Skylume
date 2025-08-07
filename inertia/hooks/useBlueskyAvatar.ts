import { useState, useEffect } from 'react'

interface BlueskyProfile {
  avatar?: string
  displayName?: string
  description?: string
}

interface UseBlueskyAvatarReturn {
  avatar: string | null
  loading: boolean
  error: string | null
}

export function useBlueskyAvatar(handle: string): UseBlueskyAvatarReturn {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!handle) {
      setLoading(false)
      return
    }

    const fetchAvatar = async () => {
      try {
        setLoading(true)
        setError(null)

        // Appel à l'API Bluesky pour récupérer le profil
        const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`)
        }

        const profile: BlueskyProfile = await response.json()
        
        if (profile.avatar) {
          setAvatar(profile.avatar)
        } else {
          setAvatar(null)
        }
      } catch (err) {
        console.error('Error fetching Bluesky avatar:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setAvatar(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAvatar()
  }, [handle])

  return { avatar, loading, error }
}
