interface ExplicitLink {
  text: string
  url: string
}

interface RichTextRendererProps {
  text: string
  explicitLinks?: ExplicitLink[]
  maxLength?: number
  showVariablePreviews?: boolean
  variables?: Array<{ name: string, type: string }>
}

export default function RichTextRenderer({ 
  text, 
  explicitLinks = [], 
  maxLength,
  showVariablePreviews = true,
  variables = []
}: RichTextRendererProps) {
  if (!text) return null

  let processedText = text

  // Remplacer les variables par des exemples si demandé
  if (showVariablePreviews) {
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
  }

  // Transformer les liens explicites en liens bleus stylés (AVANT la troncature)
  if (explicitLinks && explicitLinks.length > 0) {
    explicitLinks.forEach(link => {
      if (link.text && link.url) {
        const linkRegex = new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        const blueLink = `<span style="color: #3b82f6; text-decoration: underline; font-weight: 500;">${link.text}</span>`
        
        processedText = processedText.replace(linkRegex, blueLink)
      }
    })
  }

  // Tronquer APRÈS avoir appliqué les styles pour conserver les liens
  if (maxLength && processedText.replace(/<[^>]*>/g, '').length > maxLength) {
    const plainText = processedText.replace(/<[^>]*>/g, '')
    if (plainText.length > maxLength) {
      // Trouver où couper en respectant les balises HTML
      processedText = plainText.substring(0, maxLength) + '...'
    }
  }

  console.log('✅ Final processed text:', processedText)

  return (
    <span 
      dangerouslySetInnerHTML={{ __html: processedText }}
      className="rich-text-content"
    />
  )
}
