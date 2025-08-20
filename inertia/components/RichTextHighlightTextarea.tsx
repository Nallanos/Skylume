import { forwardRef } from 'react'
import type { ReactNode } from 'react'

interface RichTextHighlightTextareaProps {
  value: string
  onChange: (value: string) => void
  links?: { text: string; url: string }[]
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
  showPreview?: boolean
}

const RichTextHighlightTextarea = forwardRef<HTMLTextAreaElement, RichTextHighlightTextareaProps>(
  ({ value, onChange, links = [], placeholder, rows = 5, className = '', disabled = false, showPreview = true }, ref) => {
    
    // Fonction pour détecter les hashtags
    const detectHashtags = (text: string) => {
      const hashtagRegex = /#[\w]+/g
      return text.match(hashtagRegex) || []
    }

    // Fonction pour détecter les mentions
    const detectMentions = (text: string) => {
      const mentionRegex = /@[\w.]+/g
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
      const hashtags = detectHashtags(value)
      hashtags.forEach((hashtag, hashtagIndex) => {
        const newParts: (string | ReactNode)[] = []
        
        parts.forEach((part, partIndex) => {
          if (typeof part === 'string') {
            const splitParts = part.split(hashtag)
            splitParts.forEach((splitPart, splitIndex) => {
              if (splitIndex > 0) {
                newParts.push(
                  <span 
                    key={`hashtag-${hashtagIndex}-${partIndex}-${splitIndex}`}
                    className="text-purple-600 dark:text-purple-400 font-medium bg-purple-100 dark:bg-purple-900/30 px-1 rounded"
                    title="Hashtag"
                  >
                    {hashtag}
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

      // 3. Traiter les mentions
      const mentions = detectMentions(value)
      mentions.forEach((mention, mentionIndex) => {
        const newParts: (string | ReactNode)[] = []
        
        parts.forEach((part, partIndex) => {
          if (typeof part === 'string') {
            const splitParts = part.split(mention)
            splitParts.forEach((splitPart, splitIndex) => {
              if (splitIndex > 0) {
                newParts.push(
                  <span 
                    key={`mention-${mentionIndex}-${partIndex}-${splitIndex}`}
                    className="text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-1 rounded"
                    title="Mention"
                  >
                    {mention}
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
        
        {/* Preview des éléments rich text détectés */}
        {showPreview && hasRichText && value && (
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

RichTextHighlightTextarea.displayName = 'RichTextHighlightTextarea'

export default RichTextHighlightTextarea
