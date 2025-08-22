import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Plus, Edit2, Trash2, Eye, Settings } from 'lucide-react'
import { useForm } from '@inertiajs/react'
import { toast } from 'sonner'

export interface CampaignVariable {
  id: number
  campaign_id: number
  name: string
  type: string
  configuration: Record<string, any>
  created_at: string
  updated_at: string
}

interface VariableManagerProps {
  campaignId: number
  variables: CampaignVariable[]
  onVariableUpdate?: () => void
}

const VARIABLE_TYPES = [
  {
    value: 'follower_count',
    label: 'Follower Count',
    description: 'Number of followers with formatting options',
    icon: '👥'
  }
  // Future: Add more variable types here
]

const ROUNDING_OPTIONS = [
  { value: 'none', label: 'Exact number (e.g., 5842)', example: '5842' },
  { value: 'hundreds', label: 'Round to hundreds (e.g., 5.8k)', example: '5.8k' },
  { value: 'thousands', label: 'Round to thousands (e.g., 6k)', example: '6k' }
]

export default function VariableManager({ campaignId, variables: initialVariables = [], onVariableUpdate }: VariableManagerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingVariable, setEditingVariable] = useState<CampaignVariable | null>(null)
  const [previewValue, setPreviewValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [variables, setVariables] = useState<CampaignVariable[]>(initialVariables)
  const [isLoadingVariables, setIsLoadingVariables] = useState(false)

  const { data, setData, errors, reset } = useForm({
    name: '',
    type: '',
    configuration: {}
  })

  // Load variables from server
  const loadVariables = async () => {
    setIsLoadingVariables(true)
    try {
      const response = await fetch(`/campaign/${campaignId}/variables`)
      if (response.ok) {
        const result = await response.json()
        console.log('Variables loaded:', result) // Debug log
        setVariables(result.data || [])
      } else {
        console.error('Failed to load variables:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading variables:', error)
    } finally {
      setIsLoadingVariables(false)
    }
  }

  // Load variables on mount
  useEffect(() => {
    loadVariables()
  }, [campaignId])

  // Update variables when initialVariables change
  useEffect(() => {
    setVariables(initialVariables)
  }, [initialVariables])

  // Reset form when modal closes
  useEffect(() => {
    if (!isCreateModalOpen && !editingVariable) {
      reset()
      setPreviewValue('')
    }
  }, [isCreateModalOpen, editingVariable])

  // Update preview when configuration changes
  useEffect(() => {
    if (data.type === 'follower_count' && data.configuration && 'rounding' in data.configuration) {
      const exampleCount = 5842
      setPreviewValue(formatFollowerCount(exampleCount, data.configuration.rounding as string))
    }
  }, [data.configuration])

  const formatFollowerCount = (count: number, rounding: string): string => {
    switch (rounding) {
      case 'hundreds':
        if (count >= 1000) {
          return (count / 1000).toFixed(1) + 'k'
        }
        return count.toString()
      case 'thousands':
        if (count >= 1000) {
          return Math.round(count / 1000) + 'k'
        }
        return count.toString()
      default:
        return count.toString()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (editingVariable) {
        const response = await fetch(`/campaign/${campaignId}/variables/${editingVariable.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast.success('Variable updated successfully')
          setEditingVariable(null)
          await loadVariables() // Refresh local state
          onVariableUpdate?.()
        } else {
          const error = await response.json()
          toast.error(error.message || 'Failed to update variable')
        }
      } else {
        const response = await fetch(`/campaign/${campaignId}/variables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast.success('Variable created successfully')
          setIsCreateModalOpen(false)
          await loadVariables() // Refresh local state
          onVariableUpdate?.()
        } else {
          const error = await response.json()
          toast.error(error.message || 'Failed to create variable')
        }
      }
    } catch (error) {
      toast.error('An error occurred')
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (variable: CampaignVariable) => {
    if (confirm(`Are you sure you want to delete the variable "${variable.name}"?`)) {
      try {
        const response = await fetch(`/campaign/${campaignId}/variables/${variable.id}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          }
        })

        if (response.ok) {
          toast.success('Variable deleted successfully')
          await loadVariables() // Refresh local state
          onVariableUpdate?.()
        } else {
          const error = await response.json()
          toast.error(error.message || 'Failed to delete variable')
        }
      } catch (error) {
        toast.error('Failed to delete variable')
      }
    }
  }

  const openEditModal = (variable: CampaignVariable) => {
    setData({
      name: variable.name,
      type: variable.type,
      configuration: variable.configuration
    })
    setEditingVariable(variable)
  }

  const closeModals = () => {
    setIsCreateModalOpen(false)
    setEditingVariable(null)
  }

  const renderVariableTypeConfig = () => {
    if (data.type === 'follower_count') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="rounding">Rounding Style</Label>
            <Select
              value={(data.configuration && 'rounding' in data.configuration) ? data.configuration.rounding as string : 'none'}
              onValueChange={(value) => setData('configuration', { ...data.configuration, rounding: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rounding style" />
              </SelectTrigger>
              <SelectContent>
                {ROUNDING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {option.example}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewValue && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Preview:</span>
                <Badge variant="secondary">
                  {`{{${data.name}}} → ${previewValue}`}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const getVariableTypeInfo = (type: string) => {
    return VARIABLE_TYPES.find(t => t.value === type)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Campaign Variables</h3>
          <p className="text-sm text-muted-foreground">
            Define dynamic variables to personalize your messages
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Variable</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Variable Name</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="e.g., follower_count"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Use in messages as: {`{{${data.name || 'variable_name'}}}`}
                </p>
              </div>

              <div>
                <Label htmlFor="type">Variable Type</Label>
                <Select
                  value={data.type}
                  onValueChange={(value) => setData('type', value)}
                >
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select variable type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500 mt-1">{errors.type}</p>
                )}
              </div>

              {data.type && renderVariableTypeConfig()}

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
                  {isLoading ? 'Creating...' : 'Create Variable'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Variables List */}
      {isLoadingVariables ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-muted-foreground">Loading variables...</span>
            </div>
          </CardContent>
        </Card>
      ) : variables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">
              No variables defined
            </h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Variables allow you to personalize messages with dynamic content like follower counts
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Variable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {variables.map((variable) => {
            const typeInfo = getVariableTypeInfo(variable.type)
            return (
              <Card key={variable.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{typeInfo?.icon}</span>
                      <div>
                        <CardTitle className="text-base">
                          {`{{${variable.name}}}`}
                        </CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {typeInfo?.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(variable)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(variable)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    {variable.type === 'follower_count' && (
                      <div className="flex items-center gap-2">
                        <span>Rounding:</span>
                        <Badge variant="secondary">
                          {ROUNDING_OPTIONS.find(opt => opt.value === variable.configuration.rounding)?.label || 'Exact number'}
                        </Badge>
                        <span>Example:</span>
                        <Badge variant="outline">
                          {formatFollowerCount(5842, variable.configuration.rounding)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingVariable && (
        <Dialog open={true} onOpenChange={closeModals}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Variable</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Variable Name</Label>
                <Input
                  id="edit-name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="e.g., follower_count"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-type">Variable Type</Label>
                <Select
                  value={data.type}
                  onValueChange={(value) => setData('type', value)}
                >
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500 mt-1">{errors.type}</p>
                )}
              </div>

              {data.type && renderVariableTypeConfig()}

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
                  {isLoading ? 'Updating...' : 'Update Variable'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
