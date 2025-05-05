<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'

  // Import components
  import FollowersChart from '@/components/FollowersChart.svelte'
  import PublicationCalendar from '@/components/PublicationCalendar.svelte'
  import PostsTable from '@/components/PostsTable.svelte'

  // Props and state variables
  export let followers_history: { date: string; count: number }[] = []
  export let posting_days: { date: string; count: number }[] = []
  export let all_posts: {
    text: string
    likes: number
    reposts: number
    replies: number
    date: string
    url: string
    engagement_rate: number
  }[] = []

  $: user = $page.props.user as User
  $: accounts = user?.account || []
  $: selectedAccount = accounts.length > 0 ? accounts[0].handle : null

  // Handle account change in the selector
  function handleAccountChange(handle: string) {
    selectedAccount = handle
    window.location.href = `/analytics/${handle}`
  }
</script>

<div class="flex min-h-screen bg-background">
  <Sidebar {user} />

  <main class="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 max-w-7xl mx-auto w-full">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold gradient-heading">Analytics</h1>
        <p class="text-muted-foreground mt-1">Insights and performance of your Bluesky accounts</p>
      </div>

      <!-- Account selector for multi-account users -->
      {#if accounts.length > 1}
        <div class="w-full md:w-auto">
          <select
            class="border border-gray-200 dark:border-gray-800 rounded-md px-3 py-2 bg-transparent"
            bind:value={selectedAccount}
            on:change={(e) => handleAccountChange(e.currentTarget.value)}
          >
            {#each accounts as account}
              <option value={account.handle}>@{account.handle}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <div class="space-y-6">
      <!-- Followers Growth Chart -->
      <FollowersChart {followers_history} />

      <!-- Publication Calendar -->
      <PublicationCalendar {posting_days} />

      <!-- Posts Table -->
      <PostsTable posts={all_posts} />
    </div>
  </main>
</div>

<style>
  :global(.gradient-heading) {
    background: linear-gradient(to right, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
