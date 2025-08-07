import AccountService from "./account_service.js";
import Account from "#models/account";
import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { inject } from "@adonisjs/core";
import { AIService } from "./AI_services.js";
import Feed from "#models/feed";

@inject()
export class FeedService {
  private semanticCache = new Map<string, number>() // Cache for semantic similarity results
  private readonly MAX_CONCURRENT_AI_CALLS = 20 // Limit concurrent AI calls

  constructor(
    private targetAudienceService: AIService
  ) {}

  private getCacheKey(text: string, keywords: string): string {
    return `${text.substring(0, 100)}:${keywords}` // Use first 100 chars to create a reasonable cache key
  }

  // Helper function to process in limited batches for AI calls
  private async processInBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processor))
      results.push(...batchResults)
    }
    
    return results
  }

  private cleanCache() {
    // Clean cache if it gets too large (keep only most recent 1000 entries)
    if (this.semanticCache.size > 1000) {
      const entries = Array.from(this.semanticCache.entries())
      this.semanticCache.clear()
      // Keep the last 500 entries
      entries.slice(-500).forEach(([key, value]) => {
        this.semanticCache.set(key, value)
      })
      console.log('Cache cleaned, kept 500 most recent entries')
    }
  }

  // Apply engagement and date filters to posts
  private applyEngagementAndDateFilters(
    posts: PostView[],
    filters: { minEngagement?: number, minDate?: string }
  ): PostView[] {
    return posts.filter(post => {
      // Calculate total engagement
      const likes = (post as any).likeCount ?? 0
      const reposts = (post as any).repostCount ?? 0
      const replies = (post as any).replyCount ?? 0
      const quotes = (post as any).quoteCount ?? 0
      const totalEngagement = likes + reposts + replies + quotes

      // Apply engagement filter
      if (filters.minEngagement && totalEngagement < filters.minEngagement) {
        return false
      }

      // Apply date filter
      if (filters.minDate && post.record) {
        const postDate = new Date((post.record as any).createdAt || post.indexedAt)
        const filterDate = new Date(filters.minDate)
        if (postDate < filterDate) {
          return false
        }
      }

      return true
    })
  }

  public async getPertinentPosts(
    accountService: AccountService, 
    account: Account, 
    feed: Feed,
    filters?: {
      minEngagement?: number,
      minDate?: string
    }
  ): Promise<{ sortedMatchPosts: PostView[], keywordCursor: Map<string, string | null> }> {
    try {
      await accountService.createOrResumeSession(account)
      
      // Process all keywords in parallel instead of sequentially
      const keywordEntries = Object.entries(feed.keywordsCursor)
      console.log(`Processing ${keywordEntries.length} keywords in parallel...`)
      
      const keywordPromises = keywordEntries.map(async ([word, cursor]) => {
        console.log("Processing keyword:", word, "with cursor:", cursor)
        try {
          const data = await accountService.searchPosts(account, word, cursor!)
          
          // Process posts for this keyword
          let filteredPosts = await this.removeUnpertinentPosts(data.posts, word)
          
          // Apply additional filters if provided
          if (filters && filteredPosts) {
            filteredPosts = this.applyEngagementAndDateFilters(filteredPosts, filters)
          }
          
          return {
            word,
            cursor: data.cursor,
            posts: filteredPosts || []
          }
        } catch (error) {
          console.error(`Error processing keyword "${word}":`, error)
          return {
            word,
            cursor: cursor,
            posts: []
          }
        }
      })
      
      // Wait for all keyword searches to complete
      const results = await Promise.all(keywordPromises)
      
      // Update cursors and collect all posts
      let allMatchPosts: PostView[] = []
      const updatedKeywordsCursor = { ...feed.keywordsCursor }
      
      for (const result of results) {
        if (result.cursor) {
          updatedKeywordsCursor[result.word] = result.cursor
          console.log("Updated cursor for", result.word, ":", result.cursor)
        }
        
        if (result.posts.length > 0) {
          allMatchPosts.push(...result.posts)
          console.log(`Added ${result.posts.length} posts for keyword "${result.word}"`)
        }
      }
      
      // Save updated cursors
      feed.keywordsCursor = updatedKeywordsCursor
      await feed.save()
      
      // Remove duplicates based on post URI and sort by engagement
      const uniquePosts = allMatchPosts.filter((post, index, self) => 
        index === self.findIndex(p => p.uri === post.uri)
      )
      
      console.log(`Total unique posts found: ${uniquePosts.length} (from ${allMatchPosts.length} total posts)`)
      
      const keywordCursorMap = new Map(Object.entries(feed.keywordsCursor))
      return { sortedMatchPosts: uniquePosts, keywordCursor: keywordCursorMap }
    } catch (error) {
      throw new Error(`Error fetching pertinent posts: ${error}`);
    }
  }

  private async removeUnpertinentPosts(posts: PostView[], keywords: string) {
    if (!posts || posts.length === 0) {
      return []
    }
    
    // Filter out posts that don't meet basic criteria first (faster)
    const validPosts = posts.filter(post => {
      const text = (post.record as { text: string }).text;
      const langs = (post.record as { langs: string[] }).langs;
      return text && langs && langs[0] === "en";
    })
    
    if (validPosts.length === 0) {
      return []
    }
    
    console.log(`Processing ${validPosts.length} valid posts for semantic similarity (keyword: "${keywords}")`)
    
    const startTime = Date.now()
    
    // Process posts in controlled batches to avoid overwhelming the AI service
    const postsWithScores = await this.processInBatches(
      validPosts,
      this.MAX_CONCURRENT_AI_CALLS,
      async (post) => {
        try {
          const text = (post.record as { text: string }).text;
          const cacheKey = this.getCacheKey(text, keywords);
          
          // Check cache first
          let score = this.semanticCache.get(cacheKey);
          if (score === undefined) {
            // Not in cache, calculate and store
            score = await this.targetAudienceService.getSemanticSimilarity(text, keywords);
            this.semanticCache.set(cacheKey, score);
          }
          
          return { post, score };
        } catch (error) {
          console.error('Error getting semantic similarity for post:', error)
          return { post, score: 0 };
        }
      }
    );
    
    const processingTime = Date.now() - startTime
    console.log(`Semantic similarity processing for "${keywords}" completed in ${processingTime}ms (cache size: ${this.semanticCache.size})`)

    // Clean cache periodically
    this.cleanCache()

    const filteredAndSorted = postsWithScores
      .filter(({ score }) => score > 0.1) // Filter out posts with very low similarity scores
      .sort((a, b) => b.score - a.score)
      .map(({ post }) => post);
    
    console.log(`Filtered to ${filteredAndSorted.length} relevant posts for keyword "${keywords}"`)
    return filteredAndSorted;
  }

}