import { useState } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../../components/Layout'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft, Edit2, Trash2, Plus, Hash } from 'lucide-react'

interface HashtagItem {
  id: number
  hashtag: string
  position: number
}

interface HashtagGroup {
  id: number
  name: string
  description: string | null
  hashtags: HashtagItem[]
  createdAt: string
}

interface User {
  id: number
  email: string
}

interface ShowProps {
  group: HashtagGroup
}

function Show({ group }: ShowProps) {
  const { props } = usePage()
  const user = props.user as User

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editName, setEditName] = useState(group.name)
  const [editDescription, setEditDescription] = useState(group.description || '')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newHashtag, setNewHashtag] = useState('')

  const handleEdit = async () => {
    try {
      router.put(`/hashtag-groups/${group.id}`, {
        name: editName,
        description: editDescription || null
      })
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Error updating group:', error)
    }
  }

  const handleDelete = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ? Cette action ne peut pas être annulée.`)) {
      router.delete(`/hashtag-groups/${group.id}`)
    }
  }

  const handleAddHashtag = async () => {
    if (!newHashtag.trim()) return
    
    try {
      router.post(`/hashtag-groups/${group.id}/hashtags`, {
        hashtag: newHashtag.trim()
      })
      setNewHashtag('')
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error adding hashtag:', error)
    }
  }

  const handleRemoveHashtag = (hashtagId: number, hashtagText: string) => {
    if (confirm(`Supprimer "#${hashtagText}" du groupe "${group.name}" ? Cette action ne peut pas être annulée.`)) {
      router.delete(`/hashtag-groups/${group.id}/hashtags/${hashtagId}`)
    }
  }

  return (
    <>
      <Head title={`${group.name} - Hashtag Groups`} />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.visit('/hashtag-groups')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Hash className="h-6 w-6" />
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-muted-foreground mt-1">{group.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {group.hashtags.length} hashtag{group.hashtags.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>

          {/* Hashtags */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Hashtags
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {group.hashtags.length === 0 ? (
                <div className="text-center py-8">
                  <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun hashtag dans ce groupe</p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Ajouter le premier hashtag
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {group.hashtags.map((hashtagItem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <Badge variant="outline" className="flex-shrink-0">
                        #{hashtagItem.hashtag}
                      </Badge>
                      
                      <div className="flex-1" />
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveHashtag(hashtagItem.id, hashtagItem.hashtag)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Modifier le groupe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="editName">Nom</Label>
                    <Input
                      id="editName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nom du groupe"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="editDescription">Description (optionnelle)</Label>
                    <Input
                      id="editDescription"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description du groupe"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleEdit} className="flex-1">
                      Sauvegarder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setEditName(group.name)
                        setEditDescription(group.description || '')
                      }}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Hashtag Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Ajouter un hashtag</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="newHashtag">Hashtag</Label>
                    <Input
                      id="newHashtag"
                      value={newHashtag}
                      onChange={(e) => setNewHashtag(e.target.value)}
                      placeholder="Entrez le hashtag (sans #)"
                      className="mt-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddHashtag()
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={handleAddHashtag} 
                      className="flex-1"
                      disabled={!newHashtag.trim()}
                    >
                      Ajouter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddModalOpen(false)
                        setNewHashtag('')
                      }}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export default Show
