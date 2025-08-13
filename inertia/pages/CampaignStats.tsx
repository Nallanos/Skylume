import { Head, Link } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { ArrowLeft, Users, MessageSquare, Eye, CheckCircle, XCircle, AlertCircle, Clock, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'

interface User {
  id: number
  email: string
  name?: string
}

interface FollowerCampaign {
  id: number
  followerHandle: string
  followerDisplayName?: string
  followerBio?: string
  followerDid: string
  interestLevel: 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'
  similarityScore?: number
  messageSent: boolean
  responseReceived?: boolean
  messageSentAt?: string
  responseReceivedAt?: string
  bioQuality?: string
  alreadyContacted?: boolean
}

interface CampaignStats {
  campaign: {
    id: number
    name: string
    analysisStatus: string
    totalFollowersAnalyzed: number
    interestedFollowers: number
    moderatelyInterestedFollowers: number
    notInterestedFollowers: number
    excludedFollowers: number
    cannotDetermineFollowers: number
    targetCount: number
    messagesSent: number
    interestedThreshold?: number
    moderatelyInterestedThreshold?: number
    analysisStartedAt: string | null
    analysisCompletedAt: string | null
    executionStartedAt: string | null
    executionCompletedAt: string | null
  }
  breakdown: {
    total: number
    interested: number
    moderatelyInterested: number
    notInterested: number
    cannotDetermine: number
    messagesSent: number
    responsesReceived: number
    excluded: number
  }
}

interface CampaignStatsProps {
  user: User
  stats: CampaignStats | null
  followersData?: {
    followers: FollowerCampaign[]
    pagination: {
      currentPage: number
      totalPages: number
      totalCount: number
      hasNextPage: boolean
      hasPrevPage: boolean
      perPage: number
    } | null
    counts: Record<string, number>
    filters: {
      filter: string
      search: string
      sortBy: string
    }
  }
  error?: string
}

export default function CampaignStats({ user, stats, followersData, error }: CampaignStatsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'>(
    (followersData?.filters?.filter as any) || 'overview'
  )
  const [searchTerm, setSearchTerm] = useState(followersData?.filters?.search || '')
  const [sortBy, setSortBy] = useState<'similarity_desc' | 'similarity_asc' | 'handle' | 'none'>(
    (followersData?.filters?.sortBy as any) || 'similarity_desc'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [countingResponses, setCountingResponses] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Récupérer les followers depuis les données paginées
  const followers = followersData?.followers || []
  const pagination = followersData?.pagination
  const serverFollowerCounts = followersData?.counts || {}

  // Fonction pour charger les données avec les nouveaux filtres
  const loadFollowersData = useCallback(async (
    newActiveTab?: string,
    newSearchTerm?: string,
    newSortBy?: string,
    newPage?: number
  ) => {
    if (!stats?.campaign.id) return

    setIsLoading(true)
    const searchParams = new URLSearchParams(window.location.search)
    
    if (newActiveTab !== undefined) searchParams.set('filter', newActiveTab)
    if (newSearchTerm !== undefined) searchParams.set('search', newSearchTerm)
    if (newSortBy !== undefined) searchParams.set('sort', newSortBy)
    if (newPage !== undefined) searchParams.set('page', newPage.toString())

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
    
    // Utiliser Inertia pour recharger les données
    window.location.reload()
  }, [stats?.campaign.id])

  // Gestionnaire de changement de recherche avec debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      loadFollowersData(activeTab, value, sortBy, 1)
    }, 500)
  }, [activeTab, sortBy, loadFollowersData])

  // Gestionnaire de changement d'onglet
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab as any)
    loadFollowersData(newTab, searchTerm, sortBy, 1)
  }, [searchTerm, sortBy, loadFollowersData])

  // Gestionnaire de changement de tri
  const handleSortChange = useCallback((newSort: string) => {
    setSortBy(newSort as any)
    loadFollowersData(activeTab, searchTerm, newSort, 1)
  }, [activeTab, searchTerm, loadFollowersData])

  // Gestionnaire de changement de page
  const handlePageChange = useCallback((newPage: number) => {
    loadFollowersData(activeTab, searchTerm, sortBy, newPage)
  }, [activeTab, searchTerm, sortBy, loadFollowersData])

  // Gestionnaire pour compter les réponses
  const handleCountResponses = useCallback(async () => {
    if (!stats?.campaign?.id) return
    
    setCountingResponses(true)
    try {
      const response = await fetch(`/campaign/${stats.campaign.id}/count-responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(`Response counting completed! Updated ${data.updatedCount} followers with responses.`)
          // Recharger la page pour afficher les données mises à jour
          window.location.reload()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to count responses')
      }
    } catch (error) {
      console.error('Error counting responses:', error)
      alert('Error counting responses. Please try again.')
    } finally {
      setCountingResponses(false)
    }
  }, [stats?.campaign?.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Les followers sont déjà filtrés côté serveur, donc on les utilise directement
  const filteredFollowers = followers

  console.log(filteredFollowers)

  // Utiliser les compteurs du serveur au lieu de recalculer côté client
  const followerCounts = useMemo(() => {
    return {
      interested: serverFollowerCounts.interested || 0,
      moderately_interested: serverFollowerCounts.moderately_interested || 0,
      not_interested: serverFollowerCounts.not_interested || 0,
      excluded: serverFollowerCounts.excluded || 0,
      cannot_determine: serverFollowerCounts.cannot_determine || 0
    }
  }, [serverFollowerCounts])

  // Get interest level configuration
  const getInterestConfig = (level: string) => {
    switch (level) {
      case 'interested':
        return { label: 'Interested', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' }
      case 'moderately_interested':
        return { label: 'Moderately Interested', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' }
      case 'not_interested':
        return { label: 'Not Interested', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', }
      case 'excluded':
        return { label: 'Excluded', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' }
      case 'cannot_determine':
        return { label: 'Cannot Determine', color: 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300'}
      default:
        return { label: level, color: 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300' }
    }
  }
  if (error || !stats) {
    return (
      <>
        <Head title="Campaign Stats - Error" />
        <Layout user={user}>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/campaign">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Campaigns
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Campaign Statistics</h1>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-red-600">
                  <XCircle className="h-12 w-12 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Error Loading Campaign</h2>
                  <p className="text-muted-foreground">{error || 'Campaign not found or access denied.'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </>
    )
  }

  const { campaign, breakdown } = stats

  console.log('Campaign Stats:', stats)
  // Calculate percentages for progress bars
  const totalAnalyzed = campaign.totalFollowersAnalyzed || 1 // Avoid division by zero
  const interestedPercent = ((campaign.interestedFollowers || 0) / totalAnalyzed) * 100
  const moderatelyInterestedPercent = ((campaign.moderatelyInterestedFollowers || 0) / totalAnalyzed) * 100
  const notInterestedPercent = ((campaign.notInterestedFollowers || 0) / totalAnalyzed) * 100
  const excludedPercent = ((campaign.excludedFollowers || 0) / totalAnalyzed) * 100
  const cannotDeterminePercent = ((campaign.cannotDetermineFollowers || 0) / totalAnalyzed) * 100

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Head title={`${campaign.name} - Campaign Stats`} />
      <Layout user={user}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/campaign">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <p className="text-muted-foreground">Campaign Statistics</p>
            </div>
            {getStatusBadge(campaign.analysisStatus)}
          </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Overview Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyzed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{breakdown.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">followers processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interested</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{breakdown.interested}</div>
              <p className="text-xs text-muted-foreground">{interestedPercent.toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{breakdown.messagesSent}</div>
              <p className="text-xs text-muted-foreground">target: {campaign.targetCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responses</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{breakdown.responsesReceived}</div>
              <p className="text-xs text-muted-foreground">
                {breakdown.messagesSent > 0 ? ((breakdown.responsesReceived / breakdown.messagesSent) * 100).toFixed(1) : 0}% response rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed analysis */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detailed Analysis
              </CardTitle>
              <CardDescription>Browse followers by interest level and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {/* AI Thresholds Info */}
              {(campaign.interestedThreshold || campaign.moderatelyInterestedThreshold) && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    AI Classification Thresholds Used
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-700 dark:text-purple-300">Interested:</span>
                      <span className="ml-2 font-mono bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
                        {((campaign.interestedThreshold || 0.7) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300">Moderately Interested:</span>
                      <span className="ml-2 font-mono bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded">
                        {((campaign.moderatelyInterestedThreshold || 0.5) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    Followers with similarity scores above these thresholds were categorized accordingly
                  </p>
                </div>
              )}
              
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={activeTab === 'interested' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('interested')}
                  className="flex items-center gap-1"
                >
                  Interested ({breakdown.interested})
                </Button>
                <Button
                  variant={activeTab === 'moderately_interested' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('moderately_interested')}
                  className="flex items-center gap-1"
                >
                   Moderately ({breakdown.moderatelyInterested})
                </Button>
                <Button
                  variant={activeTab === 'not_interested' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('not_interested')}
                  className="flex items-center gap-1"
                >
                   Not Interested ({breakdown.notInterested})
                </Button>
                <Button
                  variant={activeTab === 'excluded' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('excluded')}
                  className="flex items-center gap-1"
                >
                   Excluded ({breakdown.excluded})
                </Button>
                <Button
                  variant={activeTab === 'cannot_determine' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabChange('cannot_determine')}
                  className="flex items-center gap-1"
                >
                  Cannot Determine ({breakdown.cannotDetermine})
                </Button>
              </div>

              {/* Search Bar and Sort Controls for non-overview tabs */}
              {activeTab !== 'overview' && (
                <div className="mb-6 flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search followers..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="w-48">
                    <Select 
                      value={sortBy} 
                      onValueChange={handleSortChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="similarity_desc">Highest Match First</SelectItem>
                        <SelectItem value="similarity_asc">Lowest Match First</SelectItem>
                        <SelectItem value="handle">Handle A-Z</SelectItem>
                        <SelectItem value="none">No Sorting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Content based on active tab */}
              {activeTab === 'overview' ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Analysis Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Interest Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-600">Interested</span>
                          <span>{campaign.interestedFollowers} ({interestedPercent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={interestedPercent} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-yellow-600">Moderately Interested</span>
                          <span>{campaign.moderatelyInterestedFollowers} ({moderatelyInterestedPercent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={moderatelyInterestedPercent} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-600">Not Interested</span>
                          <span>{campaign.notInterestedFollowers} ({notInterestedPercent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={notInterestedPercent} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-purple-600">Excluded</span>
                          <span>{campaign.excludedFollowers} ({excludedPercent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={excludedPercent} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Cannot Determine</span>
                          <span>{campaign.cannotDetermineFollowers} ({cannotDeterminePercent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={cannotDeterminePercent} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline</CardTitle>
                      <CardDescription>Campaign milestones and execution timeline</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {campaign.analysisStartedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">Analysis Started</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(campaign.analysisStartedAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {campaign.analysisCompletedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">Analysis Completed</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(campaign.analysisCompletedAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {campaign.executionStartedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">Execution Started</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(campaign.executionStartedAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {campaign.executionCompletedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <div>
                            <p className="font-medium">Execution Completed</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(campaign.executionCompletedAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {!campaign.analysisStartedAt && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div>
                            <p className="font-medium text-muted-foreground">No activity yet</p>
                            <p className="text-sm text-muted-foreground">Campaign analysis has not started</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Followers List */
                <div className="space-y-4">
                  {isLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading followers...</p>
                    </div>
                  )}
                  
                  {!isLoading && filteredFollowers.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {pagination ? (
                            <>
                              Showing {((pagination.currentPage - 1) * pagination.perPage) + 1}-{Math.min(pagination.currentPage * pagination.perPage, pagination.totalCount)} 
                              of {pagination.totalCount} followers
                              {searchTerm && ` matching "${searchTerm}"`}
                            </>
                          ) : (
                            <>
                              Showing {filteredFollowers.length} followers
                              {searchTerm && ` matching "${searchTerm}"`}
                            </>
                          )}
                        </p>
                      </div>
                      
                      {/* Pagination Controls Top */}
                      {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage || isLoading}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          
                          <span className="text-sm text-muted-foreground">
                            Page {pagination.currentPage} of {pagination.totalPages}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage || isLoading}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {filteredFollowers.map((follower) => {
                          const config = getInterestConfig(follower.interestLevel)
                          // Bluesky profile URL (web)
                          const profileUrl = `https://bsky.app/profile/${follower.followerHandle}`
                          return (
                            <div
                              key={follower.id}
                              className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card transition-all duration-200 shadow-sm hover:shadow-lg hover:border-purple-400 dark:hover:border-purple-500"
                            >
                              {/* Avatar placeholder */}
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {follower.followerHandle?.charAt(0).toUpperCase()}
                                </span>
                              </div>

                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium truncate">
                                    {follower.followerDisplayName || follower.followerHandle}
                                  </h3>
                                  <Badge variant="secondary" className={`text-xs ${config.color}`}>
                                   {config.label}
                                  </Badge>
                                  {follower.alreadyContacted && (
                                    <Badge variant="outline" className="text-xs">
                                      ✉️ Sent
                                    </Badge>
                                  )}
                                  {follower.responseReceived && (
                                    <Badge variant="outline" className="text-xs">
                                      💬 Replied
                                    </Badge>
                                  )}
                                  {/* Bluesky profile icon */}
                                  <a
                                    href={profileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Voir le profil Bluesky"
                                    className="ml-1 text-blue-500 hover:text-blue-700 transition-colors"
                                    style={{ display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    {/* Simple external/profile icon (Lucide: ExternalLink) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="inline-block">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m5-3h3m0 0v3m0-3-9 9" />
                                    </svg>
                                  </a>
                                </div>
                                <p className="text-sm text-muted-foreground">@{follower.followerHandle}</p>
                                {follower.followerBio && (
                                  <p className="text-sm text-muted-foreground truncate mt-1">
                                    {follower.followerBio}
                                  </p>
                                )}
                              </div>

                              {/* Similarity Score */}
                              {follower.similarityScore !== undefined && (
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {(follower.similarityScore * 100).toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">match</p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Pagination Controls Bottom */}
                      {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between py-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            {pagination.totalCount} total followers
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(pagination.currentPage - 1)}
                              disabled={!pagination.hasPrevPage || isLoading}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            
                            <span className="text-sm text-muted-foreground px-4">
                              Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(pagination.currentPage + 1)}
                              disabled={!pagination.hasNextPage || isLoading}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No followers found in this category.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Link href={`/campaign/${campaign.id}`}>
            <Button>
              View Campaign Dashboard
            </Button>
          </Link>
          
          <Link href={`/campaign/${campaign.id}/followers`}>
            <Button variant="outline">
              View Analyzed Followers
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={handleCountResponses}
            disabled={countingResponses}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {countingResponses ? 'Counting...' : 'Count Responses'}
          </Button>
        </div>
        </div>
      </Layout>
    </>
  )
}
