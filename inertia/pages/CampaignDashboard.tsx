import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import VariableManager from '../components/VariableManager'
import GroupManager from '../components/GroupManager'
import GroupStats from '../components/GroupStats'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
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
  Variable,
  Group,
  AlertTriangle,
  UserCheck,
} from 'lucide-react'

import type {
  CampaignVariable,
  CampaignGroup,
  CampaignDashboardProps
} from '../types/campaign'

function CampaignDashboard({ user, campaign, stats }: CampaignDashboardProps) {
  const [localCampaign, setLocalCampaign] = useState(campaign)
  const [localStats, setLocalStats] = useState(stats)
  const [isPolling, setIsPolling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [variables, setVariables] = useState<CampaignVariable[]>(campaign?.variables || [])
  const [groups, setGroups] = useState<CampaignGroup[]>(campaign?.groups || [])
  const [editedCampaign, setEditedCampaign] = useState({
    name: campaign.name,
    // message field removed - now handled by campaign messages
    targetCount: campaign.targetCount,
    keywords: campaign.keywords || '[]',
    excludeKeywords: campaign.excludeKeywords || '[]',
    interestedThreshold: campaign.interestedThreshold || 0.7,
    moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold || 0.5
  })
  const [saving, setSaving] = useState(false)
  const [executionConfig, setExecutionConfig] = useState<Record<number, { enabled: boolean, targetCount: number }>>({})
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

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
          // message field removed - now handled by campaign messages
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

  // Refresh campaign variables
  const refreshVariables = async () => {
    try {
      const response = await fetch(`/campaign/${campaign.id}/variables`)
      if (response.ok) {
        const result = await response.json()
        setVariables(result.data || [])
      }
    } catch (error) {
      console.error('Failed to refresh variables:', error)
    }
  }

  // Refresh campaign groups
  const refreshGroups = async () => {
    try {
      // Demander les estimations pour avoir toutes les données
      const response = await fetch(`/campaign/${campaign.id}/groups?estimations=true`)
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || [])
      } else {
        console.error('Failed to fetch groups:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to refresh groups:', error)
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
            alreadyContactedFollowers: data.campaign.alreadyContactedFollowers,
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

  // Initialize execution config when groups change
  useEffect(() => {
    const newConfig: Record<number, { enabled: boolean, targetCount: number }> = {}
    groups.forEach(group => {
      newConfig[group.id] = {
        enabled: false,
        targetCount: group.targetCount || 0
      }
    })
    setExecutionConfig(newConfig)
  }, [groups])

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
    const selectedGroups = Object.entries(executionConfig)
      .filter(([_, config]) => config.enabled)
      .map(([groupId, config]) => ({
        groupId: parseInt(groupId),
        targetCount: config.targetCount
      }))

    if (selectedGroups.length === 0) {
      alert('Please select at least one group to execute.')
      return
    }

    setIsExecuting(true)
    try {
      const response = await fetch(`/campaign/${campaign.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          selectedGroups
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setLocalCampaign((prev) => ({ ...prev, executionStatus: 'in_progress' }))
          setIsExecutionModalOpen(false)
          alert('Campaign execution started!')
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to execute campaign')
      }
    } catch (error) {
      console.error('Error executing campaign:', error)
      alert('Error executing campaign. Please try again.')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleGroupExecutionToggle = (groupId: number, enabled: boolean) => {
    setExecutionConfig(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        enabled,
        targetCount: prev[groupId]?.targetCount || groups.find(g => g.id === groupId)?.targetCount || 0
      }
    }))
  }

  const handleGroupTargetCountChange = (groupId: number, targetCount: number) => {
    setExecutionConfig(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        targetCount
      }
    }))
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

  const handleMarkExistingConversations = async () => {
    if (!confirm('This will mark as "already contacted" all followers who have existing conversations with messages. Continue?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/campaign/${campaign.id}/mark-all-existing-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(`Successfully marked ${data.updatedCount} followers as already contacted.`)
          // Refresh stats to show updated counts
          pollAnalysisStatus()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to mark existing conversations')
      }
    } catch (error) {
      console.error('Error marking existing conversations:', error)
      alert('Error marking existing conversations. Please try again.')
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/campaign" className="p-2 hover:bg-accent rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{campaign.name}</h1>
                <p className="text-muted-foreground">Campaign for @{campaign.accountHandle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              <Dialog open={isEditingSettings} onOpenChange={setIsEditingSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" size="sm">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit Settings</span>
                    <span className="sm:hidden">Edit</span>
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

                    {/* Message Template section removed - now handled by campaign messages */}
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
                <Button variant="outline" className="flex items-center gap-2" size="sm">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">View Stats</span>
                  <span className="sm:hidden">Stats</span>
                </Button>
              </Link>

              {localCampaign.analysisStatus === 'completed' && (
                <Button
                  variant="outline"
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Re-analyze</span>
                  <span className="sm:hidden">Re-analyze</span>
                </Button>
              )}

              {localCampaign.analysisStatus === 'pending' && (
                <Button 
                  onClick={handleStartAnalysis} 
                  disabled={loading}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Start Analysis</span>
                  <span className="sm:hidden">Analyze</span>
                </Button>
              )}

              {/* Actions Dropdown Menu */}
              {localCampaign.analysisStatus === 'completed' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Actions</span>
                      <span className="sm:hidden">⋮</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Campaign Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCountResponses} disabled={loading}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Count Responses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMarkExistingConversations} disabled={loading}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Mark Existing Convos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Stats */}
          {localStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="bg-background border">
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

              <Card className="bg-background border">
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

              <Card className="bg-background border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Already Contacted
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{localStats?.campaign?.alreadyContactedFollowers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                      ? (((localStats?.campaign?.alreadyContactedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
                      : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border">
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

              <Card className="bg-background border">
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
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    <span className="font-semibold">Note:</span> Followers marked as "Already Contacted" will be automatically excluded from new campaigns to avoid duplicate messages.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                    <div className="text-2xl font-bold text-orange-600">{localStats?.campaign?.alreadyContactedFollowers || 0}</div>
                    <p className="text-xs text-muted-foreground">Already Contacted</p>
                    <p className="text-xs text-orange-600">
                      {(localStats?.campaign?.totalFollowersAnalyzed || 0) > 0 
                        ? (((localStats?.campaign?.alreadyContactedFollowers || 0) / (localStats?.campaign?.totalFollowersAnalyzed || 1)) * 100).toFixed(1)
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

          {/* Campaign Management Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="variables" className="flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    Variables
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center gap-2">
                    <Group className="h-4 w-4" />
                    Groups
                  </TabsTrigger>
                  <TabsTrigger value="execution" className="flex items-center gap-2" disabled={localCampaign.analysisStatus !== 'completed'}>
                    <Send className="h-4 w-4" />
                    Execution
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Target Count</p>
                        <p className="text-sm">
                          {groups.reduce((sum, group) => sum + (group.targetCount || 0), 0)}
                          {groups.length > 0 && (
                            <span className="text-muted-foreground ml-1">
                              ({groups.length} group{groups.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
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
                        <p className="text-sm font-medium text-muted-foreground">Variables</p>
                        <p className="text-sm">{variables.length} defined</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Target Groups</p>
                        <p className="text-sm">{groups.length} configured</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                        <p className="text-sm">
                          {groups.reduce((acc, group) => acc + (group.messages?.length || 0), 0)} messages
                        </p>
                      </div>
                      {localStats?.campaign && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Already Contacted</p>
                          <p className="text-sm flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-orange-600" />
                            {localStats.campaign.alreadyContactedFollowers || 0} followers
                            <span className="text-muted-foreground">
                              (excluded from targeting)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variables" className="space-y-4">
                  <VariableManager
                    campaignId={campaign.id}
                    variables={variables}
                    onVariableUpdate={refreshVariables}
                  />
                </TabsContent>

                <TabsContent value="groups" className="space-y-4">
                  {/* Statistiques des groupes */}
                  <GroupStats groups={groups} className="mb-6" />
                  
                  {/* Gestionnaire des groupes */}
                  <GroupManager
                    campaignId={campaign.id}
                    groups={groups.map(g => ({
                      ...g,
                      campaignId: g.campaign_id,
                      targetCount: g.targetCount,
                      messagesSent: g.messagesSent || 0,
                      order: g.priority,
                      createdAt: g.createdAt,
                      updatedAt: g.updatedAt
                    }))}
                    variables={variables.map(v => ({ name: v.name, type: v.type }))}
                    onGroupUpdate={refreshGroups}
                  />
                </TabsContent>

                <TabsContent value="execution" className="space-y-4">
                  <div className="space-y-6">
                    {/* Header avec disclaimer */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Campaign Execution</h4>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Select the groups you want to contact and specify the number of followers to message. 
                        Only analyzed followers will be contacted.
                      </p>
                    </div>

                    {/* Liste des groupes pour exécution */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium">Select Groups to Execute</h4>
                      
                      {groups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Group className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No groups configured yet. Create groups first to execute campaigns.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {groups.map((group) => {
                            const config = executionConfig[group.id] || { enabled: false, targetCount: group.targetCount || 0 }

                            return (
                              <Card key={group.id} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={config.enabled}
                                      onChange={(e) => handleGroupExecutionToggle(group.id, e.target.checked)}
                                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <div>
                                      <p className="font-medium">{group.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Available: {group.targetCount || 0} followers
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`target-${group.id}`} className="text-sm font-medium">
                                      Contact:
                                    </Label>
                                    <Input
                                      id={`target-${group.id}`}
                                      type="number"
                                      min="0"
                                      max={group.targetCount || 0}
                                      value={config.targetCount}
                                      onChange={(e) => handleGroupTargetCountChange(group.id, parseInt(e.target.value) || 0)}
                                      disabled={!config.enabled}
                                      className="w-20"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      followers
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bouton d'exécution */}
                    {groups.length > 0 && (
                      <div className="flex justify-center pt-4">
                        <Button
                          onClick={() => setIsExecutionModalOpen(true)}
                          disabled={Object.values(executionConfig).every(config => !config.enabled)}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Execute Selected Groups
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Modal de confirmation d'exécution */}
                  <Dialog open={isExecutionModalOpen} onOpenChange={setIsExecutionModalOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Campaign Execution Confirmation
                        </DialogTitle>
                        <DialogDescription>
                          Please review the execution details before proceeding.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {/* Disclaimer */}
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                            ⚠️ IMPORTANT DISCLAIMER
                          </h4>
                          <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                            <p>Sending mass DMs can lead to:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Account suspension or restrictions on Bluesky</li>
                              <li>User reports and complaints</li>
                              <li>Potential violations of Bluesky's terms of service</li>
                            </ul>
                            <p className="font-medium">Use this feature responsibly and at your own risk.</p>
                          </div>
                        </div>

                        {/* Récapitulatif des groupes */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Execution Summary</h4>
                          <div className="space-y-2">
                            {Object.entries(executionConfig)
                              .filter(([_, config]) => config.enabled)
                              .map(([groupId, config]) => {
                                const group = groups.find(g => g.id === parseInt(groupId))
                                if (!group) return null
                                
                                return (
                                  <div key={groupId} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div>
                                      <p className="font-medium">{group.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Available: {group.targetCount || 0} followers
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-blue-600">
                                        {config.targetCount} contacts
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                          
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                              <p className="font-medium">Total Messages to Send:</p>
                              <p className="font-bold text-lg text-blue-600">
                                {Object.entries(executionConfig)
                                  .filter(([_, config]) => config.enabled)
                                  .reduce((total, [_, config]) => total + config.targetCount, 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsExecutionModalOpen(false)}
                          disabled={isExecuting}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleExecuteCampaign}
                          disabled={isExecuting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isExecuting ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              Executing...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Confirm Execution
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export default CampaignDashboard
