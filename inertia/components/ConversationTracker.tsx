import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Search, CheckCircle, Clock, AlertCircle, Users, RefreshCw } from 'lucide-react'

interface FollowerCampaign {
  id: number
  followerDid: string
  followerHandle: string | null
  conversationChecked: boolean
  alreadyContacted: boolean
  lastMessageAt: string | null
  conversationId: string | null
  interestLevel: string | null
}

interface ConversationStatus {
  total: number
  checked: number
  contacted: number
  pending: number
}

interface ConversationTrackerProps {
  campaignId: number
  followers: FollowerCampaign[]
  onStatusUpdate?: () => void
}

export function ConversationTracker({ campaignId, followers, onStatusUpdate }: ConversationTrackerProps) {
  const [status, setStatus] = useState<ConversationStatus>({
    total: 0,
    checked: 0,
    contacted: 0,
    pending: 0
  })
  const [isChecking, setIsChecking] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Charger le statut des conversations
  useEffect(() => {
    loadConversationStatus()
  }, [campaignId])

  const loadConversationStatus = async () => {
    try {
      const response = await fetch(`/campaign/${campaignId}/conversation-status`)
      const data = await response.json()
      
      if (data.success) {
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Error loading conversation status:', error)
    }
  }

  const handleCheckConversations = async () => {
    setIsChecking(true)
    try {
      const response = await fetch(`/campaign/${campaignId}/check-conversations`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      const data = await response.json()
      
      if (data.success) {
        // Recharger le statut après quelques secondes
        setTimeout(() => {
          loadConversationStatus()
          onStatusUpdate?.()
        }, 3000)
      }
    } catch (error) {
      console.error('Error checking conversations:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleMarkAsContacted = async (followerId: number) => {
    try {
      const response = await fetch(`/campaign/${campaignId}/mark-contacted/${followerId}`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })

      const data = await response.json()
      
      if (data.success) {
        await loadConversationStatus()
        onStatusUpdate?.()
      }
    } catch (error) {
      console.error('Error marking as contacted:', error)
    }
  }

  const filteredFollowers = followers.filter(follower => 
    !searchTerm || 
    follower.followerHandle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    follower.followerDid.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (follower: FollowerCampaign) => {
    if (follower.alreadyContacted) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    if (follower.conversationChecked) {
      return <Clock className="h-4 w-4 text-blue-600" />
    }
    return <AlertCircle className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = (follower: FollowerCampaign) => {
    if (follower.alreadyContacted) {
      return 'Déjà contacté'
    }
    if (follower.conversationChecked) {
      return 'Vérifié'
    }
    return 'En attente'
  }

  const getStatusColor = (follower: FollowerCampaign) => {
    if (follower.alreadyContacted) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
    if (follower.conversationChecked) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tracking des Conversations
          </CardTitle>
          <Button
            onClick={handleCheckConversations}
            disabled={isChecking}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Vérification...' : 'Vérifier les conversations'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{status.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{status.checked}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Vérifiés</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{status.contacted}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Contactés</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{status.pending}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">En attente</div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un follower..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Liste des followers */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredFollowers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'Aucun follower trouvé' : 'Aucun follower à afficher'}
              </p>
            </div>
          ) : (
            filteredFollowers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(follower)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      @{follower.followerHandle || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {follower.followerDid}
                    </p>
                    {follower.interestLevel && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {follower.interestLevel === 'interested' ? 'Très intéressé' : 
                         follower.interestLevel === 'moderately_interested' ? 'Modérément intéressé' :
                         follower.interestLevel}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(follower)}`}>
                    {getStatusText(follower)}
                  </span>
                  
                  {follower.conversationChecked && !follower.alreadyContacted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsContacted(follower.id)}
                      className="text-xs"
                    >
                      Marquer comme contacté
                    </Button>
                  )}
                  
                  {follower.lastMessageAt && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      <div>Dernier message:</div>
                      <div>{new Date(follower.lastMessageAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Informations d'aide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Comment ça fonctionne ?
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Cliquez sur "Vérifier les conversations" pour analyser les DMs existants</li>
            <li>• Les followers déjà contactés seront automatiquement détectés</li>
            <li>• Vous pouvez marquer manuellement des followers comme contactés</li>
            <li>• Cela évite l'envoi de messages en double</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
