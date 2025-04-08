<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page, router } from '@inertiajs/svelte'
  import { RefreshCcw, MessageSquare, Send, Mail, BarChart } from 'lucide-svelte'
  import type User from '#models/user'
  import type { Listener } from '@/type'

  const user = $page.props.user as User
  $: bot = $page.props.bot as Listener
  $: responseRate =
    bot.numberOfMessageSent > 0
      ? ((bot.numberOfMessageReceived / bot.numberOfMessageSent) * 100).toFixed(2)
      : '0.00'
  $: isLoading = false

  async function handleRefresh() {
    isLoading = true
    try {
      await router.post('/bot/refresh', { listenerId: bot.id })
    } finally {
      isLoading = false
    }
  }
</script>

<div class="flex min-h-screen bg-gray-900 text-gray-100">
  <div class="h-screen">
    <Sidebar {user} />
  </div>

  {#if bot.action === 'Send a Message'}
    <main class="flex-1 p-8 space-y-8 animate-fade-in">
      <!-- Header Section -->
      <div class="flex items-center justify-between">
        <div>
          <h1
            class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Bot Performance
          </h1>
          <div class="flex items-center mt-2 space-x-2 text-gray-400">
            <span class="font-mono bg-gray-800 px-2 py-1 rounded">ID: {bot.id}</span>
          </div>
        </div>
        <button
          on:click={handleRefresh}
          class="p-2 hover:bg-gray-800 rounded-full transition-colors relative"
          class:animate-spin={isLoading}
        >
          <RefreshCcw class="w-6 h-6 {isLoading ? 'text-blue-400' : 'text-gray-400'}" />
        </button>
      </div>

      <!-- Message Preview Card -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center mb-4 space-x-3">
          <MessageSquare class="w-6 h-6 text-blue-400" />
          <h2 class="text-xl font-semibold">Active Message</h2>
        </div>
        <div class="flex justify-end">
          <div
            class="max-w-[75%] bg-blue-500/20 p-4 rounded-xl rounded-br-none border border-blue-400/30"
          >
            <p class="text-blue-100">{bot.message}</p>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid gap-6 md:grid-cols-3">
        <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div class="flex items-center space-x-3 mb-4">
            <Send class="w-6 h-6 text-green-400" />
            <h3 class="font-medium">Messages Sent</h3>
          </div>
          <div class="text-3xl font-bold">{bot.numberOfMessageSent}</div>
        </div>

        <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div class="flex items-center space-x-3 mb-4">
            <Mail class="w-6 h-6 text-purple-400" />
            <h3 class="font-medium">Responses Received</h3>
          </div>
          <div class="text-3xl font-bold">{bot.numberOfMessageReceived}</div>
        </div>

        <div class="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div class="flex items-center space-x-3 mb-4">
            <BarChart class="w-6 h-6 text-yellow-400" />
            <h3 class="font-medium">Response Rate</h3>
          </div>
          <div
            class="text-3xl font-bold {parseFloat(responseRate) > 50
              ? 'text-green-400'
              : 'text-red-400'}"
          >
            {responseRate}%
          </div>
        </div>
      </div>
    </main>
  {:else}
    <div class="flex items-center justify-center flex-1 text-gray-400">
      <div class="p-8 text-center">
        <div class="mb-4 text-2xl">🚫</div>
        <p>No active message configuration found</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
