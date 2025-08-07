import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import {
  Users,
  Target,
  ArrowLeft,
  MessageSquare,
  Loader,
  BarChart3,
  Send,
  Settings,
  Save,
  Brain,
  X,
} from 'lucide-react'

interface User {
  id: number
  email: string
  plan?: string
}

interface Campaign {
  id: number
  name: string
  message: string
  accountHandle: string
  strategy: string
  keywords: string // Backend sends JSON string
  excludeKeywords?: string // New field for exclude keywords
  targetCount: number
  analysisStatus: string
  executionStatus?: string
  interestedThreshold?: number
  moderatelyInterestedThreshold?: number
  createdAt: string
  updatedAt: string
}

interface FollowerCampaign {
  id: number
  followerHandle: string
  followerDisplayName?: string
  followerBio?: string
  similarityScore?: number
  messageSent: boolean
  responseReceived?: boolean
  messageSentAt?: string
  responseReceivedAt?: string
}

interface CampaignBreakdown {
  total: number
  interested: number
  moderatelyInterested: number
  notInterested: number
  excluded: number
  cannotDetermine: number
  messagesSent: number
  responsesReceived: number
}

interface CampaignStatsData {
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
  interestedThreshold: number
  moderatelyInterestedThreshold: number
  analysisStartedAt?: string
  analysisCompletedAt?: string
  executionStartedAt?: string
  executionCompletedAt?: string
}

interface CampaignStats {
  campaign: CampaignStatsData
  breakdown: CampaignBreakdown
}

interface CampaignDashboardProps {
  user: User
  campaign: Campaign
  stats?: CampaignStats
  followers?: FollowerCampaign[]
}

function CampaignDashboard({ user, campaign, stats }: CampaignDashboardProps) {
  const [localCampaign, setLocalCampaign] = useState(campaign)
  const [localStats, setLocalStats] = useState(stats)
  const [isPolling, setIsPolling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [editedCampaign, setEditedCampaign] = useState({
    name: campaign.name,
    message: campaign.message,
    targetCount: campaign.targetCount,
    keywords: campaign.keywords,
    excludeKeywords: campaign.excludeKeywords || '[]',
    interestedThreshold: campaign.interestedThreshold || 0.7,
    moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold || 0.5
  })
  const [saving, setSaving] = useState(false)

  // Helper function to parse keywords from JSON string
  const parseKeywords = (keywords: string): string[] => {
    try {
      if (typeof keywords === 'string') {
        const parsed = JSON.parse(keywords)
        return Array.isArray(parsed) ? parsed : []
      }
      return Array.isArray(keywords) ? keywords : []
    } catch (error) {
      console.error('Error parsing keywords:', error)
      // Fallback: split by comma if it's not valid JSON
      return typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(k => k) : []
    }
  }

  // Helper function to format keywords array to JSON string
  const formatKeywords = (keywords: string[]): string => {
    return JSON.stringify(keywords)
  }

  // Save campaign changes
  const handleSaveCampaign = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/campaign/${campaign.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          name: editedCampaign.name,
          message: editedCampaign.message,
          targetCount: editedCampaign.targetCount,
          keywords: editedCampaign.keywords,
          excludeKeywords: editedCampaign.excludeKeywords,
          interestedThreshold: editedCampaign.interestedThreshold,
          moderatelyInterestedThreshold: editedCampaign.moderatelyInterestedThreshold
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocalCampaign(prev => ({
            ...prev,
            ...editedCampaign
          }))
          setIsEditingSettings(false)
          alert('Campaign updated successfully!')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to update campaign')
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Error updating campaign. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle keyword changes
  const handleKeywordChange = (type: 'keywords' | 'excludeKeywords', keywords: string[]) => {
    setEditedCampaign(prev => ({
      ...prev,
      [type]: formatKeywords(keywords)
    }))
  }

  // Polling function to check analysis status
  const pollAnalysisStatus = async () => {
    try {
      const response = await fetch(`/api/campaign/${campaign.id}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.campaign) {
          setLocalCampaign(prev => ({
            ...prev,
            analysisStatus: data.campaign.analysisStatus,
            totalFollowersAnalyzed: data.campaign.totalFollowersAnalyzed,
            interestedFollowers: data.campaign.interestedFollowers,
            moderatelyInterestedFollowers: data.campaign.moderatelyInterestedFollowers,
            notInterestedFollowers: data.campaign.notInterestedFollowers,
            excludedFollowers: data.campaign.excludedFollowers,
            cannotDetermineFollowers: data.campaign.cannotDetermineFollowers,
            messagesSent: data.campaign.messagesSent
          }))
          setLocalStats(data)
        }

        // Stop polling if analysis is completed or failed
        if (
          data.campaign &&
          ['completed', 'failed', 'error'].includes(data.campaign.analysisStatus)
        ) {
          setIsPolling(false)

          // Refresh followers list if analysis completed
          if (data.campaign.analysisStatus === 'completed') {
            fetchFollowers()
          }
        }
      }
    } catch (error) {
      console.error('Error polling analysis status:', error)
    }
  }

  // Fetch followers data
  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/campaign/${campaign.id}/followers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Optionally update local state with new followers data
        console.log('Followers updated:', data.followers)
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  // Set up polling when analysis is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPolling && localCampaign.analysisStatus === 'in_progress') {
      interval = setInterval(pollAnalysisStatus, 3000) // Poll every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPolling, localCampaign.analysisStatus, campaign.id])

  // Start polling when component mounts if analysis is already running
  useEffect(() => {
    if (localCampaign.analysisStatus === 'in_progress') {
      setIsPolling(true)
    }
  }, [localCampaign.analysisStatus])

  // Load stats on component mount if not already provided
  useEffect(() => {
    const loadInitialStats = async () => {
      if (!localStats) {
        try {
          const response = await fetch(`/api/campaign/${campaign.id}/stats`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          })

          if (response.ok) {
            const data = await response.json()
            setLocalStats(data)
          }
        } catch (error) {
          console.error('Error loading initial stats:', error)
        }
      }
    }

    loadInitialStats()
  }, [campaign.id, localStats])

  const handleStartAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/campaign/${campaign.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocalCampaign((prev) => ({ ...prev, analysisStatus: 'in_progress' }))
          setIsPolling(true)
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to start analysis')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
      alert('Error starting analysis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteCampaign = async () => {
    // Enhanced confirmation with disclaimer
    const confirmMessage = `⚠️ IMPORTANT DISCLAIMER ⚠️

Sending mass DMs can lead to account suspension or restrictions on Bluesky. 

This tool will automatically send messages to followers classified as "Interested" and "Moderately Interested" based on your keywords and AI analysis.

Use this feature responsibly and at your own risk. We recommend:
- Starting with a small target count
- Testing with a few messages first
- Respecting Bluesky's terms of service

Are you sure you want to proceed with executing this campaign?`

    if (!confirm(confirmMessage)) {
      return
    }

    // Second confirmation
    if (!confirm('Final confirmation: Execute the campaign and start sending DMs now?')) {
      return
    }

    try {
      const response = await fetch(`/campaign/${campaign.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocalCampaign((prev) => ({ ...prev, executionStatus: 'in_progress' }))
          alert('Campaign execution started!')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to execute campaign')
      }
    } catch (error) {
      console.error('Error executing campaign:', error)
      alert('Error executing campaign. Please try again.')
    }
  }

  const handleCountResponses = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/campaign/${campaign.id}/count-responses`, {
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
          // Refresh stats to show updated response counts
          pollAnalysisStatus()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to count responses')
      }
    } catch (error) {
      console.error('Error counting responses:', error)
      alert('Error counting responses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'in_progress':
        return 'bg-blue-600'
      case 'pending':
        return 'bg-gray-400'
      case 'failed':
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  // Keyword Editor Component
  const KeywordEditor = ({ 
    title, 
    keywords, 
    onChange, 
    placeholder = "Add keyword..." 
  }: { 
    title: string
    keywords: string[]
    onChange: (keywords: string[]) => void
    placeholder?: string
  }) => {
    const [newKeyword, setNewKeyword] = useState('')

    const addKeyword = () => {
      if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
        onChange([...keywords, newKeyword.trim()])
        setNewKeyword('')
      }
    }

    const removeKeyword = (keyword: string) => {
      onChange(keywords.filter(k => k !== keyword))
    }

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{title}</Label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder={placeholder}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            className="flex-1"
          />
          <Button type="button" onClick={addKeyword} size="sm">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="cursor-pointer hover:bg-red-100"
              onClick={() => removeKeyword(keyword)}
            >
              {keyword}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head title={`Campaign: ${campaign.name}`} />
      <Layout user={user}>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/campaign" className="p-2 hover:bg-accent rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
                <p className="text-muted-foreground">Campaign for @{campaign.accountHandle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={isEditingSettings} onOpenChange={setIsEditingSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Edit Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Campaign Settings</DialogTitle>
                    <DialogDescription>
                      Modify campaign parameters. Changes will take effect on the next analysis.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Campaign Name */}
                    <div>
                      <Label htmlFor="name">Campaign Name</Label>
                      <Input
                        id="name"
                        value={editedCampaign.name}
                        onChange={(e) => setEditedCampaign(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    {/* Target Count */}
                    <div>
                      <Label htmlFor="targetCount">Target Count</Label>
                      <Input
                        id="targetCount"
                        type="number"
                        min="1"
                        max="1000"
                        value={editedCampaign.targetCount}
                        onChange={(e) => setEditedCampaign(prev => ({ 
                          ...prev, 
                          targetCount: parseInt(e.target.value) || 0 
                        }))}
                        className="mt-1"
                      />
                    </div>

                    {/* Keywords */}
                    <KeywordEditor
                      title="Target Keywords"
                      keywords={parseKeywords(editedCampaign.keywords)}
                      onChange={(keywords) => handleKeywordChange('keywords', keywords)}
                      placeholder="Add target keyword..."
                    />

                    {/* Exclude Keywords */}
                    <KeywordEditor
                      title="Exclude Keywords"
                      keywords={parseKeywords(editedCampaign.excludeKeywords)}
                      onChange={(keywords) => handleKeywordChange('excludeKeywords', keywords)}
                      placeholder="Add exclude keyword..."
                    />

                    {/* AI Classification Thresholds */}
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          AI Classification Thresholds
                        </Label>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Customize similarity thresholds for categorizing followers
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="interestedThreshold" className="text-sm">
                            Interested Threshold
                          </Label>
                          <Input
                            id="interestedThreshold"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={editedCampaign.interestedThreshold}
                            onChange={(e) => setEditedCampaign(prev => ({ 
                              ...prev, 
                              interestedThreshold: parseFloat(e.target.value) || 0.7 
                            }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Default: 0.70 (70% similarity)
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="moderatelyInterestedThreshold" className="text-sm">
                            Moderately Interested Threshold  
                          </Label>
                          <Input
                            id="moderatelyInterestedThreshold"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={editedCampaign.moderatelyInterestedThreshold}
                            onChange={(e) => setEditedCampaign(prev => ({ 
                              ...prev, 
                              moderatelyInterestedThreshold: parseFloat(e.target.value) || 0.5 
                            }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Default: 0.50 (50% similarity)
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        💡 Higher values = more strict matching. Lower values = more inclusive.
                      </p>
                    </div>

                    {/* Message */}
                    <div>
                      <Label htmlFor="message">Message Template</Label>
                      <Textarea
                        id="message"
                        value={editedCampaign.message}
                        onChange={(e) => setEditedCampaign(prev => ({ ...prev, message: e.target.value }))}
                        rows={4}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Characters: {editedCampaign.message.length}/280
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditingSettings(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveCampaign}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      {saving ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Link href={`/campaign/${campaign.id}/stats`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  View Stats
                </Button>
              </Link>

              {localCampaign.analysisStatus === 'completed' && (
                <Button
                  variant="outline"
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Re-analyze
                </Button>
              )}

              {localCampaign.analysisStatus === 'pending' && (
                <Button 
                  onClick={handleStartAnalysis} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Start Analysis
                </Button>
              )}

              {localCampaign.analysisStatus === 'completed' && (
                <Button
                  variant="outline"
                  onClick={handleCountResponses}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Count Responses
                </Button>
              )}

              {localCampaign.analysisStatus === 'completed' &&
                localCampaign.executionStatus !== 'completed' && (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleExecuteCampaign}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      Execute Campaign
                    </Button>
                  </div>
                )}
            </div>
          </div>

          {/* Stats */}
          {localStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Analyzed
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localStats?.campaign?.totalFollowersAnalyzed || 0}</div>
                  <p className="text-xs text-muted-foreground">followers processed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Interested
                  </CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{localStats?.campaign?.interestedFollowers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                      ? (((localStats?.campaign?.interestedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                      : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Messages Sent
                  </CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localStats?.campaign?.messagesSent || 0}</div>
                  <p className="text-xs text-muted-foreground">target: {localStats?.campaign?.targetCount || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Responses
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{localStats?.breakdown?.responsesReceived || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(localStats?.campaign?.messagesSent || 0) > 0 
                      ? (((localStats?.breakdown?.responsesReceived || 0) / (localStats?.campaign?.messagesSent || 1)) * 100).toFixed(1)
                      : 0}% response rate
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Analysis Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis Status
                {isPolling && (
                  <div className="ml-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(localCampaign.analysisStatus)}`}
                ></div>
                <span className="font-medium">{getStatusText(localCampaign.analysisStatus)}</span>
                {localCampaign.analysisStatus === 'in_progress' && (
                  <Loader className="h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Breakdown */}
          {localStats && localStats.campaign && localStats.campaign.analysisStatus === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analysis Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Automatic Targeting
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    When you execute this campaign, we will automatically send messages to followers classified as 
                    <span className="font-semibold"> "Interested" </span> and 
                    <span className="font-semibold"> "Moderately Interested" </span> 
                    based on your keywords and AI similarity analysis.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{localStats?.campaign?.interestedFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Interested</p>
                    <p className="text-xs text-green-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.interestedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{localStats?.campaign?.moderatelyInterestedFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Moderately</p>
                    <p className="text-xs text-yellow-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.moderatelyInterestedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{localStats?.campaign?.notInterestedFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Not Interested</p>
                    <p className="text-xs text-red-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.notInterestedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{localStats?.campaign?.excludedFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Excluded</p>
                    <p className="text-xs text-purple-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.excludedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{localStats?.campaign?.cannotDetermineFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Cannot Determine</p>
                    <p className="text-xs text-gray-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.cannotDetermineFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Count</p>
                    <p className="text-sm">{localCampaign.targetCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Keywords</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parseKeywords(localCampaign.keywords).map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {localCampaign.excludeKeywords && parseKeywords(localCampaign.excludeKeywords).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Exclude Keywords</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseKeywords(localCampaign.excludeKeywords).map((keyword: string, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Message</p>
                    <div className="bg-muted/50 p-3 rounded-lg mt-1">
                      <p className="text-sm">{localCampaign.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default CampaignDashboard
