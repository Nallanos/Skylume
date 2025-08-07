import { Head, usePage } from '@inertiajs/react'
import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Heart, MessageCircle, Repeat2, ExternalLink, Hash, ArrowLeft, AlertCircle, Loader2, Filter, Calendar, TrendingUp } from 'lucide-react'

interface Post {
  text: string | null | undefined
  likes: number | null | undefined
  reposts: number | null | undefined
  replies: number | null | undefined
  views: number | null | undefined
  date: string | null
  url: string | null | undefined
  engagement_rate: number | null | undefined
  weighted_engagement_rate: number | null | undefined
  author?: {
    handle: string
    displayName?: string
    avatar?: string
    did: string
  }
  embed?: {
    images?: Array<{
      alt: string
      src: string
      aspectRatio?: { width: number; height: number }
    }>
  }
}

interface Account {
  id: string
  handle: string
  did: string
}

interface User {
  id: number
  email: string
  account?: Account[]
}

interface FeedIdProps {
  posts: any[]
  currentFeedId: number | null
  keywordCursor: Map<string, string | null>
  account: Account
  processingTime?: number
  isLoading?: boolean
}

// Transform raw backend data to expected Post format
function transformRawPost(rawPost: any): Post {
  // If it's already in the correct format, return as is
  if (rawPost.likes !== undefined && rawPost.likeCount === undefined) {
    return rawPost as Post
  }

  // Calculate engagement rate if not provided
  const likes = rawPost.likeCount ?? rawPost.likes ?? 0
  const reposts = rawPost.repostCount ?? rawPost.reposts ?? 0
  const replies = rawPost.replyCount ?? rawPost.replies ?? 0
  const quotes = rawPost.quoteCount ?? 0
  const views = rawPost.views ?? null // Bluesky doesn't provide view counts typically
  
  const totalEngagement = likes + reposts + replies + quotes
  // Use total engagement as a proxy for views if no view data available
  const estimatedViews = views ?? Math.max(totalEngagement * 10, 100) // Estimate views as 10x engagement
  const calculatedEngagementRate = estimatedViews > 0 ? (totalEngagement / estimatedViews) * 100 : 0

  // Transform from Bluesky API format
  const transformed: Post = {
    text: rawPost.record?.text || rawPost.text || null,
    likes: likes,
    reposts: reposts,
    replies: replies,
    views: estimatedViews,
    date: rawPost.record?.createdAt || rawPost.indexedAt || rawPost.date || null,
    url: rawPost.uri ? `https://bsky.app/profile/${rawPost.author?.handle}/post/${rawPost.uri.split('/').pop()}` : rawPost.url || null,
    engagement_rate: rawPost.engagement_rate ?? calculatedEngagementRate,
    weighted_engagement_rate: rawPost.weighted_engagement_rate ?? calculatedEngagementRate,
    author: rawPost.author ? {
      handle: rawPost.author.handle || '',
      displayName: rawPost.author.displayName || '',
      avatar: rawPost.author.avatar || '',
      did: rawPost.author.did || ''
    } : undefined,
    embed: rawPost.embed && rawPost.embed.images ? {
      images: rawPost.embed.images.map((img: any) => ({
        alt: img.alt || '',
        src: img.fullsize || img.thumb || '',
        aspectRatio: img.aspectRatio
      }))
    } : undefined
  }

  // Debug log for the first few posts
  if (Math.random() < 0.1) { // Log 10% of posts
    console.log('Raw post:', rawPost)
    console.log('Transformed post:', transformed)
  }

  return transformed
}

// Memoized PostCard component for better performance
const PostCard = memo(({ 
  post, 
  index, 
  formatNumber, 
  formatDate, 
  truncateText, 
  handleUrlClick,
  onError 
}: { 
  post: Post
  index: number
  formatNumber: (num: number | null | undefined) => string
  formatDate: (date: string | null) => string
  truncateText: (text: string | null | undefined, maxLength?: number) => string
  handleUrlClick: (e: React.MouseEvent, url: string | null | undefined) => void
  onError: (index: number) => void
}) => {
  try {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          {/* Author Header */}
          <div className="flex items-start space-x-3 mb-3">
            {/* Author Avatar */}
            <div className="flex-shrink-0">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={`${post.author.displayName || post.author.handle} avatar`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {(post.author?.displayName || post.author?.handle || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Author Info and Engagement Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {post.author?.displayName || post.author?.handle || 'Unknown User'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>@{post.author?.handle || 'unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(post.date)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {formatNumber((post.likes ?? 0) + (post.reposts ?? 0) + (post.replies ?? 0))} engagements
                  </Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <a 
                      href={post.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => handleUrlClick(e, post.url)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {truncateText(post.text, 280)}
            </p>
          </div>

          {/* Post Images */}
          {post.embed?.images && post.embed.images.length > 0 && (
            <div className="mb-3">
              {post.embed.images.length === 1 ? (
                // Single image - full width, max height 400px
                <div className="relative overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
                  <img
                    src={post.embed.images[0].src}
                    alt={post.embed.images[0].alt || 'Image'}
                    className="w-full max-h-96 object-contain hover:scale-105 transition-transform cursor-pointer bg-center"
                    onClick={() => window.open(post.embed?.images?.[0]?.src, '_blank')}
                  />
                </div>
              ) : post.embed.images.length === 2 ? (
                // Two images - side by side
                <div className="grid grid-cols-2 gap-2">
                  {post.embed.images.slice(0, 2).map((image, imgIndex) => (
                    <div key={imgIndex} className="relative overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
                      <img
                        src={image.src}
                        alt={image.alt || `Image ${imgIndex + 1}`}
                        className="w-full h-48 object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(image.src, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              ) : post.embed.images.length === 3 ? (
                // Three images - first one large on left, two stacked on right
                <div className="grid grid-cols-2 gap-2 h-96">
                  <div className="relative overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
                    <img
                      src={post.embed.images[0].src}
                      alt={post.embed.images[0].alt || 'Image 1'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(post.embed?.images?.[0]?.src, '_blank')}
                    />
                  </div>
                  <div className="grid grid-rows-2 gap-2">
                    {post.embed.images.slice(1, 3).map((image, imgIndex) => (
                      <div key={imgIndex + 1} className="relative overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
                        <img
                          src={image.src}
                          alt={image.alt || `Image ${imgIndex + 2}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(image.src, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Four or more images - 2x2 grid
                <div className="grid grid-cols-2 gap-2 h-96">
                  {post.embed.images.slice(0, 4).map((image, imgIndex) => (
                    <div key={imgIndex} className="relative overflow-hidden rounded-lg border bg-gray-100 dark:bg-gray-800">
                      <img
                        src={image.src}
                        alt={image.alt || `Image ${imgIndex + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(image.src, '_blank')}
                      />
                      {post.embed?.images && post.embed.images.length > 4 && imgIndex === 3 && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            +{post.embed.images.length - 4} more
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer">
                <Heart className="h-4 w-4" />
                <span>{formatNumber(post.likes)}</span>
              </div>
              <div className="flex items-center gap-1 hover:text-green-500 transition-colors cursor-pointer">
                <Repeat2 className="h-4 w-4" />
                <span>{formatNumber(post.reposts)}</span>
              </div>
              <div className="flex items-center gap-1 hover:text-blue-500 transition-colors cursor-pointer">
                <MessageCircle className="h-4 w-4" />
                <span>{formatNumber(post.replies)}</span>
              </div>
            </div>
            
            <div className="text-xs">
              Total: {formatNumber((post.likes ?? 0) + (post.reposts ?? 0) + (post.replies ?? 0))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Error rendering post:', error, post)
    onError(index)
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardContent className="text-center py-6">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400">
            Error displaying post #{index + 1}
          </p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-2">
            Check console for details
          </p>
        </CardContent>
      </Card>
    )
  }
})

function FeedId({ posts = [], currentFeedId, keywordCursor, account, processingTime, isLoading: initialLoading = false }: FeedIdProps) {
  const { props } = usePage()
  const user = props.user as User
  const [errorPosts, setErrorPosts] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [feedPosts, setFeedPosts] = useState(posts)
  const [feedProcessingTime, setFeedProcessingTime] = useState(processingTime)
  
  // Filter states
  const [minEngagement, setMinEngagement] = useState(0)
  const [minDate, setMinDate] = useState('')

  // Transform and filter out invalid posts
  const validPosts = useMemo(() => 
    feedPosts
      .filter(post => post && typeof post === 'object')
      .map(post => transformRawPost(post))
      .filter(post => {
        // Basic validity check
        if (!(post.text || post.likes !== null || post.reposts !== null)) return false
        
        // Calculate total engagement (without quotes for now since not in interface)
        const totalEngagement = (post.likes ?? 0) + (post.reposts ?? 0) + (post.replies ?? 0)
        
        // Apply engagement filter
        if (totalEngagement < minEngagement) return false
        
        // Apply date filter
        if (minDate && post.date) {
          const postDate = new Date(post.date)
          const filterDate = new Date(minDate)
          if (postDate < filterDate) return false
        }
        
        return true
      }), 
    [feedPosts, minEngagement, minDate]
  )

  // Memoize utility functions to avoid recreation on every render
  const formatNumber = useCallback((num: number | null | undefined) => {
    const value = num ?? 0
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }, [])

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }, [])

  const truncateText = useCallback((text: string | null | undefined, maxLength: number = 200) => {
    if (!text) return 'No content available'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }, [])

  // Handle URL click with proper error handling
  const handleUrlClick = useCallback((e: React.MouseEvent, url: string | null | undefined) => {
    if (!url) {
      e.preventDefault()
      alert('No URL available for this post')
    }
  }, [])

  // Handle post rendering errors
  const handlePostError = useCallback((index: number) => {
    setErrorPosts(prev => [...prev, index])
  }, [])

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setMinEngagement(0)
    setMinDate('')
  }, [])

  // Enhanced refresh with async API and better feedback
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    setLoadingMessage('Fetching posts in parallel...')
    
    try {
      const params = new URLSearchParams()
      if (minEngagement > 0) {
        params.append('minEngagement', minEngagement.toString())
      }
      if (minDate) {
        params.append('minDate', minDate)
      }
      
      const url = `/api/feed/${currentFeedId}/getPosts${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLoadingMessage(`Found ${data.totalPosts} posts in ${data.processingTime}ms`)
          setFeedPosts(data.posts)
          setFeedProcessingTime(data.processingTime)
          setIsLoading(false)
        } else {
          throw new Error(data.error || 'Failed to fetch posts')
        }
      } else {
        throw new Error('Network error')
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      setLoadingMessage('Error fetching posts. Please try again.')
      setIsLoading(false)
    }
  }, [currentFeedId, minEngagement, minDate])

  // Auto-fetch posts when component mounts if in loading state
  useEffect(() => {
    if (initialLoading && currentFeedId) {
      handleRefresh()
    }
  }, [initialLoading, currentFeedId, handleRefresh])

  // Reset loading state when posts change
  useEffect(() => {
    if (!initialLoading) {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [initialLoading])

  return (
    <>
      <Head title={`Feed - @${account.handle}`} />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <a href="/feed">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Feeds
                </a>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                  <Hash className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    @{account.handle}
                  </h1>
                  <p className="text-muted-foreground">
                    Feed #{currentFeedId} • {validPosts.length} posts
                    {feedPosts.length > validPosts.length && (
                      <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                        ({feedPosts.length - validPosts.length} filtered out)
                      </span>
                    )}
                    {feedProcessingTime && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        • Processed in {feedProcessingTime}ms
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {loadingMessage || 'Processing...'}
                </>
              ) : (
                'Refresh Posts'
              )}
            </Button>
          </div>

          {/* Keywords Info */}
          {keywordCursor && Object.keys(keywordCursor).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keywords Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(keywordCursor).map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters - Inspired by FollowerTracker UI */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-2xl">
                  <div className="flex gap-2 flex-1">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="min-engagement" className="text-xs font-medium text-muted-foreground">
                        Min. Engagement
                      </Label>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="min-engagement"
                          type="number"
                          min={0}
                          value={minEngagement}
                          onChange={(e) => setMinEngagement(Number(e.target.value))}
                          placeholder="0"
                          className="w-24"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="min-date" className="text-xs font-medium text-muted-foreground">
                        Date From
                      </Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="min-date"
                          type="date"
                          value={minDate}
                          onChange={(e) => setMinDate(e.target.value)}
                          className="w-36"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    disabled={minEngagement === 0 && minDate === ''}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                  
                  {(minEngagement > 0 || minDate) && (
                    <Badge variant="secondary" className="ml-2">
                      {[
                        minEngagement > 0 && `≥${minEngagement} eng.`,
                        minDate && `from ${new Date(minDate).toLocaleDateString()}`
                      ].filter(Boolean).join(', ')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Summary */}
          {errorPosts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <p className="text-orange-700 dark:text-orange-300">
                    {errorPosts.length} post{errorPosts.length > 1 ? 's' : ''} failed to render properly. Check the console for more details.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Grid */}
          {validPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {validPosts.map((post, index) => (
                <PostCard 
                  key={index} 
                  post={post} 
                  index={index}
                  formatNumber={formatNumber}
                  formatDate={formatDate}
                  truncateText={truncateText}
                  handleUrlClick={handleUrlClick}
                  onError={handlePostError}
                />
              ))}
              {/* Button to refresh post and complete feed */}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {loadingMessage || 'Refreshing...'}
                  </>
                ) : (
                  'Refresh Feed'
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-muted-foreground">No valid posts to display.</p>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export default FeedId
