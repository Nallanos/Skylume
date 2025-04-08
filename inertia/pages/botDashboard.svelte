<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import Button from '@/ui/button/button.svelte'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table'
  import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
  import { Input } from '@/ui/input'
  import { Switch } from '@/ui/switch'
  import {
    Trash,
    Pencil,
    Plus,
    Check,
    X,
    MessageSquareText,
    Server,
    Activity,
    Lock,
    ChevronRight,
  } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import type User from '#models/user'
  import type Account from '#models/account'
  import type { Listener } from '@/type'
  import { onMount } from 'svelte'
  export let account: Account | undefined

  onMount(async () => {
    for (const listener of listeners) {
      console.log(listener.numberOfMessageReceived)
      await router.post('/bot/refresh', { listenerId: listener.id })
    }
  })

  let user: User = $page.props.user
  $: isFreeLimitReached = user.plan === 'free' && user.isDmsLimitReached

  let editingListenerId: string | null = null
  let newMessage = ''
  let isProcessing = false

  if (!account) {
    throw new Error('Account not found')
  }

  $: listeners = account.listeners as unknown as Listener[]
  $: totalEngagement = listeners.reduce(
    (sum, l) => sum + l.numberOfMessageSent + l.numberOfMessageReceived,
    0
  )
  $: totalResponses = listeners.reduce((sum, l) => sum + l.numberOfMessageReceived, 0)
  $: activeListeners = listeners.filter((l) => l.isActive).length

  // Gestion des états
  async function toggleListener(listener: Listener) {
    try {
      isProcessing = true
      await router.post(`/bot/toggle`, {
        listener_id: listener.id,
      })
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      isProcessing = false
    }
  }

  async function saveMessage(listener: Listener) {
    if (!newMessage.trim()) return
    try {
      await router.put(`/bot/update`, { listenerId: listener.id, message: newMessage })
      listener.message = newMessage
      editingListenerId = null
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  function startEditing(listener: Listener) {
    editingListenerId = listener.id
    newMessage = listener.message
  }

  function deleteListener(listener_id: string) {
    router.post('/bot/remove', { listener_id: listener_id })
  }
</script>

<main class="flex md:flex-row min-h-screen">
  <div class="h-screen">
    <Sidebar {user} />
  </div>

  <div class="flex flex-col w-full flex-2 overflow-hidden px-4 pt-6">
    {#if isFreeLimitReached}
      <div
        class="mb-6 border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4 flex items-start gap-4"
      >
        <Lock class="h-5 w-5 mt-0.5 text-yellow-300" />
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-yellow-200 mb-1">DMS Limit Reached</h3>
          <p class="text-sm text-yellow-300/90 leading-relaxed">
            Free plan is limited to 30 auto sent DMS. <br class="hidden sm:block" />
            <button
              on:click={async () => {
                await router.post('/create-stripe-session')
              }}
              class="inline-flex items-center underline hover:text-yellow-200 transition-colors"
            >
              Upgrade to Pro
              <ChevronRight class="h-4 w-4 ml-1" />
            </button>
          </p>
        </div>
      </div>
    {/if}
    <!-- En-tête -->
    <header class="flex gap-4 p-4 md:py-6">
      <div class="flex flex-col md:flex-row py-6 w-full">
        <div class="space-y-1 text-left">
          <h1 class="text-3xl font-bold">Bot Dashboard</h1>
          <p class="text-sm text-gray-400">
            Managing automation for <span class="font-semibold text-blue-300"
              >@{account.handle}</span
            >
          </p>
        </div>
        <Button
          href="/bot"
          class="group hover:scale-[1.02] transition-transform mt-4 ml-auto w-full md:w-auto"
        >
          <Plus class="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
          Add New Bot
        </Button>
      </div>
    </header>

    <!-- Cartes de résumé sous forme de grille (responsive : 1 colonne sur mobile, 3 colonnes sur md et plus) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-8 py-6 animate-fade-in-up">
      <Card
        class="hover:border-blue-400 transition-all duration-300 w-full group relative overflow-hidden mb-4"
      >
        <div
          class="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-2xl transition-colors"
        />

        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-gray-300">
            Total Engagment (Follows + messages)
            <span class="text-blue-400 text-xs ml-1">(+24h)</span>
          </CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg">
            <Activity class="h-5 w-5 text-white" />
          </div>
        </CardHeader>

        <CardContent>
          <div class="text-3xl font-bold text-blue-400 flex items-center gap-2">
            {totalEngagement}
          </div>
          <p class="text-sm text-gray-400 mt-1">Engagement this month</p>

          <div
            class="absolute bottom-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" class="fill-current text-blue-400">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      <!-- Active Listeners Card -->
      <Card
        class="hover:border-green-400 transition-all duration-300 w-full group relative overflow-hidden mb-4"
      >
        <div
          class="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-2xl transition-colors"
        />

        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-gray-300">
            Active Listeners
            <span class="text-green-400 text-xs ml-1">Live</span>
          </CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-green-600 to-green-400 rounded-lg">
            <div class="relative h-5 w-5">
              <div class="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
              <Server class="h-5 w-5 text-white relative" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div class="text-3xl font-bold text-green-400 flex items-center gap-2">
            {activeListeners}
          </div>
          <p class="text-sm text-gray-400 mt-1">Real-time monitoring</p>

          <div
            class="absolute bottom-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" class="fill-current text-green-400">
              <path
                d="M7 13C9.21 13 11 14.79 11 17C11 19.21 9.21 21 7 21C4.79 21 3 19.21 3 17C3 14.79 4.79 13 7 13ZM7 15C5.9 15 5 15.9 5 17C5 18.1 5.9 19 7 19C8.1 19 9 18.1 9 17C9 15.9 8.1 15 7 15ZM11 3C13.21 3 15 4.79 15 7C15 9.21 13.21 11 11 11C8.79 11 7 9.21 7 7C7 4.79 8.79 3 11 3ZM13 7C13 5.9 12.1 5 11 5C9.9 5 9 5.9 9 7C9 8.1 9.9 9 11 9C12.1 9 13 8.1 13 7ZM16.5 11C18.43 11 20 12.57 20 14.5C20 16.43 18.43 18 16.5 18C14.57 18 13 16.43 13 14.5C13 12.57 14.57 11 16.5 11Z"
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      <!-- Total Responses Card -->
      <Card
        class="hover:border-purple-400 transition-all duration-300 w-full group relative overflow-hidden mb-4"
      >
        <div
          class="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-2xl transition-colors"
        />

        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-gray-300">
            Replies to your auto-sent messages
            <span class="text-purple-400 text-xs ml-1">(+24h)</span>
          </CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-purple-600 to-purple-400 rounded-lg">
            <MessageSquareText class="h-5 w-5 text-white" />
          </div>
        </CardHeader>

        <CardContent>
          <div class="text-3xl font-bold text-purple-400 flex items-center gap-2">
            {totalResponses}
          </div>
          <div
            class="absolute bottom-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" class="fill-current text-purple-400">
              <path
                d="M3 4H5V20H3V4ZM7 4H9V20H7V4ZM11 4H13V20H11V4ZM15 4H17V20H15V4ZM19 4H21V20H19V4Z"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Tableau avec défilement horizontal sur mobile -->
    <div class="px-4 md:px-8 pb-4 md:pb-8">
      <!-- Vue desktop : Tableau classique -->
      <div class="hidden md:block overflow-x-auto">
        <Table
          class="relative border border-gray-700 rounded-lg overflow-hidden min-w-[800px] md:min-w-full"
        >
          <TableHeader class="sticky top-0 z-20">
            <TableRow class="hover:bg-transparent">
              <TableHead class="text-gray-300">Bot name</TableHead>
              <TableHead class="text-gray-300">Trigger Event</TableHead>
              <TableHead class="text-gray-300">Message Sent / Listener Action</TableHead>
              <TableHead class="text-gray-300">Status</TableHead>
              <TableHead class="text-gray-300 hidden md:table-cell">Response rate</TableHead>
              <TableHead class="text-gray-300 text-right">
                Actions
                <div
                  class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-800 border-b border-r border-gray-700 transform rotate-45"
                />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody class="divide-y divide-gray-700">
            {#each listeners as listener (listener.id)}
              <TableRow
                class="transition-all hover:bg-gray-800/50 {listener.isActive
                  ? 'opacity-100'
                  : 'opacity-70 hover:opacity-90'}"
              >
                <TableCell class="font-medium text-gray-100 px-2 md:px-4 py-3 text-sm">
                  <div class="flex items-center space-x-3">
                    <div
                      class={`h-2 w-2 rounded-full ${listener.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
                    />
                    <span>Bot {listener.id}</span>
                  </div>
                </TableCell>

                <TableCell class="text-gray-300 capitalize px-2 md:px-4 py-3 text-sm">
                  {listener.event.replace(/_/g, ' ')}
                </TableCell>

                <TableCell class="max-w-[300px] px-2 md:px-4 py-3 text-sm">
                  {#if listener.action === 'Send a Message'}
                    {#if editingListenerId === listener.id}
                      <div class="flex gap-2 items-center animate-fade-in">
                        <Input
                          bind:value={newMessage}
                          class="flex-1 bg-gray-700 border-gray-600 text-gray-100"
                          placeholder="Enter response message..."
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          on:click={() => saveMessage(listener)}
                          class="text-green-400 hover:bg-green-400/10"
                        >
                          <Check class="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          on:click={() => (editingListenerId = null)}
                          class="text-red-400 hover:bg-red-400/10"
                        >
                          <X class="h-4 w-4" />
                        </Button>
                      </div>
                    {:else}
                      <button
                        type="button"
                        class="truncate text-gray-300 cursor-text hover:bg-gray-700/20 rounded px-2 py-1 transition-colors relative group"
                        on:click={() => startEditing(listener)}
                        on:keydown={(e) => e.key === 'Enter' && startEditing(listener)}
                        aria-label="Edit message"
                      >
                        <span class="truncate">
                          {listener.message?.length > 50
                            ? `${listener.message.slice(0, 50)}...`
                            : listener.message || 'No message set'}
                        </span>
                        {#if listener.message?.length > 50}
                          <span
                            class="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-sm p-1 rounded max-w-xs"
                          >
                            {listener.message}
                          </span>
                        {/if}
                      </button>
                    {/if}
                  {:else}
                    {listener.action}
                  {/if}
                </TableCell>

                <TableCell class="px-2 md:px-4 py-3 text-sm">
                  <Switch
                    checked={listener.isActive}
                    on:click={() => toggleListener(listener)}
                    disabled={isProcessing}
                    class={`${listener.isActive ? 'bg-green-400' : 'bg-red-400'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </TableCell>
                <TableCell class="text-gray-300 px-2 md:px-4 py-3 text-sm">
                  {#if listener.action === 'Send a Message'}
                    {#if listener.numberOfMessageReceived > 0 && listener.numberOfMessageSent > 0}
                      <span>
                        {(
                          (listener.numberOfMessageReceived / listener.numberOfMessageSent) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    {:else}
                      <span class="text-gray-400">0%</span>
                    {/if}
                  {:else}
                    N/A
                  {/if}
                </TableCell>

                <TableCell
                  class="h-24 px-2 md:px-4 py-3 text-  import {page}
sm"
                >
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => startEditing(listener)}
                      class="text-blue-400 hover:bg-blue-400/10"
                    >
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      on:click={() => deleteListener(listener.id)}
                      class="text-red-400 hover:bg-red-400/10"
                    >
                      <Trash class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      <!-- Vue mobile : Affichage en cartes -->
      <div class="block md:hidden space-y-4">
        {#each listeners as listener (listener.id)}
          <div class="border border-gray-800 rounded-lg p-4">
            <!-- En-tête de la carte -->
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <div
                  class={`h-2 w-2 rounded-full ${listener.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
                ></div>
                <span class="font-medium text-gray-100">Bot {listener.id}</span>
              </div>
              <Switch
                checked={listener.isActive}
                on:click={() => toggleListener(listener)}
                disabled={isProcessing}
                class={`${listener.isActive ? 'bg-green-400' : 'bg-red-400'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <!-- Détails -->
            <div class="mt-2 space-y-1">
              <p>
                <strong>Trigger Event: </strong>
                {listener.event.replace(/_/g, ' ')}
              </p>

              <p class="line-clamp-2">
                <strong>Action: </strong>
                {#if listener.action === 'Send a Message'}
                  {#if editingListenerId === listener.id}
                    <div class="flex gap-2 items-center mt-1">
                      <Input
                        bind:value={newMessage}
                        class="flex-1 border-gray-800"
                        placeholder="Enter response message..."
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        on:click={() => saveMessage(listener)}
                        class="text-green-400 hover:bg-green-400/10"
                      >
                        <Check class="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        on:click={() => (editingListenerId = null)}
                        class="text-red-400 hover:bg-red-400/10"
                      >
                        <X class="h-4 w-4" />
                      </Button>
                    </div>
                  {:else}
                    <button
                      type="button"
                      class="truncate text-gray-300 cursor-text hover:bg-gray-700/20 rounded px-2 py-1 transition-colors"
                      on:click={() => startEditing(listener)}
                      on:keydown={(e) => e.key === 'Enter' && startEditing(listener)}
                      aria-label="Edit message"
                    >
                      {listener.message?.length > 50
                        ? `${listener.message.slice(0, 50)}...`
                        : listener.message || 'No message set'}
                    </button>
                  {/if}
                {:else}
                  {listener.action}
                {/if}
              </p>

              <p class="text-gray-300">
                <strong>Response Rate: </strong>
                {#if listener.action === 'Send a Message'}
                  {#if listener.numberOfMessageReceived > 0 && listener.numberOfMessageSent > 0}
                    {(
                      (listener.numberOfMessageReceived / listener.numberOfMessageSent) *
                      100
                    ).toFixed(1)}
                    %
                  {:else}
                    <span class="text-gray-400">0%</span>
                  {/if}
                {:else}
                  N/A
                {/if}
              </p>
            </div>

            <!-- Actions -->
            <div class="mt-2 flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                on:click={() => startEditing(listener)}
                class="text-blue-400 hover:bg-blue-400/10"
              >
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                on:click={() => deleteListener(listener.id)}
                class="text-red-400 hover:bg-red-400/10"
              >
                <Trash class="h-4 w-4" />
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</main>

<style global>
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }
</style>
