import { inject } from '@adonisjs/core'
import { AtpAgent } from '@atproto/api'
import type { MentionResolution } from '../../types/rich_text.js'

@inject()
export default class MentionResolverService {
  private mentionCache = new Map<string, MentionResolution>()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures

  constructor() {}

  /**
   * Résoudre un handle Bluesky en DID
   */
  public async resolveMentionDid(handle: string): Promise<string | null> {
    // Nettoyer le handle (enlever @ si présent)
    const cleanHandle = handle.replace(/^@/, '')
    
    // Vérifier le cache
    const cached = this.mentionCache.get(cleanHandle)
    if (cached && this.isCacheValid(cached)) {
      return cached.did
    }

    try {
      // Créer un agent temporaire pour la résolution
      const agent = new AtpAgent({ service: 'https://bsky.social' })
      
      // Résoudre le handle
      const response = await agent.resolveHandle({ handle: cleanHandle })
      
      if (response.success && response.data.did) {
        const resolution: MentionResolution = {
          handle: cleanHandle,
          did: response.data.did,
          resolvedAt: new Date()
        }
        
        // Mettre en cache
        this.mentionCache.set(cleanHandle, resolution)
        
        return response.data.did
      }
    } catch (error) {
      console.warn(`Failed to resolve handle ${cleanHandle}:`, error)
    }

    return null
  }

  /**
   * Valider qu'un handle Bluesky est valide
   */
  public isValidHandle(handle: string): boolean {
    const cleanHandle = handle.replace(/^@/, '')
    
    // Format basique: au moins un point et pas de caractères invalides
    const handleRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return handleRegex.test(cleanHandle)
  }

  /**
   * Vérifier si le cache est encore valide
   */
  private isCacheValid(resolution: MentionResolution): boolean {
    const now = new Date().getTime()
    const cacheTime = resolution.resolvedAt.getTime()
    return (now - cacheTime) < this.CACHE_DURATION
  }

  /**
   * Nettoyer le cache des entrées expirées
   */
  public cleanCache(): void {
    for (const [handle, resolution] of this.mentionCache.entries()) {
      if (!this.isCacheValid(resolution)) {
        this.mentionCache.delete(handle)
      }
    }
  }
}
