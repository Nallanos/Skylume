import AccountService from "./account_service.js";
import Account from "#models/account";
import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { inject } from "@adonisjs/core";
import TargetAudienceService from "./AI_services.js";
import Feed from "#models/feed";

@inject()
export class FeedService {
  public async getPertinentPosts(accountService: AccountService, account: Account, feed: Feed): Promise<{ sortedMatchPosts: PostView[], keywordCursor: Map<string, string | null> }> {
    try {
      await accountService.createOrResumeSession(account)
      let sortedMatchPosts: PostView[] = []
      for (const [word, cursor] of Object.entries(feed.keywordsCursor)) {
        console.log("keywordCursor before", [word, cursor])
        const data = await accountService.searchPosts(account, word, cursor!)

        if (data.cursor) {
          feed.keywordsCursor[word] = data.cursor
          await feed.save()
          console.log("keywordCursor after", [word, feed.keywordsCursor[word]])
        }

        sortedMatchPosts = await this.removeUnpertinentPosts(data.posts, word[0])
        if (!sortedMatchPosts) {
          throw new Error(`No posts found for keyword: ${word}`);
        }
      }
      const keywordCursorMap = new Map(Object.entries(feed.keywordsCursor))
      return { sortedMatchPosts, keywordCursor: keywordCursorMap }
    } catch (error) {
      throw new Error(`Error fetching pertinent posts: ${error}`);
    }

  }

  private async removeUnpertinentPosts(posts: PostView[], keywords: string) {
    const postsWithScores = await Promise.all(posts.map(async (post) => {
      const text = (post.record as { text: string }).text;
      const langs = (post.record as { langs: string[] }).langs;
      if (!text || !langs || langs[0] !== "en") {
        return { post, score: 0 };
      }
      const score = await TargetAudienceService.getSemanticSimilarity(text, keywords);
      return { post, score };
    }));

    const filteredAndSorted = postsWithScores
      .sort((a, b) => b.score - a.score)
      .map(({ post }) => post);
    console.log("filteredAndSorted", filteredAndSorted)
    return filteredAndSorted;
  }

}