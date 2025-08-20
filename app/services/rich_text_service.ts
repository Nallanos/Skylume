import { inject } from '@adonisjs/core'
import type { ExplicitLink, RichTextFacet, ParsedRichText } from '../../types/rich_text.js'
import MentionResolverService from './mention_resolver_service.js'

@inject()
export default class RichTextService {
  private encoder = new TextEncoder()

  constructor(
    protected mentionResolver: MentionResolverService
  ) {}

  /**
   * Parser le texte pour détecter et générer les facets
   * Version améliorée qui peut extraire les liens du texte ou utiliser une liste explicite
   */
  public async parseText(text: string, explicitLinks: ExplicitLink[] = []): Promise<ParsedRichText> {
    const facets: RichTextFacet[] = []

    // Traiter les liens explicites en premier
    const linkFacets = await this.processExplicitLinks(text, explicitLinks)
    facets.push(...linkFacets)

    // Détecter les hashtags
    const hashtagFacets = this.detectHashtags(text)
    facets.push(...hashtagFacets)

    // Détecter les mentions
    const mentionFacets = await this.detectMentions(text)
    facets.push(...mentionFacets)

    // Trier par byteStart et supprimer les chevauchements
    const sortedFacets = this.sortAndDeduplicateFacets(facets)

    return {
      text,
      facets: sortedFacets
    }
  }

  /**
   * ✅ NOUVEAU: Extraire automatiquement les liens configurés depuis le texte et la liste des liens
   * Cette méthode scanne le texte pour trouver toutes les occurrences des textes de liens
   */
  public extractLinksFromTextAndConfig(text: string, explicitLinks: ExplicitLink[]): ExplicitLink[] {
    const extractedLinks: ExplicitLink[] = []

    for (const link of explicitLinks) {
      // Chercher toutes les occurrences du texte dans le message
      let searchIndex = 0
      while (true) {
        const index = text.indexOf(link.text, searchIndex)
        if (index === -1) break

        // Ajouter chaque occurrence trouvée
        extractedLinks.push({
          text: link.text,
          url: link.url
        })

        searchIndex = index + link.text.length
      }
    }

    return extractedLinks
  }

  /**
   * Traiter les liens explicites fournis par l'utilisateur
   * ✅ AMÉLIORÉ: Gère maintenant toutes les occurrences du texte
   */
  public async processExplicitLinks(text: string, explicitLinks: ExplicitLink[]): Promise<RichTextFacet[]> {
    const facets: RichTextFacet[] = []

    for (const link of explicitLinks) {
      // Chercher toutes les occurrences du texte
      let searchIndex = 0
      while (true) {
        const index = text.indexOf(link.text, searchIndex)
        if (index === -1) break

        const byteStart = this.utf16IndexToUtf8Index(text, index)
        const byteEnd = this.utf16IndexToUtf8Index(text, index + link.text.length)

        facets.push({
          index: {
            byteStart,
            byteEnd
          },
          features: [{
            $type: 'app.bsky.richtext.facet#link',
            uri: link.url
          }]
        })

        searchIndex = index + link.text.length
      }
    }

    return facets
  }

  /**
   * Détecter les hashtags dans le texte
   */
  public detectHashtags(text: string): RichTextFacet[] {
    const facets: RichTextFacet[] = []
    // ✅ CORRIGÉ: Regex plus simple et précise
    const hashtagRegex = /#[a-zA-Z0-9_]+/g
    let match

    while ((match = hashtagRegex.exec(text)) !== null) {
      const fullHashtag = match[0] // "#buildinpublic"
      const tagWithoutHash = fullHashtag.substring(1) // "buildinpublic"
      
      // Vérifier la longueur (max 64 chars sans le #)
      if (tagWithoutHash.length === 0 || tagWithoutHash.length > 64) continue

      const startIndex = match.index
      const endIndex = match.index + fullHashtag.length
      
      const byteStart = this.utf16IndexToUtf8Index(text, startIndex)
      const byteEnd = this.utf16IndexToUtf8Index(text, endIndex)

      facets.push({
        index: {
          byteStart,
          byteEnd
        },
        features: [{
          $type: 'app.bsky.richtext.facet#tag',
          tag: tagWithoutHash
        }]
      })
    }

    return facets
  }

  /**
   * Détecter les mentions dans le texte
   */
  public async detectMentions(text: string): Promise<RichTextFacet[]> {
    const facets: RichTextFacet[] = []
    const mentionRegex = /(^|\s|\()(@)([a-zA-Z0-9.-]+)(\b)/g
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const handle = match[3]
      
      // Valider le handle
      if (!this.mentionResolver.isValidHandle(handle)) {
        continue
      }

      // Résoudre le DID
      const did = await this.mentionResolver.resolveMentionDid(handle)
      if (!did) {
        console.warn(`Could not resolve handle: ${handle}`)
        continue
      }

      const startIndex = text.indexOf(match[3], match.index) - 1 // -1 pour inclure @
      const byteStart = this.utf16IndexToUtf8Index(text, startIndex)
      const byteEnd = this.utf16IndexToUtf8Index(text, startIndex + handle.length + 1) // +1 pour @

      facets.push({
        index: {
          byteStart,
          byteEnd
        },
        features: [{
          $type: 'app.bsky.richtext.facet#mention',
          did: did
        }]
      })
    }

    return facets
  }

  /**
   * Convertir un index UTF-16 en index UTF-8 (byte offset)
   */
  public utf16IndexToUtf8Index(text: string, utf16Index: number): number {
    const utf16Slice = text.slice(0, utf16Index)
    return this.encoder.encode(utf16Slice).byteLength
  }

  /**
   * Trier les facets par byteStart et supprimer les chevauchements
   */
  private sortAndDeduplicateFacets(facets: RichTextFacet[]): RichTextFacet[] {
    // Trier par byteStart
    const sorted = facets.sort((a, b) => a.index.byteStart - b.index.byteStart)
    
    // Supprimer les chevauchements
    const deduplicated: RichTextFacet[] = []
    let lastEnd = 0

    for (const facet of sorted) {
      if (facet.index.byteStart >= lastEnd) {
        deduplicated.push(facet)
        lastEnd = facet.index.byteEnd
      }
    }

    return deduplicated
  }

  /**
   * Valider une URL
   */
  public isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Valider une liste de liens explicites
   */
  public validateExplicitLinks(links: ExplicitLink[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const link of links) {
      if (!link.text || link.text.trim().length === 0) {
        errors.push('Link text cannot be empty')
      }
      
      if (!link.url || !this.isValidUrl(link.url)) {
        errors.push(`Invalid URL: ${link.url}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
