export interface ExplicitLink {
  text: string // Texte à transformer en lien
  url: string  // URL de destination
}

export interface RichTextFacet {
  index: {
    byteStart: number
    byteEnd: number
  }
  features: Array<{
    $type: 'app.bsky.richtext.facet#link' | 'app.bsky.richtext.facet#mention' | 'app.bsky.richtext.facet#tag'
    uri?: string    // Pour les liens
    did?: string    // Pour les mentions
    tag?: string    // Pour les hashtags
  }>
}

export interface ParsedRichText {
  text: string
  facets: RichTextFacet[]
}

export interface MentionResolution {
  handle: string
  did: string
  resolvedAt: Date
}
