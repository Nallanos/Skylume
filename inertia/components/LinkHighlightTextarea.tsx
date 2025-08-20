import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import BlueskyAvatar from './BlueskyAvatar'
import { Hash, AtSign, Link2, MessageCircle, Repeat2, Heart } from 'lucide-react'

interface Account {
  id: string | number
  handle: string
  displayName: string
  platform: 'bluesky' | 'twitter'
  username?: string
  profileImageUrl?: string
  avatar?: string
}

interface LinkHighlightTextareaProps {
  value: string
  onChange: (value: string) => void
  links?: { text: string; url: string }[]
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
  showPreview?: boolean
  previewAccount?: Account | null // ✅ NOUVEAU: Compte pour la preview
}

const LinkHighlightTextarea = forwardRef<HTMLTextAreaElement, LinkHighlightTextareaProps>(
  ({ value, onChange, links = [], placeholder, rows = 5, className = '', disabled = false, showPreview = true, previewAccount = null }, ref) => {
    
    // Fonction pour détecter les hashtags
    const detectHashtags = (text: string) => {
      const hashtagRegex = /#[a-zA-Z0-9_]+/g
      return text.match(hashtagRegex) || []
    }

    // Fonction pour détecter les mentions
    const detectMentions = (text: string) => {
      const mentionRegex = /@[a-zA-Z0-9_.]+/g
      return text.match(mentionRegex) || []
    }

    // Fonction pour créer le rendu avec highlighting
    const renderTextWithHighlights = () => {
      if (!value) {
        return <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
      }

      let parts: (string | ReactNode)[] = [value]
      
      // 1. Traiter les liens explicites d'abord (pour éviter les conflits)
      if (links.length > 0) {
        const sortedLinks = [...links].sort((a, b) => b.text.length - a.text.length)
        
        sortedLinks.forEach((link, linkIndex) => {
          const newParts: (string | ReactNode)[] = []
          
          parts.forEach((part, partIndex) => {
            if (typeof part === 'string') {
              const splitParts = part.split(link.text)
              splitParts.forEach((splitPart, splitIndex) => {
                if (splitIndex > 0) {
                  newParts.push(
                    <span 
                      key={`link-${linkIndex}-${partIndex}-${splitIndex}`}
                      className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-1 rounded border"
                      title={`Link: ${link.url}`}
                    >
                      {link.text}
                    </span>
                  )
                }
                if (splitPart) {
                  newParts.push(splitPart)
                }
              })
            } else {
              newParts.push(part)
            }
          })
          
          parts = newParts
        })
      }

      // 2. Traiter les hashtags
      const hashtags = [...new Set(detectHashtags(value))] // Éviter les doublons
      hashtags.forEach((hashtag, hashtagIndex) => {
        const newParts: (string | ReactNode)[] = []
        
        parts.forEach((part, partIndex) => {
          if (typeof part === 'string') {
            // Utiliser une regex pour un remplacement plus précis
            const hashtagRegex = new RegExp(`(${hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
            const splitParts = part.split(hashtagRegex)
            
            for (let i = 0; i < splitParts.length; i++) {
              if (splitParts[i] === hashtag) {
                newParts.push(
                  <span 
                    key={`hashtag-${hashtagIndex}-${partIndex}-${i}`}
                    className="text-purple-600 dark:text-purple-400 font-medium bg-purple-100 dark:bg-purple-900/30 px-1 rounded"
                    title="Hashtag"
                  >
                    {hashtag}
                  </span>
                )
              } else if (splitParts[i]) {
                newParts.push(splitParts[i])
              }
            }
          } else {
            newParts.push(part)
          }
        })
        
        parts = newParts
      })

      // 3. Traiter les mentions
      const mentions = [...new Set(detectMentions(value))] // Éviter les doublons
      mentions.forEach((mention, mentionIndex) => {
        const newParts: (string | ReactNode)[] = []
        
        parts.forEach((part, partIndex) => {
          if (typeof part === 'string') {
            // Utiliser une regex pour un remplacement plus précis
            const mentionRegex = new RegExp(`(${mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
            const splitParts = part.split(mentionRegex)
            
            for (let i = 0; i < splitParts.length; i++) {
              if (splitParts[i] === mention) {
                newParts.push(
                  <span 
                    key={`mention-${mentionIndex}-${partIndex}-${i}`}
                    className="text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-1 rounded"
                    title="Mention"
                  >
                    {mention}
                  </span>
                )
              } else if (splitParts[i]) {
                newParts.push(splitParts[i])
              }
            }
          } else {
            newParts.push(part)
          }
        })
        
        parts = newParts
      })

      return parts.map((part, index) => (
        typeof part === 'string' ? part : <span key={index}>{part}</span>
      ))
    }

    // Statistiques pour la preview
    const stats = {
      hashtags: detectHashtags(value),
      mentions: detectMentions(value),
      links: links
    }

    const hasRichText = stats.hashtags.length > 0 || stats.mentions.length > 0 || stats.links.length > 0

    return (
      <div className="space-y-2">
        {/* Textarea standard */}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`w-full resize-none ${className}`}
        />
        
        {/* Preview style social media */}
        {showPreview && hasRichText && value && previewAccount && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm">
            {/* En-tête du post */}
            <div className="flex items-start gap-3 mb-3">
              <BlueskyAvatar
                handle={previewAccount.handle}
                displayName={previewAccount.displayName}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                    {previewAccount.displayName}
                  </h4>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    @{previewAccount.platform === 'twitter' ? previewAccount.username || previewAccount.handle : previewAccount.handle}
                  </span>
                  {/* Icône de plateforme */}
                  {previewAccount.platform === 'twitter' ? (
                    <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">𝕏</span>
                    </div>
                  ) : (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">B</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  now · Preview
                </p>
              </div>
            </div>

            {/* Contenu du post avec highlight */}
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words mb-3">
              {renderTextWithHighlights()}
            </div>

            {/* Stats badges en bas */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 text-xs">
                {stats.hashtags.length > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {stats.hashtags.length} hashtag{stats.hashtags.length > 1 ? 's' : ''}
                  </span>
                )}
                {stats.mentions.length > 0 && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <AtSign className="h-3 w-3" />
                    {stats.mentions.length} mention{stats.mentions.length > 1 ? 's' : ''}
                  </span>
                )}
                {stats.links.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {stats.links.length} link{stats.links.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Actions simulées */}
              <div className="flex items-center gap-4 text-gray-400 dark:text-gray-600">
                <span className="flex items-center gap-1 text-xs hover:text-blue-500 transition-colors cursor-pointer">
                  <MessageCircle className="h-3 w-3" />
                  0
                </span>
                <span className="flex items-center gap-1 text-xs hover:text-green-500 transition-colors cursor-pointer">
                  <Repeat2 className="h-3 w-3" />
                  0
                </span>
                <span className="flex items-center gap-1 text-xs hover:text-red-500 transition-colors cursor-pointer">
                  <Heart className="h-3 w-3" />
                  0
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback preview simple si pas de compte */}
        {showPreview && hasRichText && value && !previewAccount && (
          <div className="text-sm p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span>Rich Text Preview:</span>
              
              {/* Stats badges */}
              <div className="flex gap-1 text-xs">
                {stats.hashtags.length > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                    {stats.hashtags.length} hashtag{stats.hashtags.length > 1 ? 's' : ''}
                  </span>
                )}
                {stats.mentions.length > 0 && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                    {stats.mentions.length} mention{stats.mentions.length > 1 ? 's' : ''}
                  </span>
                )}
                {stats.links.length > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    {stats.links.length} link{stats.links.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {renderTextWithHighlights()}
            </div>
          </div>
        )}
      </div>
    )
  }
)

LinkHighlightTextarea.displayName = 'LinkHighlightTextarea'

export default LinkHighlightTextarea
