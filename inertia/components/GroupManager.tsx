import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { Plus, Edit2, Trash2, Users, ArrowUp, ArrowDown, MessageSquare, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import GmailStyleLinkManager from './GmailStyleLinkManager'
import useAsyncGroups from '../hooks/useAsyncGroups'

export interface CampaignGroup {
  id: number
  campaignId: number
  name: string
  conditions: Record<string, any>
  message?: string
  order: number
  targetCount: number // Nombre réel de followers assignés
  messagesSent: number // Nombre de messages envoyés
  createdAt: string
  updatedAt: string
  explicitLinks?: Array<{ text: string, url: string }> | null
  loading_estimation?: boolean // Pour le mode async (frontend uniquement)
}

interface GroupManagerProps {
  campaignId: number
  groups: CampaignGroup[]
  variables: Array<{ name: string, type: string }>
  onGroupUpdate?: () => void
  useAsyncLoading?: boolean
}

const CONDITION_OPERATORS = [
  { value: 'gte', label: 'Greater than or equal (≥)' },
  { value: 'lte', label: 'Less than or equal (≤)' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'eq', label: 'Equal to (=)' }
]

const VARIABLE_FIELDS = [
  { value: 'followers_count', label: 'Follower Count', type: 'number' }
]

export default function GroupManager({ campaignId, groups, variables, onGroupUpdate, useAsyncLoading = false }: GroupManagerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CampaignGroup | null>(null)
  const [estimatedTargets, setEstimatedTargets] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [explicitLinks, setExplicitLinks] = useState<{text: string, url: string}[]>([])
  
  const [localGroups, setLocalGroups] = useState<CampaignGroup[]>(groups)
  const [pendingGroups, setPendingGroups] = useState<Set<number>>(new Set())
  
  // Hook async optionnel
  const asyncGroups = useAsyncLoading ? useAsyncGroups(campaignId) : null
  
  // Choisir les données selon le mode
  const effectiveGroups = useAsyncLoading && asyncGroups ? asyncGroups.groups : localGroups
  const isLoadingData = useAsyncLoading && asyncGroups ? asyncGroups.loading : false
  const isLoadingEstimations = useAsyncLoading && asyncGroups ? asyncGroups.estimationsLoading : false
  
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [data, setData] = useState({
    name: '',
    conditions: {
      field: '',
      operator: '',
      value: ''
    },
    priority: 0,
    message: ''
  })

  const reset = () => {
    setData({
      name: '',
      conditions: {
        field: '',
        operator: '',
        value: ''
      },
      priority: 0,
      message: ''
    })
    setErrors({})
    setExplicitLinks([]) // ✅ NOUVEAU: Reset des liens
  }

  const getCsrfToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    return token || ''
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateModalOpen && !editingGroup) {
      reset()
      setEstimatedTargets(null)
    }
  }, [isCreateModalOpen, editingGroup])

  // ✅ NOUVEAU: Synchroniser les groupes locaux avec les props
  useEffect(() => {
    setLocalGroups(groups)
  }, [groups])

  // Estimate targets when conditions change
  useEffect(() => {
    if (data.conditions.field && data.conditions.operator && data.conditions.value) {
      fetchEstimation()
    } else {
      setEstimatedTargets(null) // ✅ Reset estimation if conditions are incomplete
    }
  }, [data.conditions])

  // ✅ NOUVEAU: Fonction pour insérer un lien dans le textarea
  const handleLinkInsert = useCallback((text: string, url: string) => {
    const textarea = messageTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentMessage = data.message
    
    // Insérer le texte du lien à la position du curseur
    const newMessage = 
      currentMessage.substring(0, start) +
      text +
      currentMessage.substring(end)
    
    // Mettre à jour le message
    setData(prev => ({ ...prev, message: newMessage }))
    
    // Ajouter le lien à la liste des liens explicites
    const newLink = { text, url }
    const updatedLinks = [...explicitLinks, newLink]
    setExplicitLinks(updatedLinks)
    
    // Remettre le focus et placer le curseur après le texte inséré
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }, [data.message, explicitLinks])

  const fetchEstimation = async () => {
    try {
      const response = await fetch(`/campaign/${campaignId}/groups/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ conditions: data.conditions })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log("here's the result of the request", result)
        setEstimatedTargets(result.estimated_targets)
      }
    } catch (error) {
      console.error('Failed to fetch estimation:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    
    // ✅ NOUVEAU: Générer l'ID temporaire une seule fois au début
    const tempId = Date.now() * -1
    
    try {
      const method = editingGroup ? 'PUT' : 'POST'
      const url = editingGroup 
        ? `/campaign/${campaignId}/groups/${editingGroup.id}`
        : `/campaign/${campaignId}/groups`
      
      // ✅ NOUVEAU: Inclure les liens explicites dans les données
      const payload = {
        ...data,
        explicit_links: explicitLinks.length > 0 ? explicitLinks : undefined
      }

      // ✅ NOUVEAU: Si c'est une création, fermer immédiatement la modal et ajouter un groupe temporaire
      if (!editingGroup) {
        // Créer un groupe temporaire
        const tempGroup: CampaignGroup = {
          id: tempId,
          campaignId: campaignId,
          name: data.name,
          conditions: data.conditions,
          order: data.priority,
          targetCount: estimatedTargets || 0,
          messagesSent: 0,
          message: data.message,
          explicitLinks: explicitLinks.length > 0 ? explicitLinks : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Ajouter le groupe temporaire à la liste locale
        setLocalGroups(prev => [...prev, tempGroup])
        setPendingGroups(prev => new Set([...prev, tempId]))
        
        // Fermer la modal et reset le form immédiatement
        setIsCreateModalOpen(false)
        reset()
        setIsLoading(false)
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingGroup ? 'Group updated successfully' : 'Group created successfully')
        
        if (editingGroup) {
          setEditingGroup(null)
          reset()
          setIsLoading(false)
        } else {
          // Pour les nouvelles créations, supprimer le groupe temporaire et déclencher le refresh
          setPendingGroups(prev => {
            const newSet = new Set(prev)
            newSet.delete(tempId)
            return newSet
          })
        }
        
        // ✅ CORRECTION: Assurer que la liste se met à jour
        if (onGroupUpdate) {
          onGroupUpdate()
        }
      } else {
        // En cas d'erreur, supprimer le groupe temporaire si c'était une création
        if (!editingGroup) {
          setLocalGroups(prev => prev.filter(g => g.id !== tempId))
          setPendingGroups(prev => {
            const newSet = new Set(prev)
            newSet.delete(tempId)
            return newSet
          })
        }
        
        if (result.errors) {
          setErrors(result.errors)
        }
        toast.error(result.message || 'Failed to save group')
        setIsLoading(false)
      }
    } catch (error) {
      // En cas d'erreur, supprimer le groupe temporaire si c'était une création
      if (!editingGroup) {
        setLocalGroups(prev => prev.filter(g => g.id !== tempId))
        setPendingGroups(prev => {
          const newSet = new Set(prev)
          newSet.delete(tempId)
          return newSet
        })
      }
      
      toast.error(editingGroup ? 'Failed to update group' : 'Failed to create group')
      console.error('Error saving group:', error)
      setIsLoading(false)
    }
  }

  const handleDelete = async (group: CampaignGroup) => {
    if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      try {
        const response = await fetch(`/campaign/${campaignId}/groups/${group.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
          }
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Group deleted successfully')
          if (onGroupUpdate) {
            onGroupUpdate()
          }
        } else {
          toast.error(result.message || 'Failed to delete group')
        }
      } catch (error) {
        toast.error('Failed to delete group')
        console.error('Error deleting group:', error)
      }
    }
  }

  const handlePriorityChange = async (group: CampaignGroup, direction: 'up' | 'down') => {
    const newPriority = direction === 'up' ? group.order - 1 : group.order + 1
    
    try {
      const response = await fetch(`/campaign/${campaignId}/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          name: group.name,
          conditions: group.conditions,
          priority: newPriority,
          message: group.message
        })
      })

      if (response.ok) {
        toast.success('Priority updated')
        if (onGroupUpdate) {
          onGroupUpdate()
        }
      } else {
        toast.error('Failed to update priority')
      }
    } catch (error) {
      toast.error('Failed to update priority')
    }
  }

  const openEditModal = (group: CampaignGroup) => {
    setData({
      name: group.name,
      conditions: {
        field: group.conditions?.field || '',
        operator: group.conditions?.operator || '',
        value: group.conditions?.value || ''
      },
      priority: group.order,
      message: group.message || ''
    })
    // ✅ NOUVEAU: Charger les liens existants
    setExplicitLinks(group.explicitLinks || [])
    setEditingGroup(group)
  }

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setEditingGroup(null)
  }

  const formatCondition = (conditions: Record<string, any>) => {
    const { field, operator, value } = conditions
    const fieldLabel = VARIABLE_FIELDS.find(f => f.value === field)?.label || field
    const operatorLabel = CONDITION_OPERATORS.find(op => op.value === operator)?.label || operator
    
    return `${fieldLabel} ${operatorLabel} ${value}`
  }

  const renderGroupMessagePreview = (group: CampaignGroup) => {
    if (!group.message) return null
    
    let preview = group.message
    
    // Remplacer les variables par des exemples
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g')
      let replacement = `{{${variable.name}}}`
      
      if (variable.type === 'follower_count' || variable.name === 'followers_count') {
        replacement = '5.8k'
      } else if (variable.name === 'display_name') {
        replacement = 'John Smith'
      } else if (variable.name === 'handle') {
        replacement = '@johnsmith'
      } else {
        replacement = 'example'
      }
      
      preview = preview.replace(regex, replacement)
    })
    
    // Transformer les liens explicites en liens bleus
    if (group.explicitLinks) {
      group.explicitLinks.forEach((link) => {
        const linkRegex = new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        const blueLink = `<span style="color: #3b82f6; text-decoration: underline;">${link.text}</span>`
        preview = preview.replace(linkRegex, blueLink)
      })
    }
    
    // Tronquer si trop long
    if (preview.length > 100) {
      preview = preview.substring(0, 100) + '...'
    }
    
    return preview
  }

  const renderVariablePreview = (content: string) => {
    let preview = content
    
    // Remplacer les variables par des exemples
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g')
      let replacement = `{{${variable.name}}}`
      
      // ✅ CORRECTION: Utiliser des exemples réalistes basés sur le type
      if (variable.type === 'follower_count' || variable.name === 'followers_count') {
        replacement = '5.8k' // Example value
      } else if (variable.name === 'display_name') {
        replacement = 'John Smith'
      } else if (variable.name === 'handle') {
        replacement = '@johnsmith'
      } else {
        // Valeur générique pour les autres variables
        replacement = 'example'
      }
      
      preview = preview.replace(regex, replacement)
    })
    
    // ✅ NOUVEAU: Transformer les liens explicites en liens bleus
    explicitLinks.forEach(link => {
      const linkRegex = new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const blueLink = `<span style="color: #3b82f6; text-decoration: underline;">${link.text}</span>`
      preview = preview.replace(linkRegex, blueLink)
    })
    
    return preview
  }

  return (
    <div className="space-y-6">
      {/* ✅ NOUVEAU: Indicateurs de mode async */}
      {useAsyncLoading && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            {isLoadingData && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            <span className="text-sm font-medium text-blue-800">
              Mode async activé {isLoadingData && '- Chargement...'}
            </span>
          </div>
          {isLoadingEstimations && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span className="text-sm text-orange-800">Calcul des estimations...</span>
            </div>
          )}
          {asyncGroups && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => asyncGroups.refreshEstimations()}
              disabled={isLoadingEstimations}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Recharger estimations
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Target Groups</h3>
          <p className="text-sm text-muted-foreground">
            Define audience segments with conditions and messages
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="e.g., High Followers, Micro Influencers"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Targeting Conditions</Label>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="field" className="text-xs">Field</Label>
                    <Select
                      value={data.conditions.field}
                      onValueChange={(value) => setData({ ...data, conditions: { ...data.conditions, field: value } })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="operator" className="text-xs">Operator</Label>
                    <Select
                      value={data.conditions.operator}
                      onValueChange={(value) => setData({ ...data, conditions: { ...data.conditions, operator: value } })}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Op" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="value" className="text-xs">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={data.conditions.value}
                      onChange={(e) => setData({ ...data, conditions: { ...data.conditions, value: e.target.value } })}
                      placeholder="1000"
                      className="text-sm"
                    />
                  </div>
                </div>

                {data.conditions.field && data.conditions.operator && data.conditions.value && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">Condition:</span> {formatCondition(data.conditions)}
                    </div>
                    {estimatedTargets !== null && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <Users className="h-4 w-4 inline mr-1" />
                        Estimated targets: <span className="font-medium">{estimatedTargets}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="message">Message Template</Label>
                <Textarea
                  ref={messageTextareaRef}
                  id="message"
                  value={data.message}
                  onChange={(e) => setData({ ...data, message: e.target.value })}
                  placeholder="Write your personalized message here..."
                  rows={3}
                  className={errors.message ? 'border-red-500' : ''}
                />
                {errors.message && (
                  <p className="text-sm text-red-500 mt-1">{errors.message}</p>
                )}
                
                {/* ✅ NOUVEAU: Gestionnaire de liens pour rich text */}
                <div className="mt-2">
                  <GmailStyleLinkManager
                    onLinkInsert={handleLinkInsert}
                    disabled={false}
                  />
                </div>
                
                {/* ✅ NOUVEAU: Affichage des liens configurés */}
                {explicitLinks.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium mb-2 block">Configured Links ({explicitLinks.length})</Label>
                    <div className="space-y-1">
                      {explicitLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                          <span>"{link.text}" → {link.url}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updatedLinks = explicitLinks.filter((_, i) => i !== index)
                              setExplicitLinks(updatedLinks)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.message && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <strong>Preview:</strong> <span dangerouslySetInnerHTML={{ __html: renderVariablePreview(data.message) }} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModals}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      {effectiveGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">
              No target groups defined
            </h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create groups to target different audience segments with personalized messages
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {effectiveGroups
            .sort((a, b) => a.order - b.order)
            .map((group, index) => {
              const isPending = pendingGroups.has(group.id)
              return (
                <Card key={group.id} className={isPending ? 'opacity-70' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="text-xs px-2 py-1 mb-1">
                            #{group.order}
                          </Badge>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handlePriorityChange(group, 'up')}
                              disabled={index === 0 || isPending}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handlePriorityChange(group, 'down')}
                              disabled={index === effectiveGroups.length - 1 || isPending}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {group.name}
                            {isPending && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                Creating...
                              </div>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {formatCondition(group.conditions)}
                            </Badge>
                            
                            {/* Affichage du nombre total de followers dans le groupe */}
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {(group as any).loading_estimation ? (
                                <div className="flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Loading...</span>
                                </div>
                              ) : (
                                `${group.targetCount || 0} followers`
                              )}
                            </Badge>
                              
                            {/* Nombre de messages envoyés */}
                            {group.messagesSent > 0 && (
                              <Badge variant="default" className="text-xs bg-blue-600">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {group.messagesSent} sent
                              </Badge>
                            )}
                          </div>
                          {group.message && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              <span dangerouslySetInnerHTML={{ __html: renderGroupMessagePreview(group) || '' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(group)}
                          disabled={isPending}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(group)}
                          className="text-red-600 hover:text-red-700"
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
        </div>
      )}

      {/* Edit Modal */}
      {editingGroup && (
        <Dialog open={true} onOpenChange={closeModals}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Group Name</Label>
                <Input
                  id="edit-name"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Targeting Conditions</Label>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Select
                      value={data.conditions.field}
                      onValueChange={(value) => setData({ ...data, conditions: { ...data.conditions, field: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select
                      value={data.conditions.operator}
                      onValueChange={(value) => setData({ ...data, conditions: { ...data.conditions, operator: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Input
                      type="number"
                      value={data.conditions.value}
                      onChange={(e) => setData({ ...data, conditions: { ...data.conditions, value: e.target.value } })}
                    />
                  </div>
                </div>

                {estimatedTargets !== null && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      <Users className="h-4 w-4 inline mr-1" />
                      Estimated targets: <span className="font-medium">{estimatedTargets}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="edit-message">Message Template</Label>
                <Textarea
                  ref={messageTextareaRef}
                  id="edit-message"
                  value={data.message}
                  onChange={(e) => setData({ ...data, message: e.target.value })}
                  placeholder="Write your personalized message here..."
                  rows={3}
                  className={errors.message ? 'border-red-500' : ''}
                />
                {errors.message && (
                  <p className="text-sm text-red-500 mt-1">{errors.message}</p>
                )}
                
                {/* ✅ NOUVEAU: Gestionnaire de liens pour rich text */}
                <div className="mt-2">
                  <GmailStyleLinkManager
                    onLinkInsert={handleLinkInsert}
                    disabled={false}
                  />
                </div>
                
                {/* ✅ NOUVEAU: Affichage des liens configurés */}
                {explicitLinks.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium mb-2 block">Configured Links ({explicitLinks.length})</Label>
                    <div className="space-y-1">
                      {explicitLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                          <span>"{link.text}" → {link.url}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updatedLinks = explicitLinks.filter((_, i) => i !== index)
                              setExplicitLinks(updatedLinks)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.message && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <strong>Preview:</strong> <span dangerouslySetInnerHTML={{ __html: renderVariablePreview(data.message) }} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModals}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Group'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
