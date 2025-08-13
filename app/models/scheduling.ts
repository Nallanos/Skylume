import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Account from './account.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { DateTime } from 'luxon'

export default class Scheduling extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare account_id: string

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

  @column({ serialize: (value: string) => value ? JSON.parse(value) : [] })
  declare images: string

  @column({ 
    columnName: 'alt_texts',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare altTexts: string

  @column({ 
    columnName: 'content_warnings',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare contentWarnings: string

  @column({ 
    columnName: 'videos',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videos: string

  @column({ 
    columnName: 'video_alt_texts',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videoAltTexts: string

  @column({ 
    columnName: 'video_thumbnails',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videoThumbnails: string

  @column({ 
    columnName: 'video_durations',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videoDurations: string

  @column({ 
    columnName: 'video_sizes',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videoSizes: string

  @column({ 
    columnName: 'video_metadata',
    serialize: (value: string) => value ? JSON.parse(value) : [] 
  })
  declare videoMetadata: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Account, { foreignKey: 'account_id' })
  declare account: BelongsTo<typeof Account>

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

  public getVideoCount(): number {
    const videos = Array.isArray(this.videos) ? this.videos : JSON.parse(this.videos || '[]')
    return videos.length
  }

  public getImageCount(): number {
    const images = Array.isArray(this.images) ? this.images : JSON.parse(this.images || '[]')
    return images.length
  }
}