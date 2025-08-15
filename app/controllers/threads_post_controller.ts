import type { HttpContext } from '@adonisjs/core/http'
import ThreadsAccount from '#models/threads_account'
import ThreadsPostService from '#services/threads_post_service'

export default class ThreadsPostController {
  /**
   * Create a simple text post on Threads
   */
  async createTextPost({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const { accountId, text, topicTag, linkAttachment } = request.body()

      // Validate input
      if (!text || text.trim().length === 0) {
        return response.badRequest({ error: 'Text is required' })
      }

      if (text.length > 500) {
        return response.badRequest({ error: 'Text posts are limited to 500 characters' })
      }

      // Get the Threads account
      const account = await ThreadsAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      // Check if account can post
      const canPost = await ThreadsPostService.canPost(account)
      if (!canPost) {
        return response.badRequest({ error: 'Account is rate limited' })
      }

      // Create the post
      const postId = await ThreadsPostService.createPost(account, {
        text,
        topicTag,
        linkAttachment,
      })

      return response.ok({
        success: true,
        postId,
        message: 'Threads post created successfully',
      })
    } catch (error) {
      console.error('Threads post creation error:', error)
      return response.internalServerError({
        error: 'Failed to create Threads post',
        details: error.message,
      })
    }
  }

  /**
   * Create an image post on Threads
   */
  async createImagePost({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const { accountId, text, imageUrl, topicTag } = request.body()

      // Validate input
      if (!imageUrl) {
        return response.badRequest({ error: 'Image URL is required' })
      }

      // Get the Threads account
      const account = await ThreadsAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      // Check if account can post
      const canPost = await ThreadsPostService.canPost(account)
      if (!canPost) {
        return response.badRequest({ error: 'Account is rate limited' })
      }

      // Create the post
      const postId = await ThreadsPostService.createPost(account, {
        text,
        imageUrl,
        topicTag,
      })

      return response.ok({
        success: true,
        postId,
        message: 'Threads image post created successfully',
      })
    } catch (error) {
      console.error('Threads image post creation error:', error)
      return response.internalServerError({
        error: 'Failed to create Threads image post',
        details: error.message,
      })
    }
  }

  /**
   * Create a carousel post on Threads
   */
  async createCarouselPost({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const { accountId, text, items, topicTag } = request.body()

      // Validate input
      if (!items || !Array.isArray(items) || items.length < 2 || items.length > 20) {
        return response.badRequest({ error: 'Carousel must have between 2 and 20 items' })
      }

      // Validate each item
      for (const item of items) {
        if (!item.mediaType || !['IMAGE', 'VIDEO'].includes(item.mediaType)) {
          return response.badRequest({ error: 'Each item must have a valid mediaType (IMAGE or VIDEO)' })
        }
        if (item.mediaType === 'IMAGE' && !item.imageUrl) {
          return response.badRequest({ error: 'Image items must have an imageUrl' })
        }
        if (item.mediaType === 'VIDEO' && !item.videoUrl) {
          return response.badRequest({ error: 'Video items must have a videoUrl' })
        }
      }

      // Get the Threads account
      const account = await ThreadsAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      // Check if account can post
      const canPost = await ThreadsPostService.canPost(account)
      if (!canPost) {
        return response.badRequest({ error: 'Account is rate limited' })
      }

      // Create the carousel post
      const postId = await ThreadsPostService.createCarouselPost(account, items, text, topicTag)

      return response.ok({
        success: true,
        postId,
        message: 'Threads carousel post created successfully',
      })
    } catch (error) {
      console.error('Threads carousel post creation error:', error)
      return response.internalServerError({
        error: 'Failed to create Threads carousel post',
        details: error.message,
      })
    }
  }

  /**
   * Get posting limits for a Threads account
   */
  async getPostingLimits({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.getUserOrFail()
      const { accountId } = request.params()

      // Get the Threads account
      const account = await ThreadsAccount.query()
        .where('id', accountId)
        .where('user_id', user.id)
        .firstOrFail()

      const limits = await ThreadsPostService.getPostingLimits(account)

      return response.ok({
        success: true,
        limits,
      })
    } catch (error) {
      console.error('Get posting limits error:', error)
      return response.internalServerError({
        error: 'Failed to get posting limits',
        details: error.message,
      })
    }
  }
}
