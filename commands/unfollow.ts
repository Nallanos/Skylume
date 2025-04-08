import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { AtpAgent } from '@atproto/api'
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'

export default class Unfollow extends BaseCommand {
  static commandName = 'unfollow'
  static description = ''

  static options: CommandOptions = {}

  async run() {
    const agent = new AtpAgent({
      service: 'https://bsky.social/',
    })

    await agent.login({
      identifier: "allanbe.bsky.social",
      password: "psnw-vygg-oooh-uisz",
    })

    const profiles: ProfileView[] = []
    let cursor: string = ''
    try {
      while (profiles.length < 3000) {
        const response = await agent.getFollows({
          actor: "nallanos.bsky.social",
          limit: 100,
          cursor,
        })
        console.log(profiles)
        profiles.push(...response.data.follows)
        if (!response.data.cursor) {
          break
        }
        cursor = response.data.cursor
      }
    } catch (error) {
      this.logger.error('Failed to fetch follows', error)
      throw error
    }

    // Unfollow all
    for (const profile of profiles) {
      try {
        if (profile.viewer?.following) {
          console.log(`Unfollowing ${profile.handle}`)
          await agent.deleteFollow(profile.viewer?.following!)
        }
      } catch (error) {
        console.log(error)
      }
    }
  }
}