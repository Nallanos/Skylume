import type { HttpContext } from '@adonisjs/core/http'
import { AtpAgent } from '@atproto/api'
import env from '#start/env'

export default class BlueskyProfileController {
  /**
   * Fetch Bluesky profiles for the carousel
   */
  async getProfiles({ request, response }: HttpContext) {
    try {
      const { handles } = request.only(['handles'])
      
      if (!handles || !Array.isArray(handles)) {
        return response.badRequest({ error: 'Handles array is required' })
      }

      console.log(`🔍 Fetching ${handles.length} Bluesky profiles for carousel`)

      const profiles = []
      // Create an agent for profile fetching
      const agent = new AtpAgent({ service: 'https://bsky.social' })
      
      // Try to authenticate if credentials are available
      try {
        const blueskyId = process.env.BLUESKY_IDENTIFIER
        const blueskyPassword = process.env.BLUESKY_PASSWORD
        
        if (blueskyId && blueskyPassword) {
          console.log(`🔐 Using authenticated Bluesky agent with identifier: ${blueskyId}`)
          await agent.login({
            identifier: blueskyId,
            password: blueskyPassword
          })
        } else {
          console.log(`📋 Using public Bluesky agent (no credentials configured)`)
        }
      } catch (authError) {
        console.log(`⚠️ Authentication failed, using public agent:`, authError.message)
        // Continue with public agent
      }
      
      for (const handle of handles.slice(0, 12)) { // Limit to 12 profiles max
        try {
          console.log(`🔍 Fetching profile for: ${handle}`)
          const res = await agent.getProfile({ actor: handle })
          if (res?.data) {
            const profile = res.data
            console.log(`✅ Profile found for ${handle}: ${profile.displayName || profile.handle}`)
            profiles.push({
              handle: profile.handle,
              displayName: profile.displayName || profile.handle,
              avatar: profile.avatar,
              description: profile.description,
              followersCount: profile.followersCount
            })
          }
        } catch (error) {
          console.log(`❌ Failed to fetch profile for ${handle}:`, error.message)
          // Continue with other profiles
        }
      }

      console.log(`📸 Successfully fetched ${profiles.length} profiles`)
      return response.ok({ profiles })
    } catch (error) {
      console.error('❌ Error fetching Bluesky profiles:', error)
      return response.internalServerError({ error: 'Failed to fetch profiles' })
    }
  }
}
