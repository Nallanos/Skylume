<script lang="ts">
  import Layout from '@/components/Layout.svelte'
  import { Card, CardHeader, CardContent, CardFooter } from '@/shadcn-ui/card'
  import { Button } from '@/shadcn-ui/button'
  import { Heart, Repeat2, MessageSquareQuote, Share, ArrowLeft, Clock } from 'lucide-svelte'
  import { page, router } from '@inertiajs/svelte'
  import { fade } from 'svelte/transition'
  import { format } from 'date-fns'
  import { onMount } from 'svelte'

  export let posts: any[] = []
  let isLoading = false
  let hasMore = true

  function getTimeSince(created: string) {
    const date = new Date(created)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) {
      return `${seconds}s`
    }

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) {
      return `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
      return `${hours}h`
    }

    const days = Math.floor(hours / 24)
    if (days < 7) {
      return `${days}d`
    }

    return format(date, 'MMM d')
  }

  async function fetchPosts() {
    try {
      if (isLoading || !hasMore) return
      isLoading = true
      const id = $page.url.match(/\/feed\/([^/]+)/)[1]
      router.get(`/feed/${id}/getPosts`)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      isLoading = false
    }
  }

  async function loadInitialPosts() {
    try {
      isLoading = true
      const id = $page.url.match(/\/feed\/([^/]+)/)[1]
      router.get(`/feed/${id}/getPosts`)
    } catch (error) {
      console.error('Error loading initial posts:', error)
    } finally {
      isLoading = false
    }
  }

  onMount(() => {
    if (posts.length === 0) {
      loadInitialPosts()
    }
  })
</script>

<Layout user={$page.props.user}>
  <div class="max-w-3xl mx-auto px-4">
    <!-- En-tête -->
    <div class="flex items-center gap-4 mb-8">
      <a href="/feed" class="text-primary hover:text-primary/80 transition-colors">
        <ArrowLeft class="h-5 w-5" />
      </a>
      <h1 class="text-2xl font-bold">Feed Content</h1>
    </div>

    <!-- Liste des posts -->
    <div class="space-y-6">
      {#each posts as post, i (post.uri)}
        <div in:fade={{ delay: i * 100, duration: 300 }}>
          <Card
            class="group hover:border-primary/30 transition-all duration-300 border-border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md overflow-hidden"
          >
            <a
              href={`https://bsky.app/profile/${post.author.handle}/post/${post.uri.match(/\/([a-zA-Z0-9]+)$/)[1]}`}
              target="_blank"
              class="block"
            >
              <CardHeader class="pb-3 border-b border-border/10">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <img
                        src={post.author.avatar || 'https://avatars.githubusercontent.com/u/1?v=4'}
                        alt={post.author.displayName}
                        class="h-10 w-10 rounded-full object-cover border-2 border-primary/10"
                        on:error={(e) => {
                          if (e.currentTarget instanceof HTMLImageElement) {
                            e.currentTarget.src = 'https://avatars.githubusercontent.com/u/1?v=4'
                          }
                        }}
                      />
                      <div
                        class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary/20 border border-background flex items-center justify-center"
                      >
                        <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      </div>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold line-clamp-1"
                          >{post.author.displayName || post.author.handle}</span
                        >
                        {#if post.author.verified}
                          <span class="text-primary">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </span>
                        {/if}
                      </div>
                      <div class="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>@{post.author.handle}</span>
                        <span>·</span>
                        <span class="flex items-center gap-1">
                          <Clock class="h-3 w-3" />
                          {getTimeSince(post.indexedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent class="py-4 space-y-4">
                <div class="prose-sm dark:prose-invert max-w-none">
                  <p class="whitespace-pre-line leading-relaxed text-foreground">
                    {post.record.text}
                  </p>
                </div>

                {#if post.embed?.images?.length}
                  <div class="mt-4 rounded-xl overflow-hidden">
                    <img
                      src={post.embed.images[0].fullsize || post.embed.images[0].thumb}
                      alt={post.embed.images[0].alt}
                      class="w-full object-cover hover:scale-[1.02] transition-transform"
                      style="aspect-ratio: {post.embed.images[0].aspectRatio?.width || 16}/{post
                        .embed.images[0].aspectRatio?.height || 9};"
                      loading="lazy"
                    />
                  </div>
                {/if}

                {#if post.record.facets}
                  <div class="flex flex-wrap gap-2 pt-2">
                    {#each post.record.facets || [] as facet}
                      {#each facet.features || [] as feature}
                        {#if feature.tag}
                          <span
                            class="text-primary hover:text-primary/80 transition-colors cursor-pointer text-sm bg-primary/10 px-2 py-1 rounded-full font-medium"
                          >
                            #{feature.tag}
                          </span>
                        {/if}
                      {/each}
                    {/each}
                  </div>
                {/if}
              </CardContent>

              <CardFooter class="pt-0 pb-3 border-t border-border/10">
                <div class="flex items-center justify-between w-full text-muted-foreground">
                  <div class="flex items-center gap-5">
                    <div class="flex items-center gap-1 group/like">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 rounded-full group-hover/like:text-red-500"
                      >
                        <Heart class="h-4 w-4" />
                      </Button>
                      <span class="text-sm group-hover/like:text-red-500"
                        >{post.likeCount || 0}</span
                      >
                    </div>

                    <div class="flex items-center gap-1 group/repost">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 rounded-full group-hover/repost:text-green-500"
                      >
                        <Repeat2 class="h-4 w-4" />
                      </Button>
                      <span class="text-sm group-hover/repost:text-green-500"
                        >{post.repostCount || 0}</span
                      >
                    </div>

                    <div class="flex items-center gap-1 group/reply">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 rounded-full group-hover/reply:text-blue-500"
                      >
                        <MessageSquareQuote class="h-4 w-4" />
                      </Button>
                      <span class="text-sm group-hover/reply:text-blue-500"
                        >{post.replyCount || 0}</span
                      >
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 rounded-full hover:text-primary"
                  >
                    <Share class="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </a>
          </Card>
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-16">
          <div class="text-center space-y-4">
            <div class="bg-primary/10 rounded-full p-4 inline-flex">
              <MessageSquareQuote class="h-8 w-8 text-primary" />
            </div>
            <h3 class="text-xl font-semibold">No posts found</h3>
            <p class="text-muted-foreground max-w-md">
              This feed doesn't have any posts yet or is still loading. Try refreshing or coming
              back later.
            </p>
          </div>
        </div>
      {/each}

      {#if isLoading}
        <div class="flex flex-col items-center justify-center py-6" transition:fade>
          <div
            class="inline-block animate-spin h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary"
          ></div>
          <p class="text-sm text-muted-foreground mt-4 max-w-sm text-center">
            Chargement des posts en cours... L'attente est d'environ 7 secondes par mot-clé.
          </p>
        </div>
      {/if}

      {#if posts.length > 0 && !isLoading}
        <div class="text-center pt-4 pb-12">
          <Button
            variant="outline"
            on:click={fetchPosts}
            class="px-8 py-6 h-auto border-primary/20 hover:border-primary/40 rounded-full"
          >
            <span class="mr-2">Charger plus de posts</span>
            <svg
              class="w-5 h-5 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              ></path>
            </svg>
          </Button>
        </div>
      {/if}
    </div>
  </div>
</Layout>

<style>
  /* Styles applied globally */
  :global(.custom-scroll) {
    scrollbar-width: thin;
    scrollbar-color: rgba(192, 132, 252, 0.4) rgba(39, 39, 42, 0.2);
  }

  :global(.custom-scroll::-webkit-scrollbar) {
    width: 8px;
  }

  :global(.custom-scroll::-webkit-scrollbar-track) {
    background: rgba(39, 39, 42, 0.1);
  }

  :global(.custom-scroll::-webkit-scrollbar-thumb) {
    background-color: rgba(192, 132, 252, 0.4);
    border-radius: 4px;
  }

  /* Nouveaux styles pour les posts */
  :global(.card-hover) {
    transition: all 0.3s ease;
  }

  :global(.card-hover:hover) {
    transform: translateY(-2px);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  :global(.animate-pulse) {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
