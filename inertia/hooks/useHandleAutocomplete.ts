import { useState, useCallback } from 'react'

interface Actor {
  handle: string
  displayName: string
  avatar?: string
  description?: string
  followersCount: number
}

export function useHandleAutocomplete() {
  const [suggestions, setSuggestions] = useState<Actor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchHandles = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search/handles?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setSuggestions(data.actors || [])
    } catch (err) {
      console.error('Error searching handles:', err)
      setError('Failed to search for handles')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    isLoading,
    error,
    searchHandles,
    clearSuggestions
  }
}
