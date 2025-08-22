import type { ExplicitLink } from '../../types/rich_text'

interface RichTextDisplayProps {
  text: string
  explicitLinks?: ExplicitLink[]
  variables?: Array<{ name: string, type: string }>
  maxLength?: number
}

/**
 * Composant pour afficher du texte enrichi avec liens et variables
 */
export default function RichTextDisplay({ 
  text, 
  explicitLinks = [], 
  variables = [], 
  maxLength 
}: RichTextDisplayProps) {
  
  const renderEnrichedText = () => {
    if (!text) return null
    
    let processedText = text
    
    // 1. Tronquer d'abord si nécessaire
    if (maxLength && processedText.length > maxLength) {
      processedText = processedText.substring(0, maxLength) + '...'
    }
    
    // 2. Remplacer les variables par des exemples
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
      
      processedText = processedText.replace(regex, replacement)
    })
    
    // 3. Transformer les liens explicites en liens bleus (APRÈS la troncature)
    explicitLinks.forEach(link => {
      const linkRegex = new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const blueLink = `<span style="color: #3b82f6; text-decoration: underline;">${link.text}</span>`
      processedText = processedText.replace(linkRegex, blueLink)
    })
    
    return processedText
  }

  const enrichedText = renderEnrichedText()
  
  if (!enrichedText) {
    return null
  }

  return (
    <span dangerouslySetInnerHTML={{ __html: enrichedText }} />
  )
}

/**
 * Hook pour enrichir du texte sans rendu React
 */
export function useRichTextProcessing() {
  const processRichText = (
    text: string, 
    explicitLinks: ExplicitLink[] = [], 
    variables: Array<{ name: string, type: string }> = [],
    maxLength?: number
  ): string => {
    if (!text) return ''
    
    let processedText = text
    
    // 1. Tronquer d'abord si nécessaire
    if (maxLength && processedText.length > maxLength) {
      processedText = processedText.substring(0, maxLength) + '...'
    }
    
    // 2. Remplacer les variables par des exemples
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
      
      processedText = processedText.replace(regex, replacement)
    })
    
    // 3. Transformer les liens explicites en liens bleus
    explicitLinks.forEach(link => {
      const linkRegex = new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const blueLink = `<span style="color: #3b82f6; text-decoration: underline;">${link.text}</span>`
      processedText = processedText.replace(linkRegex, blueLink)
    })
    
    return processedText
  }

  return { processRichText }
}
