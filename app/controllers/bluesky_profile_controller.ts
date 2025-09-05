import type { HttpContext } from '@adonisjs/core/http'
import { AtpAgent } from '@atproto/api'

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

      const profiles = []
      // Create a public agent for profile fetching
      const agent = new AtpAgent({ service: 'https://bsky.social' })
      
      for (const handle of handles.slice(0, 12)) { // Limit to 12 profiles max
        try {
          const res = await agent.getProfile({ actor: handle })
          if (res?.data) {
            const profile = res.data
            profiles.push({
              handle: profile.handle,
              displayName: profile.displayName || profile.handle,
              avatar: profile.avatar,
              description: profile.description,
              followersCount: profile.followersCount
            })
          }
        } catch (error) {
          console.log(`Failed to fetch profile for ${handle}:`, error.message)
          // Continue with other profiles
        }
      }

      return response.ok({ profiles })
    } catch (error) {
      console.error('Error fetching Bluesky profiles:', error)
      return response.internalServerError({ error: 'Failed to fetch profiles' })
    }
  }
}
