import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Plus, Edit, Trash2, MessageSquare, Target } from 'lucide-react'

interface CampaignMessage {
  id: number
  interestLevel: 'interested' | 'moderately_interested'
  message: string
  subject?: string
  isActive: boolean
}

interface CampaignMessagesManagerProps {
  campaignId: number
  onUpdate?: () => void
}

const INTEREST_LEVEL_LABELS = {
  interested: 'Très intéressé',
  moderately_interested: 'Modérément intéressé'
}

const INTEREST_LEVEL_COLORS = {
  interested: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  moderately_interested: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
}

export function CampaignMessagesManager({ campaignId, onUpdate }: CampaignMessagesManagerProps) {
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMessage, setEditingMessage] = useState<CampaignMessage | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMessage, setNewMessage] = useState<{
    interestLevel: 'interested' | 'moderately_interested'
    message: string
    subject: string
  }>({
    interestLevel: 'interested',
    message: '',
    subject: ''
  })

  // Charger les messages
  useEffect(() => {
    loadMessages()
  }, [campaignId])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/campaign/${campaignId}/messages`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMessage = async () => {
    try {
      const response = await fetch(`/campaign/${campaignId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(newMessage)
      })

      const data = await response.json()
      
      if (data.success) {
        await loadMessages()
        setShowAddModal(false)
        setNewMessage({
          interestLevel: 'interested',
          message: '',
          subject: ''
        })
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  const handleUpdateMessage = async () => {
    if (!editingMessage) return

    try {
      const response = await fetch(`/campaign/${campaignId}/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          message: editingMessage.message,
          subject: editingMessage.subject,
          isActive: editingMessage.isActive
        })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadMessages()
        setEditingMessage(null)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating message:', error)
    }
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return

    try {
      const response = await fetch(`/campaign/${campaignId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      const data = await response.json()
      
      if (data.success) {
        await loadMessages()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages par catégorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des messages...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages par catégorie
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un message
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucun message configuré</p>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="mt-4"
              >
                Créer le premier message
              </Button>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${INTEREST_LEVEL_COLORS[message.interestLevel]}`}>
                      <Target className="h-3 w-3 inline mr-1" />
                      {INTEREST_LEVEL_LABELS[message.interestLevel]}
                    </span>
                    {!message.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMessage(message)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {message.subject && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Sujet: {message.subject}
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {message.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Ajouter un nouveau message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="interestLevel">Niveau d'intérêt</Label>
                <select
                  id="interestLevel"
                  className="w-full p-2 border rounded-md"
                  value={newMessage.interestLevel}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    interestLevel: e.target.value as 'interested' | 'moderately_interested'
                  })}
                >
                  <option value="interested">Très intéressé</option>
                  <option value="moderately_interested">Modérément intéressé</option>
                </select>
              </div>

              <div>
                <Label htmlFor="subject">Sujet (optionnel)</Label>
                <Input
                  id="subject"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    subject: e.target.value
                  })}
                  placeholder="Sujet du message"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  className="w-full p-3 border rounded-lg resize-none h-32"
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({
                    ...newMessage,
                    message: e.target.value
                  })}
                  placeholder="Votre message personnalisé pour cette catégorie..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilisez [topic] pour insérer le premier mot-clé automatiquement
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveMessage}
                  className="flex-1"
                  disabled={!newMessage.message.trim()}
                >
                  Ajouter le message
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewMessage({
                      interestLevel: 'interested',
                      message: '',
                      subject: ''
                    })
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

      {/* Modal d'édition */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Modifier le message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="editSubject">Sujet (optionnel)</Label>
                <Input
                  id="editSubject"
                  value={editingMessage.subject || ''}
                  onChange={(e) => setEditingMessage({
                    ...editingMessage,
                    subject: e.target.value
                  })}
                  placeholder="Sujet du message"
                />
              </div>

              <div>
                <Label htmlFor="editMessage">Message</Label>
                <textarea
                  id="editMessage"
                  className="w-full p-3 border rounded-lg resize-none h-32"
                  value={editingMessage.message}
                  onChange={(e) => setEditingMessage({
                    ...editingMessage,
                    message: e.target.value
                  })}
                  placeholder="Votre message personnalisé..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingMessage.isActive}
                  onChange={(e) => setEditingMessage({
                    ...editingMessage,
                    isActive: e.target.checked
                  })}
                />
                <Label htmlFor="isActive">Message actif</Label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleUpdateMessage}
                  className="flex-1"
                  disabled={!editingMessage.message.trim()}
                >
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingMessage(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
