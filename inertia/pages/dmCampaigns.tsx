import { Head, usePage, Link } from '@inertiajs/react'
import { useState } from 'react'
import Layout from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { 
  MessageSquare, 
  Plus, 
  BarChart3,
  Play,
  Pause,
  Trash2,
  Brain,
  Target,
  Eye
} from 'lucide-react'

interface User {
  id: number
  email: string
}

interface DmCampaign {
  id: number
  name: string
  // message supprimé - maintenant dans campaign_messages
  accountHandle: string
  strategy: string
  keywords: string
  analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed'
  totalFollowersAnalyzed: number
  interestedFollowers: number
  moderatelyInterestedFollowers: number
  notInterestedFollowers: number
  cannotDetermineFollowers: number
  targetCount: number
  number_of_message_sent: number
  status: boolean
  checkConversationsStatus?: string
  lastConversationCheck?: string
}

interface PageProps {
  campaigns: DmCampaign[]
  user: User
  [key: string]: any
}

function DMCampaigns() {
  const { campaigns, user } = usePage<PageProps>().props
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({})
  const [countingResponses, setCountingResponses] = useState<{ [key: number]: boolean }>({})
  const [toggleLoading, setToggleLoading] = useState<{ [key: number]: boolean }>({}) // ✅ FIX: Add toggle loading state

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      in_progress: { label: 'Analyzing', variant: 'default' },
      completed: { label: 'Ready', variant: 'default' },
      failed: { label: 'Failed', variant: 'destructive' }
    }
    return statusMap[status] || { label: 'Unknown', variant: 'secondary' }
  }

  const handleAnalyze = async (campaignId: number) => {
    setLoading({ ...loading, [campaignId]: true })
    try {
      const response = await fetch(`/campaign/${campaignId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Reload the page to show updated status
          window.location.reload()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to start analysis')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
      alert('Error starting analysis. Please try again.')
    } finally {
      setLoading({ ...loading, [campaignId]: false })
    }
  }

  const handleToggleStatus = async (campaignId: number) => {
    // ✅ FIX: Prevent duplicate requests
    if (toggleLoading[campaignId]) {
      console.log(`Toggle already in progress for campaign ${campaignId}`)
      return
    }

    const campaign = campaigns.find(c => c.id === campaignId)
    
    // ✅ FIX: Add confirmation for critical actions
    if (campaign?.status && campaign.number_of_message_sent > 0) {
      if (!confirm('This will toggle the status of an active campaign. Are you sure?')) {
        return
      }
    }

    console.log(`🔄 Toggling campaign ${campaignId} status at:`, new Date().toISOString())
    
    setToggleLoading({ ...toggleLoading, [campaignId]: true })
    
    try {
      const response = await fetch(`/campaign/toggle/${campaignId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log(`✅ Campaign ${campaignId} status toggled successfully`)
          // Reload the page to show updated status
          window.location.reload()
        }
      } else {
        const errorData = await response.json()
        console.error(`❌ Failed to toggle campaign ${campaignId} status:`, errorData)
        alert(errorData.error || 'Failed to toggle campaign status')
      }
    } catch (error) {
      console.error(`❌ Error toggling campaign ${campaignId} status:`, error)
      alert('Error toggling campaign status. Please try again.')
    } finally {
      setToggleLoading({ ...toggleLoading, [campaignId]: false })
    }
  }

  const handleDelete = async (campaignId: number) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        const response = await fetch(`/campaign/delete/${campaignId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Reload the page to show updated campaigns list
            window.location.reload()
          }
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to delete campaign')
        }
      } catch (error) {
        console.error('Error deleting campaign:', error)
        alert('Error deleting campaign. Please try again.')
      }
    }
  }

  const handleCountResponses = async (campaignId: number) => {
    setCountingResponses({ ...countingResponses, [campaignId]: true })
    try {
      const response = await fetch(`/campaign/${campaignId}/count-responses`, {
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
      setCountingResponses({ ...countingResponses, [campaignId]: false })
    }
  }

  return (
    <>
      <Head title="DM Campaigns" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DM Campaigns
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered direct message campaigns with semantic targeting
              </p>
            </div>

            <Link href="/add-ai-campaign">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>

          {/* Campaigns List */}
          {campaigns && campaigns.length > 0 ? (
            <div className="grid gap-6">
              {campaigns.map((campaign) => {
                const statusBadge = getStatusBadge(campaign.analysisStatus)
                const totalAnalyzed = campaign.totalFollowersAnalyzed || 0
                const interested = campaign.interestedFollowers || 0
                const moderate = campaign.moderatelyInterestedFollowers || 0
                
                return (
                  <Card key={campaign.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                            {campaign.status && (
                              <Badge variant="default" className="bg-green-500">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Account: @{campaign.accountHandle}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Keywords: {JSON.parse(campaign.keywords || '[]').join(', ')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Link href={`/campaign/${campaign.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                          
                          {campaign.analysisStatus === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAnalyze(campaign.id)}
                              disabled={loading[campaign.id]}
                            >
                              <Brain className="h-4 w-4 mr-2" />
                              Re-analyze
                            </Button>
                          )}

                          {campaign.analysisStatus === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCountResponses(campaign.id)}
                              disabled={countingResponses[campaign.id]}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {countingResponses[campaign.id] ? 'Counting...' : 'Count Responses'}
                            </Button>
                          )}
                          
                          {campaign.analysisStatus === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleAnalyze(campaign.id)}
                              disabled={loading[campaign.id]}
                            >
                              <Brain className="h-4 w-4 mr-2" />
                              Start Analysis
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(campaign.id)}
                            disabled={toggleLoading[campaign.id]} // ✅ FIX: Disable during loading
                          >
                            {toggleLoading[campaign.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : campaign.status ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(campaign.id)}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Campaign Configuration */}
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Strategy:</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.strategy || 'Default strategy'} - Multiple message templates configured
                        </p>
                      </div>

                      {/* Analysis Results */}
                      {campaign.analysisStatus === 'completed' && totalAnalyzed > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Analysis Results</span>
                            <span className="text-muted-foreground">
                              {totalAnalyzed} followers analyzed
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="font-semibold text-green-700 dark:text-green-400">
                                {interested}
                              </div>
                              <div className="text-green-600 dark:text-green-500">Interested</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                              <div className="font-semibold text-yellow-700 dark:text-yellow-400">
                                {moderate}
                              </div>
                              <div className="text-yellow-600 dark:text-yellow-500">Moderate</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <div className="font-semibold text-red-700 dark:text-red-400">
                                {campaign.notInterestedFollowers || 0}
                              </div>
                              <div className="text-red-600 dark:text-red-500">Not Interested</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
                              <div className="font-semibold text-gray-700 dark:text-gray-400">
                                {campaign.cannotDetermineFollowers || 0}
                              </div>
                              <div className="text-gray-600 dark:text-gray-500">Unknown</div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Targeting Progress</span>
                              <span>{campaign.number_of_message_sent} sent</span>
                            </div>
                            <Progress 
                              value={
                                campaign.targetCount > 0 
                                  ? (campaign.number_of_message_sent / campaign.targetCount) * 100 
                                  : 0
                              } 
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Link href={`/campaign/${campaign.id}/stats`}>
                              <Button size="sm" variant="outline">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Stats
                              </Button>
                            </Link>
                            
                            {(interested + moderate) > 0 && (
                              <Link href={`/dashboard/campaigns/${campaign.id}/execution`}>
                                <Button size="sm">
                                  <Target className="h-4 w-4 mr-2" />
                                  Execute Campaign
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Analysis in Progress */}
                      {campaign.analysisStatus === 'in_progress' && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">
                            Analyzing followers with AI...
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-6 mx-auto">
                <MessageSquare className="h-10 w-10" />
              </div>

              <h2 className="text-2xl font-bold mb-4">No Campaigns Yet</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                Create your first AI-powered DM campaign to start engaging with your audience
                through semantic targeting and personalized messaging.
              </p>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Brain className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">AI Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Semantic analysis of follower bios to find your target audience
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Target className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Smart Targeting</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically categorize followers by interest level and engagement potential
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      Track campaign performance with detailed statistics and insights
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Link href="/add-ai-campaign">
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Campaign
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export default DMCampaigns
