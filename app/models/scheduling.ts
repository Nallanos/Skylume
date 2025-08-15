import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Account from './account.js'
import TwitterAccount from './twitter_account.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { DateTime } from 'luxon'

export default class Scheduling extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string | null

  @column({ columnName: 'twitter_account_id' })
  declare twitterAccountId: number | null

  @column()
  declare message: string

  @column.dateTime()
  declare scheduleTime: DateTime

  @column()
  declare userId: string

  @column()
  declare status: string

  @column()
  declare jobId: string

  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare images: string

  @column({ 
    columnName: 'alt_texts',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare altTexts: string

  @column({ 
    columnName: 'content_warnings',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare contentWarnings: string

  @column({ 
    columnName: 'videos',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videos: string

  @column({ 
    columnName: 'video_alt_texts',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videoAltTexts: string

  @column({ 
    columnName: 'video_thumbnails',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videoThumbnails: string

  @column({ 
    columnName: 'video_durations',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videoDurations: string

  @column({ 
    columnName: 'video_sizes',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videoSizes: string

  @column({ 
    columnName: 'video_metadata',
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
  })
  declare videoMetadata: string

  // Crossposting fields
  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return []
      // Handle legacy data - if it's just a string like "bluesky", convert to array
      if (typeof value === 'string' && !value.startsWith('[')) {
        return [value]
      }
      try {
        return JSON.parse(value)
      } catch {
        // If JSON parsing fails, treat as a single platform string
        return [value]
      }
    }
  })
  declare crosspostPlatforms: string

  @column()
  declare enableCrosspost: boolean

  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return {}
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
  })
  declare twitterSettings: string

  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return {}
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
  })
  declare platformStatuses: string

  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return {}
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
  })
  declare platformPostIds: string

  @column({ 
    prepare: (value: any) => JSON.stringify(value),
    consume: (value: string) => {
      if (!value) return {}
      try {
        return JSON.parse(value)
      } catch {
        return {}
      }
    }
  })
  declare platformErrors: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account, { foreignKey: 'account_id' })
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => TwitterAccount, { foreignKey: 'twitterAccountId' })
  declare twitterAccount: BelongsTo<typeof TwitterAccount>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  // Helper methods for video validation
  public hasVideos(): boolean {
    const videos = Array.isArray(this.videos) ? this.videos : JSON.parse(this.videos || '[]')
    return videos.length > 0
  }

  public hasImages(): boolean {
    const images = Array.isArray(this.images) ? this.images : JSON.parse(this.images || '[]')
    return images.length > 0
  }

  // Crossposting helper methods
  public getCrosspostPlatforms(): string[] {
    return Array.isArray(this.crosspostPlatforms) ? this.crosspostPlatforms : JSON.parse(this.crosspostPlatforms || '[]')
  }

  public getPlatformStatuses(): Record<string, string> {
    return typeof this.platformStatuses === 'object' ? this.platformStatuses : JSON.parse(this.platformStatuses || '{}')
  }

  public getPlatformPostIds(): Record<string, string> {
    return typeof this.platformPostIds === 'object' ? this.platformPostIds : JSON.parse(this.platformPostIds || '{}')
  }

  public getPlatformErrors(): Record<string, string> {
    return typeof this.platformErrors === 'object' ? this.platformErrors : JSON.parse(this.platformErrors || '{}')
  }

  public updatePlatformStatus(platform: string, status: string): void {
    const statuses = this.getPlatformStatuses()
    statuses[platform] = status
    this.platformStatuses = JSON.stringify(statuses)
  }

  public updatePlatformPostId(platform: string, postId: string): void {
    const postIds = this.getPlatformPostIds()
    postIds[platform] = postId
    this.platformPostIds = JSON.stringify(postIds)
  }

  public updatePlatformError(platform: string, error: string): void {
    const errors = this.getPlatformErrors()
    errors[platform] = error
    this.platformErrors = JSON.stringify(errors)
  }

  public getVideoCount(): number {
    const videos = Array.isArray(this.videos) ? this.videos : JSON.parse(this.videos || '[]')
    return videos.length
  }

  public getImageCount(): number {
    const images = Array.isArray(this.images) ? this.images : JSON.parse(this.images || '[]')
    return images.length
  }
}