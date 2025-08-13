import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { Alert } from './ui/alert'
import { Play, Settings, Users, MessageSquare, Clock, AlertCircle } from 'lucide-react'
import { router } from '@inertiajs/react'

interface ExecutionConfig {
  enabled: boolean
  message: string
  order: number
  targetCount: number
  messagesSentCount: number
  priorityOrder: number
}

interface ExecutionSettings {
  categories: {
    [key: string]: ExecutionConfig
  }
  delayBetweenMessages: number
  dailyLimit?: number
}

interface ExecutionPreview {
  totalFollowers: number
  categoriesBreakdown: {
    [key: string]: {
      count: number
      enabled: boolean
    }
  }
  estimatedDuration: number
  totalMessages: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface CampaignExecutionCardProps {
  campaignId: number
  campaignName: string
  analysisStatus: string
}

const categoryLabels = {
  'interested': 'Highly Interested',
  'moderately_interested': 'Moderately Interested',
  'not_interested': 'Not Interested',
  'excluded': 'Excluded',
  'cannot_determine': 'Cannot Determine'
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

export default function CampaignExecutionCard({ 
  campaignId, 
  campaignName, 
  analysisStatus 
}: CampaignExecutionCardProps) {
  const [config, setConfig] = useState<ExecutionSettings | null>(null)
  const [preview, setPreview] = useState<ExecutionPreview | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Load initial configuration
  useEffect(() => {
    loadExecutionConfig()
  }, [campaignId])

  const loadExecutionConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execution/config`)
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        await loadPreview()
        await validateConfig()
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPreview = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execution/preview`)
      if (response.ok) {
        const data = await response.json()
        setPreview(data)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
    }
  }

  const validateConfig = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execution/validate`)
      if (response.ok) {
        const data = await response.json()
        setValidation(data)
      }
    } catch (error) {
      console.error('Error during validation:', error)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execution/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        await loadPreview()
        await validateConfig()
      } else {
        console.error('Error during save')
      }
    } catch (error) {
      console.error('Error during save:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetMessageCounts = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execution/reset-counts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      if (response.ok) {
        await loadExecutionConfig() // Reload to get updated counts
      } else {
        console.error('Error resetting counters')
      }
    } catch (error) {
      console.error('Error resetting counters:', error)
    } finally {
      setSaving(false)
    }
  }

  const executeCampaign = async () => {
    if (!validation?.isValid) return

    setExecuting(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      if (response.ok) {
        // Redirect to execution tracking page
        router.visit(`/dashboard/campaigns/${campaignId}/execution`)
      } else {
        console.error('Error during execution')
      }
    } catch (error) {
      console.error('Error during execution:', error)
    } finally {
      setExecuting(false)
    }
  }

  const updateCategoryConfig = (category: string, field: keyof ExecutionConfig, value: any) => {
    if (!config) return

    setConfig({
      ...config,
      categories: {
        ...config.categories,
        [category]: {
          ...config.categories[category],
          [field]: value
        }
      }
    })
  }

  if (loading || !config) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const enabledCategories = Object.entries(config.categories)
    .filter(([_, categoryConfig]) => categoryConfig.enabled)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Campaign Execution
            </CardTitle>
            <CardDescription>
              Configure and launch message sending for "{campaignName}"
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showSettings ? 'Hide' : 'Configure'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aperçu rapide */}
        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Total followers</div>
                <div className="font-semibold">{preview.totalFollowers}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Messages to send</div>
                <div className="font-semibold">{preview.totalMessages}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm text-muted-foreground">Estimated duration</div>
                <div className="font-semibold">{formatDuration(preview.estimatedDuration)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Play className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">Active categories</div>
                <div className="font-semibold">{enabledCategories.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration des catégories */}
        {showSettings && (
          <div className="space-y-4">
            <hr className="my-4" />
            <div>
              <h4 className="text-sm font-medium mb-4">Category Configuration</h4>
              <div className="space-y-4">
                {Object.entries(config.categories).map(([category, categoryConfig]) => {
                  const categoryPreview = preview?.categoriesBreakdown[category]
                  
                  return (
                    <div key={category} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={categoryConfig.enabled}
                            onChange={(e) => 
                              updateCategoryConfig(category, 'enabled', e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div>
                            <label className="text-sm font-medium">
                              {categoryLabels[category as keyof typeof categoryLabels] || category}
                            </label>
                            {categoryPreview && (
                              <div className="text-xs text-muted-foreground">
                                {categoryPreview.count} followers • {categoryConfig.messagesSentCount} sent
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={categoryConfig.enabled ? "default" : "secondary"}>
                          {categoryConfig.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      
                      {categoryConfig.enabled && (
                        <div className="space-y-3 pl-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor={`target-${category}`} className="text-xs text-muted-foreground block mb-1">
                                Target Count
                              </label>
                              <input
                                type="number"
                                id={`target-${category}`}
                                min="0"
                                value={categoryConfig.targetCount}
                                onChange={(e) => 
                                  updateCategoryConfig(category, 'targetCount', parseInt(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                                placeholder="0 = all followers"
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                0 means send to all available followers
                              </div>
                            </div>
                            <div>
                              <label htmlFor={`priority-${category}`} className="text-xs text-muted-foreground block mb-1">
                                Priority Order
                              </label>
                              <input
                                type="number"
                                id={`priority-${category}`}
                                min="1"
                                value={categoryConfig.priorityOrder}
                                onChange={(e) => 
                                  updateCategoryConfig(category, 'priorityOrder', parseInt(e.target.value) || 1)
                                }
                                className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                                placeholder="1"
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                Lower numbers = higher priority
                              </div>
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`message-${category}`} className="text-xs text-muted-foreground block mb-1">
                              DM Message
                            </label>
                            <Textarea
                              id={`message-${category}`}
                              value={categoryConfig.message}
                              onChange={(e) => 
                                updateCategoryConfig(category, 'message', e.target.value)
                              }
                              placeholder="Your personalized DM message..."
                              rows={3}
                            />
                            <div className="text-xs text-muted-foreground mt-1">
                              {categoryConfig.message.length}/280 characters
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {showSettings && (
            <>
              <Button
                onClick={saveConfig}
                disabled={saving}
                variant="outline"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button
                onClick={resetMessageCounts}
                disabled={saving}
                variant="outline"
                size="sm"
              >
                Reset Counts
              </Button>
            </>
          )}
          
          <Button
            onClick={executeCampaign}
            disabled={!validation?.isValid || executing || analysisStatus !== 'completed'}
            className="flex-1"
          >
            {executing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Launching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Launch Campaign
              </>
            )}
          </Button>
        </div>

        {analysisStatus !== 'completed' && (
          <div className="text-sm text-muted-foreground text-center">
            ⏳ Campaign analysis must be completed before execution
          </div>
        )}
      </CardContent>
    </Card>
  )
}
