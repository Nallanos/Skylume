<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'
  import type Account from '#models/account'

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
  export let account: Account

  $: user = $page.props.user as User
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

      <div class="flex space-x-3 items-center">
        <!-- Lien vers l'analyse d'audience avancée -->
        <a
          href="/analytics/{account.id}/audience"
          class="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Analyse d'audience avancée
        </a>
      </div>
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
