<script lang="ts">
  import { router, page } from '@inertiajs/svelte'
  import { Card, CardHeader, CardTitle } from '@/shadcn-ui/card'
  import Button from '@/shadcn-ui/button/button.svelte'
  import { Plus, Loader } from 'lucide-svelte'
  import * as Select from '@/shadcn-ui/select'
  import Textarea from '@/shadcn-ui/textarea/textarea.svelte'
  import Layout from '@/components/Layout.svelte'
  import type Feed from '#models/feed'
  import { Trash2 } from 'lucide-svelte'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
  } from '@/shadcn-ui/dialog'

  export let feeds: Feed[] | undefined = undefined
  let selectedAccount: string = ''
  let keywords: string = ''
  let isLoading = false
  let accounts = $page.props.user?.account || []
  let deleteDialogStates: Record<string, boolean> = {}
  $: showCreateFeed = false

  async function createFeed() {
    if (!selectedAccount || !keywords) return

    isLoading = true
    await router.post('/feed/create', {
      account_id: selectedAccount,
      keywords,
    })
    isLoading = false
    showCreateFeed = false
  }

  function handleSelect(type: string, value: string) {
    if (type === 'account') selectedAccount = value
  }
</script>

<Layout user={$page.props.user}>
  <div class="max-w-4xl mx-auto">
    {#if feeds?.length === 0 || showCreateFeed}
      <!-- Contenu pour créer un nouveau feed -->
      <header class="mb-12 text-center">
        <h3 class="text-3xl font-bold mb-4">Create Intelligent Feed</h3>
        <p class="text-secondary-content leading-relaxed">
          Monitor relevant content through our advanced semantic analysis technology
        </p>
      </header>

      <div class="rounded-xl shadow-sm p-6 card">
        <h4 class="text-lg font-semibold mb-6">Feed Configuration</h4>
        <form on:submit|preventDefault={createFeed} class="space-y-6">
          <!-- Le reste du formulaire reste inchangé -->
          <div class="space-y-2">
            <p class="block text-sm font-medium text-primary-content">Account to monitor</p>
            <Select.Root portal={null}>
              <Select.Trigger
                class="w-full px-3 py-2 border border-gray-800 rounded-lg hover:border-gray-400"
              >
                <Select.Value placeholder="Select an account" />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Your accounts</Select.Label>
                  {#each accounts as account}
                    <Select.Item
                      value={account.id}
                      on:click={() => handleSelect('account', account.id)}
                    >
                      @{account.handle}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
              <Select.Input name="account" required />
            </Select.Root>
          </div>

          <div class="space-y-2">
            <label for="keywords" class="block text-sm font-medium text-primary-content"
              >Keywords</label
            >
            <Textarea
              bind:value={keywords}
              id="keywords"
              required
              class="w-full px-3 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: digital marketing, growth hacking, AI..."
            />
            <p class="text-xs text-subtle mt-1">
              Separate keywords with commas. Use boolean operators for precision.
            </p>
          </div>

          {#if $page.props.errors}
            <div class="bg-red-900/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              <strong>Error:</strong>
              {$page.props.errors[0]}
            </div>
          {/if}

          <Button type="submit" disabled={isLoading} class="w-full">
            {#if isLoading}
              <Loader class="h-4 w-4 mr-2 animate-spin" />
            {:else}
              <Plus class="h-4 w-4 mr-2" />
            {/if}
            {isLoading ? 'Creating...' : 'Create Feed'}
          </Button>
        </form>
      </div>
    {:else if feeds}
      <!-- Contenu pour afficher les feeds existants -->
      <div class="space-y-8">
        <div class="mb-12 text-center">
          <h1 class="text-2xl font-bold">Your Current Feeds</h1>
          <p class="text-secondary-content text-md">
            Monitor relevant content through our advanced semantic analysis technology
          </p>
          <div class="py-4">
            <Button on:click={() => (showCreateFeed = !showCreateFeed)} class="group">
              <Plus class="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
              Add New Feed
            </Button>
          </div>
        </div>

        {#each feeds as feed (feed.id)}
          <div class="group relative">
            <a href={`/feed/${feed.id}`} class="block">
              <Card class="hover:border-primary/30 hover:shadow-md transition-all">
                <CardHeader class="flex flex-row items-center space-x-4 py-6">
                  <div>
                    <CardTitle class="text-xl">Feed: {feed.id}</CardTitle>
                    <p class="text-sm text-secondary-content">
                      <span class="font-medium">Keywords:</span>
                      {Object.keys(feed.keywordsCursor).join(', ')}
                    </p>
                    <p class="text-subtle pt-4">Account Handle: {feed.accountHandle}</p>
                  </div>
                </CardHeader>
              </Card>
            </a>

            <Dialog bind:open={deleteDialogStates[feed.id]}>
              <DialogTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this feed? This action is irreversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <form method="POST" action="/feed/delete" class="w-full flex gap-2 justify-end">
                    <input type="hidden" name="feed_id" value={feed.id} />
                    <Button
                      variant="outline"
                      type="button"
                      on:click={() => (deleteDialogStates[feed.id] = false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" type="submit">Delete</Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Layout>
