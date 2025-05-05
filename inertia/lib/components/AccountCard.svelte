<script lang="ts">
  import { Button } from '@/shadcn-ui/button'
  import { Trash2, AtSign, BarChart3, Calendar, Shield, RefreshCw } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import type Account from '#models/account'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
  } from '@/shadcn-ui/dialog'
  import { Card, CardContent, CardFooter } from '@/shadcn-ui/card'
  import { Badge } from '@/shadcn-ui/badge'

  export let account: Account
  const id = account.id

  let showDeleteDialog = false
  let isRefreshing = false

  // Formatage des métriques
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num
  }

  async function handleDelete() {
    await router.post('/dashboard/accounts/delete', { id: id })
  }

  async function refreshStats() {
    isRefreshing = true
    try {
      await router.get(`/account/${id}/refresh-stats`)
    } catch (error) {
      console.error('Error refreshing stats:', error)
    } finally {
      // isRefreshing sera réinitialisé lorsque la page sera rechargée
    }
  }
</script>

<Card
  class="card-hover border-border overflow-hidden relative group bg-card dark:bg-card dark:border-gray-800/80"
>
  <CardContent class="pt-6 pb-2">
    <!-- Section avatar et nom du compte -->
    <div class="flex items-center gap-3 mb-5">
      <div
        class="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20"
      >
        <AtSign class="h-5 w-5 text-blue-500" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="font-semibold truncate text-lg">{account.handle}</h3>
        <div class="mt-1 flex items-center gap-2">
          {#if account.isRateLimited}
            <Badge variant="destructive" class="text-xs px-2 py-0.5">
              <Shield class="h-3 w-3 mr-1" />
              Rate limited
            </Badge>
          {:else}
            <Badge variant="outline" class="text-xs bg-blue-500/5 border-blue-500/20 text-blue-500">
              <Shield class="h-3 w-3 mr-1" />
              Active
            </Badge>
          {/if}
        </div>
      </div>
      <div>
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-8 rounded-full"
          aria-label="Refresh statistics"
          disabled={isRefreshing}
          on:click={refreshStats}
        >
          <div class:animate-spin={isRefreshing}>
            <RefreshCw class="h-4 w-4" />
          </div>
        </Button>
      </div>
    </div>

    {#if account.isRateLimited}
      <p class="text-xs text-destructive mb-4 px-1">
        Rate limited, our application can no longer interact with your Bluesky account. For more
        information, check
        <a
          href="https://docs.bsky.app/docs/advanced-guides/rate-limits"
          target="_blank"
          rel="noopener"
          class="underline"
        >
          the documentation
        </a>.
      </p>
    {/if}

    <!-- Section statistiques -->
    <div
      class="grid grid-cols-3 divide-x divide-border bg-background/30 rounded-md overflow-hidden mb-2"
    >
      <div class="flex flex-col items-center py-3">
        <span class="text-xs text-muted-foreground">Followers</span>
        <span class="font-semibold text-base mt-0.5"
          >{formatNumber(account.followersCount || 0)}</span
        >
      </div>
      <div class="flex flex-col items-center py-3">
        <span class="text-xs text-muted-foreground">Posts</span>
        <span class="font-semibold text-base mt-0.5">{formatNumber(account.postsCount || 0)}</span>
      </div>
      <div class="flex flex-col items-center py-3">
        <span class="text-xs text-muted-foreground">Engagement</span>
        <span class="font-semibold text-base mt-0.5">{account.engagementRate || '0%'}</span>
      </div>
    </div>
  </CardContent>

  <!-- Section boutons -->
  <CardFooter class="pt-3 pb-4 flex justify-between items-center border-t border-border/20">
    <div class="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        class="h-8 px-3 border-blue-500/20 text-blue-600 hover:bg-blue-500/5 hover:text-blue-700 hover:border-blue-500/30"
        href={`/analytics/${account.id}/`}
      >
        <BarChart3 class="h-3.5 w-3.5 mr-1.5" />
        Stats
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8 px-3 border-blue-500/20 text-blue-600 hover:bg-blue-500/5 hover:text-blue-700 hover:border-blue-500/30"
        href="/add/schedule?account_id={account.id}"
      >
        <Calendar class="h-3.5 w-3.5 mr-1.5" />
        Schedule
      </Button>
    </div>

    <Dialog bind:open={showDeleteDialog}>
      <DialogTrigger>
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the @{account.handle} account? This action is irreversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" on:click={() => (showDeleteDialog = false)}>Cancel</Button>
          <Button variant="destructive" on:click={handleDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardFooter>
</Card>
