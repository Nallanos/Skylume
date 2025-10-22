import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Progress } from '../components/ui/progress'
import { Search, Loader2, Save, Plus, List } from 'lucide-react'
import ListCreatorResults from '../components/ListCreatorResults'
import { Alert, AlertDescription } from '../components/ui/alert'

interface ProfileResult {
  username: string
  did: string
  bio: string
  displayName?: string
  avatar?: string
  followersCount?: number
  score: number
}

interface Account {
  id: number
  handle: string
  displayName: string
}

interface ListCreatorProps {
  accounts: Account[]
}

export default function ListCreator({ accounts }: ListCreatorProps) {
  const { props } = usePage()
  const user = props.user as any
  
  const [keywords, setKeywords] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [limit, setLimit] = useState<string>('50')
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all')
  const [results, setResults] = useState<ProfileResult[]>([])
  const [cursors, setCursors] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<any>(null)
  
  const [userLists, setUserLists] = useState<any[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  // Load user's lists on mount
  useEffect(() => {
    loadUserLists()
  }, [])

  const loadUserLists = async () => {
    try {
      const response = await fetch('/api/list-creator/lists')
      const data = await response.json()
      if (data.status === 'success') {
        setUserLists(data.data || [])
      }
    } catch (err) {
      console.error('Error loading lists:', err)
    }
  }

  const handleSearch = async (append = false, customLimit?: number) => {
    setError(null)
    setIsLoading(true)

    try {
      if (!keywords.trim()) {
        setError('Please enter at least one keyword')
        setIsLoading(false)
        return
      }

      if (!selectedAccount) {
        setError('Please select an account')
        setIsLoading(false)
        return
      }

      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      
      if (keywordsArray.length > 5) {
        setError('Please use maximum 5 keywords for better results')
        setIsLoading(false)
        return
      }

      const searchLimit = customLimit || parseInt(limit) || 50
      // Prepare cursor and existing handles for pagination
      const payload: any = {
        keywords: keywordsArray,
        account_id: selectedAccount,
        limit: searchLimit
      }
      if (append) {
        payload.cursor = cursors
        payload.existing_handles = results.map(r => r.username)
      }
      if (relationshipFilter && relationshipFilter !== 'all') {
        payload.relationship_filter = relationshipFilter
      }
      const response = await fetch('/api/list-creator/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (data.status === 'error') {
        setError(data.message || 'An error occurred')
        setIsLoading(false)
        return
      }

      if (append) {
        // Append new results and remove duplicates
        const existingHandles = new Set(results.map(r => r.username))
        const newResults = data.data.filter((r: ProfileResult) => !existingHandles.has(r.username))
        console.log(`Adding ${newResults.length} new profiles (${results.length} -> ${results.length + newResults.length})`)
        
        // Combine and sort by score (highest first)
        const combined = [...results, ...newResults]
        const sorted = combined.sort((a, b) => b.score - a.score)
        setResults(sorted)
      } else {
        setResults(data.data || [])
      }
      // Update cursors for pagination
      if (data.meta?.cursors) {
        setCursors(data.meta.cursors)
      }
      setMeta(data.meta)
      
      if (data.meta?.message) {
        setError(data.meta.message)
      }
      
      console.log('Search complete:', data)
    } catch (err) {
      console.error('Error:', err)
      setError('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchMore = async (multiplier: number) => {
    const currentLimit = parseInt(limit) || 50
    const newLimit = Math.min(currentLimit * multiplier, 100)
    console.log(`Searching more: ${newLimit} profiles (multiplier: ${multiplier})`)
    await handleSearch(true, newLimit)
  }

  const handleSaveList = async () => {
    if (!listName.trim()) {
      setError('Please enter a list name')
      return
    }

    if (results.length === 0) {
      setError('No profiles to save')
      return
    }

    setIsSaving(true)
    setSaveProgress(0)
    setError(null)

    try {
      const profiles = results.map(r => ({
        handle: r.username,
        displayName: r.displayName,
        bio: r.bio,
        avatar: r.avatar,
        followersCount: r.followersCount,
        score: r.score
      }))

      const profilesToSave = profiles.slice(0, 50)
      
      // Use fetch with ReadableStream for real-time progress updates
      const response = await fetch('/api/list-creator/save-list-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: listName,
          description: listDescription,
          account_id: selectedAccount,
          profiles: profilesToSave
        }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.progress >= 0) {
              setSaveProgress(data.progress)
            }

            if (data.progress === 100 && data.data) {
              // Success!
              setIsSaving(false)
              
              await loadUserLists()
              
              setTimeout(() => {
                setShowSaveModal(false)
                setListName('')
                setListDescription('')
                setSaveProgress(0)
                alert(`List "${data.data.name}" created with ${data.data.memberCount} members!`)
              }, 500)
            }

            if (data.progress === -1) {
              // Error
              setIsSaving(false)
              setError(data.error || 'Failed to save list')
            }
          }
        }
      }

    } catch (err) {
      console.error('Error saving list:', err)
      setError('Failed to save list')
      setIsSaving(false)
    }
  }

  return (
    <Layout user={user}>
      <Head title="List Creator - Find relevant profiles" />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">List Creator</h1>
            <p className="text-muted-foreground">
              Find and score Bluesky profiles based on keywords using AI semantic analysis
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/list-creator/blacklist'}
          >
            View Blacklist
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Search Configuration</CardTitle>
              <CardDescription>
                Enter keywords to find relevant profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="account">Select Account</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        @{acc.handle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="keywords">Keywords (comma-separated, max 5)</Label>
                <Input
                  id="keywords"
                  placeholder="marketing, SaaS, growth"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Use 2-3 keywords for best results
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="limit">Profile Limit (10-100)</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="10"
                    max="100"
                    placeholder="50"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="relationshipFilter">Relationship Filter</Label>
                  <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All profiles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All profiles</SelectItem>
                      <SelectItem value="not_following">Not following</SelectItem>
                      <SelectItem value="following">Following</SelectItem>
                      <SelectItem value="mutual">Mutual follows</SelectItem>
                      <SelectItem value="followed_by">They follow me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSearch(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {results.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSearchMore(1)}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Search More
                  </Button>
                  <Button
                    onClick={() => handleSearchMore(5)}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Search More 5x
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {results.length > 0
                  ? `${results.length} profiles displayed`
                  : 'Results will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meta && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Profiles displayed:</span>
                    <span>{results.length}</span>
                  </div>
                  <div className="mt-2">
                    <span className="font-medium">Keywords:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {meta.keywords.map((kw: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {results.length > 0 ? (
                <>
                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full mb-4"
                    variant="default"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Bluesky List
                  </Button>
                  <div className="max-h-[600px] overflow-y-auto">
                    <ListCreatorResults profiles={results} />
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No results yet</p>
                  <p className="text-sm mt-1">
                    Configure your search and click Search Profiles
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User's Saved Lists */}
        {userLists.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Your Saved Lists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLists.map((list: any) => (
                <Card key={list.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      {list.name}
                    </CardTitle>
                    <CardDescription>
                      {list.memberCount} members • Created {new Date(list.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
                    )}
                    <Button
                      onClick={() => router.visit(`/list-creator/lists/${list.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      View List & Follow All
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Save List Modal */}
        <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Bluesky List</DialogTitle>
              <DialogDescription>
                Create a new list with the top {Math.min(results.length, 50)} profiles from your search
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="listName">List Name</Label>
                <Input
                  id="listName"
                  placeholder="e.g. SaaS Marketers"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="listDesc">Description (optional)</Label>
                <Textarea
                  id="listDesc"
                  placeholder="Describe your list..."
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              {isSaving && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Creating list and adding members...</span>
                    <span>{saveProgress}%</span>
                  </div>
                  <Progress value={saveProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    This may take a few moments
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveModal(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveList} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating... {saveProgress}%
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create List
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}
