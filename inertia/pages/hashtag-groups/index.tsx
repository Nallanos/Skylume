import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import Layout from '../../components/Layout'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Hash, 
  Save, 
  X, 
  Tags,
  Search
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog'

interface HashtagGroup {
  id: number
  name: string
  description: string | null
  hashtags: string[]
  createdAt: string
}

interface Props {
  groups: HashtagGroup[]
  user: any
}

function HashtagGroupsIndex({ groups, user }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingGroup, setEditingGroup] = useState<HashtagGroup | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newHashtag, setNewHashtag] = useState('')

  const createForm = useForm({
    name: '',
    description: '',
    hashtags: [] as string[]
  })

  const editForm = useForm({
    name: '',
    description: ''
  })

  // Filtrer les groupes selon la recherche
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.hashtags.some(hashtag => hashtag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreateGroup = () => {
    createForm.post('/hashtag-groups', {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
        createForm.reset()
      }
    })
  }

  const handleEditGroup = () => {
    if (!editingGroup) return

    editForm.put(`/hashtag-groups/${editingGroup.id}`, {
      onSuccess: () => {
        setIsEditDialogOpen(false)
        setEditingGroup(null)
        editForm.reset()
      }
    })
  }

  const handleDeleteGroup = (groupId: number) => {
    router.delete(`/hashtag-groups/${groupId}`)
  }

  const addHashtagToCreateForm = () => {
    if (newHashtag.trim() && !createForm.data.hashtags.includes(newHashtag.trim())) {
      createForm.setData('hashtags', [...createForm.data.hashtags, newHashtag.trim()])
      setNewHashtag('')
    }
  }

  const removeHashtagFromCreateForm = (hashtag: string) => {
    createForm.setData('hashtags', createForm.data.hashtags.filter(h => h !== hashtag))
  }

  const openEditDialog = (group: HashtagGroup) => {
    setEditingGroup(group)
    editForm.setData({
      name: group.name,
      description: group.description || ''
    })
    setIsEditDialogOpen(true)
  }

  return (
    <>
      <Head title="Hashtag Groups" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Tags className="h-8 w-8 text-blue-500" />
                Hashtag Groups
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage collections of hashtags for easy reuse
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Hashtag Group</DialogTitle>
                  <DialogDescription>
                    Create a new collection of hashtags that you use frequently.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Group Name</label>
                    <Input
                      value={createForm.data.name}
                      onChange={(e) => createForm.setData('name', e.target.value)}
                      placeholder="e.g., Tech Posts, Marketing, Personal"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={createForm.data.description}
                      onChange={(e) => createForm.setData('description', e.target.value)}
                      placeholder="Describe when to use this group..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Hashtags</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        placeholder="Enter hashtag (without #)"
                        onKeyPress={(e) => e.key === 'Enter' && addHashtagToCreateForm()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addHashtagToCreateForm}
                        disabled={!newHashtag.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {createForm.data.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {createForm.data.hashtags.map((hashtag) => (
                          <Badge
                            key={hashtag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            #{hashtag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeHashtagFromCreateForm(hashtag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={createForm.processing || !createForm.data.name.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups or hashtags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Tags className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No hashtag groups yet</h3>
                  <p className="text-muted-foreground">
                    Create your first hashtag group to organize your most-used hashtags
                  </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Group
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <Link key={group.id} href={`/hashtag-groups/${group.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Hash className="h-5 w-5 text-blue-500" />
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {group.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openEditDialog(group)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
                                handleDeleteGroup(group.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {group.hashtags.slice(0, 6).map((hashtag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              #{hashtag}
                            </Badge>
                          ))}
                          {group.hashtags.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.hashtags.length - 6} more
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{group.hashtags.length} hashtags</span>
                          <span>Created {group.createdAt}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Hashtag Group</DialogTitle>
                <DialogDescription>
                  Update the name and description of your hashtag group.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Group Name</label>
                  <Input
                    value={editForm.data.name}
                    onChange={(e) => editForm.setData('name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editForm.data.description}
                    onChange={(e) => editForm.setData('description', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditGroup}
                    disabled={editForm.processing || !editForm.data.name.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  )
}

export default HashtagGroupsIndex
