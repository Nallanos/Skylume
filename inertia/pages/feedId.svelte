<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { Card, CardHeader, CardContent } from '@/ui/card'
  import { Button } from '@/ui/button'
  import { Heart, Repeat2, MessageSquareQuote, Share } from 'lucide-svelte'
  import { page, router } from '@inertiajs/svelte'

  export let posts: any[] = []
  let isLoading = false
  let hasMore = true

  console.log('posts', posts)

  async function fetchPosts() {
    try {
      console.log('fething posts')
      if (isLoading || !hasMore) return
      console.log('still fething posts')

      isLoading = true

      const id = $page.url.match(/\/feed\/([^/]+)/)[1]

      router.get(`/feed/${id}/getPosts`)
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }
</script>

<main class="flex md:flex-row min-h-screen">
  <div class="h-screen fixed">
    <Sidebar user={$page.props.user} />
  </div>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scroll">
      <div class="max-w-2xl mx-auto space-y-6 gap-4 px-4 py-8">
        <!-- En-tête -->
        <div class="flex items-center gap-4 mb-6">
          <a href="/feed" class="text-gray-300 hover:text-purple-400 transition-colors">
            <!-- Icône de retour -->
          </a>
          <h1 class="text-2xl font-bold text-gray-100">Others Feeds</h1>
        </div>

        <!-- Liste des posts -->
        {#each posts as post (post.uri)}
          <Card
            class="group hover:border-purple-400/30 transition-colors border-gray-700 bg-gray-800/40 backdrop-blur-sm"
          >
            <a
              href={`https://bsky.app/profile/${post.author.handle}/post/${post.uri.match(/\/([a-zA-Z0-9]+)$/)[1]}`}
              target="_blank"
            >
              <CardHeader class="items-start space-x-3 pb-4 w-full">
                <div class="flex items-center gap-3 w-full">
                  <img
                    src={post.author.avatar}
                    alt={post.author.displayName}
                    class="h-10 w-10 rounded-full border-2 border-purple-400/20"
                  />
                  <div class="flex">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-100">{post.author.displayName}</span>
                      <span class="text-sm text-gray-400">@{post.author.handle}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent class="space-y-4">
                <p class="text-gray-200 whitespace-pre-line leading-relaxed">
                  {#each post.record.text.split('\n') as line}
                    {line}
                  {/each}
                </p>

                {#if post.embed?.images?.length}
                  <div class="mt-4 rounded-xl overflow-hidden border border-gray-700">
                    <img
                      src={post.embed.images[0].thumb}
                      alt={post.embed.images[0].alt}
                      class="w-full object-cover"
                      style="aspect-ratio: {post.embed.images[0].aspectRatio.width}/{post.embed
                        .images[0].aspectRatio.height};"
                    />
                  </div>
                {/if}

                {#if post.record.facets}
                  <div class="flex flex-wrap gap-2">
                    {#each post.record.facets as facet}
                      {#each facet.features as feature}
                        {#if feature.tag}
                          <span
                            class="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer text-sm"
                          >
                            #{feature.tag}
                          </span>
                        {/if}
                      {/each}
                    {/each}
                  </div>
                {/if}

                <div class="flex items-center justify-between text-gray-400">
                  <div class="flex items-center gap-4">
                    <Button variant="ghost" size="sm" class="hover:text-red-400">
                      <Heart class="h-4 w-4 mr-2" />
                      {post.likeCount || 0}
                    </Button>

                    <Button variant="ghost" size="sm" class="hover:text-green-400">
                      <Repeat2 class="h-4 w-4 mr-2" />
                      {post.repostCount || 0}
                    </Button>

                    <Button variant="ghost" size="sm" class="hover:text-blue-400">
                      <MessageSquareQuote class="h-4 w-4 mr-2" />
                      {post.quoteCount || 0}
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" class="hover:text-gray-200">
                    <Share class="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </a>
          </Card>
        {/each}
        {#if isLoading}
          <div class="text-center py-4">
            <div
              class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"
            ></div>
            <p class="text-sm text-gray-500">
              The estimated wait time is approximately 7 seconds per selected keyword.
            </p>
          </div>
        {/if}
        <div class="text-center flex items-center justify-center w-full py-4">
          <Button variant="outline" on:click={fetchPosts}>Load posts</Button>
        </div>
      </div>
    </div>
  </div>
</main>

<style global>
  .custom-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(192, 132, 252, 0.4) rgba(39, 39, 42, 0.2);
  }

  .custom-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scroll::-webkit-scrollbar-track {
    background: rgba(39, 39, 42, 0.1);
  }

  .custom-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(192, 132, 252, 0.4);
    border-radius: 4px;
  }

  .post-card {
    background: linear-gradient(145deg, rgba(39, 39, 42, 0.5) 0%, rgba(63, 63, 70, 0.1) 100%);
    backdrop-filter: blur(12px);
  }

  .hashtag:hover {
    text-shadow: 0 0 8px rgba(192, 132, 252, 0.4);
  }
</style>
