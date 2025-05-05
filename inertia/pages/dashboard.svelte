<script lang="ts">
  import AddAccount from '@/components/AddAccount.svelte'
  import AccountCard from '@/components/AccountCard.svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import { Plus, Users, BarChart2, Calendar, MessageSquare } from 'lucide-svelte'
  import type Account from '#models/account'
  import type User from '#models/user'
  import Button from '@/shadcn-ui/button/button.svelte'
  import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shadcn-ui/card'

  export let accounts: Account[]
  $: user = $page.props.user as User
</script>

<div class="flex min-h-screen bg-background">
  <Sidebar {user} />

  <main class="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 max-w-7xl mx-auto w-full">
    {#if accounts.length === 0}
      <div class="animate-fade-in-up">
        <AddAccount />
      </div>
    {:else}
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold gradient-heading">Dashboard</h1>
          <p class="text-muted-foreground mt-1">
            {accounts.length} connected Bluesky account{accounts.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          href="/add/account"
          size="sm"
          variant="default"
          class="group shadow-sm hover:shadow-md transition-all rounded-md bg-blue-500 hover:bg-blue-600 !text-white font-medium"
        >
          <Plus class="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
          Add Account
        </Button>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card class="card-hover border-primary/10">
          <CardHeader class="pb-2 pt-4">
            <div class="flex justify-between items-start">
              <CardTitle class="text-sm font-medium">Connected Accounts</CardTitle>
              <div class="dashboard-stat-icon">
                <Users class="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{accounts.length}</div>
            <p class="text-xs text-muted-foreground mt-1">Active Bluesky accounts</p>
          </CardContent>
        </Card>

        <Card class="card-hover border-primary/10">
          <CardHeader class="pb-2 pt-4">
            <div class="flex justify-between items-start">
              <CardTitle class="text-sm font-medium">Scheduled Posts</CardTitle>
              <div class="dashboard-stat-icon">
                <Calendar class="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{user.scheduledCount || 0}</div>
            <p class="text-xs text-muted-foreground mt-1">Pending publications</p>
          </CardContent>
        </Card>

        <Card class="card-hover border-primary/10">
          <CardHeader class="pb-2 pt-4">
            <div class="flex justify-between items-start">
              <CardTitle class="text-sm font-medium">Performance</CardTitle>
              <div class="dashboard-stat-icon">
                <BarChart2 class="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {user.followersCount || 0}
              <span class="text-xs text-success ml-1">+{user.followersGrowth || 0}</span>
            </div>
            <p class="text-xs text-muted-foreground mt-1">Total followers</p>
          </CardContent>
        </Card>
      </div>

      <!-- Accounts Grid -->
      <div>
        <h2 class="text-lg font-medium mb-4">Your Accounts</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {#each accounts as account}
            <AccountCard {account} />
          {/each}
        </div>
      </div>

      <!-- Quick Actions -->
      {#if accounts.length > 0}
        <div class="mt-8">
          <h2 class="text-lg font-medium mb-4">Quick Actions</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card class="card-hover hover:border-primary cursor-pointer">
              <CardContent class="pt-6">
                <div class="flex flex-col items-center text-center p-2">
                  <div
                    class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                  >
                    <Calendar class="h-6 w-6 text-primary" />
                  </div>
                  <h3 class="font-medium mb-1">Schedule a Post</h3>
                  <p class="text-sm text-muted-foreground">Plan your content in advance</p>
                </div>
              </CardContent>
              <CardFooter class="pt-0 pb-4">
                <Button href="/add/schedule" variant="outline" class="w-full">Schedule</Button>
              </CardFooter>
            </Card>

            <Card class="card-hover hover:border-primary cursor-pointer">
              <CardContent class="pt-6">
                <div class="flex flex-col items-center text-center p-2">
                  <div
                    class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                  >
                    <MessageSquare class="h-6 w-6 text-primary" />
                  </div>
                  <h3 class="font-medium mb-1">DM Campaign</h3>
                  <p class="text-sm text-muted-foreground">Create direct message campaigns</p>
                </div>
              </CardContent>
              <CardFooter class="pt-0 pb-4">
                <Button href="/add/campaign" variant="outline" class="w-full">Create</Button>
              </CardFooter>
            </Card>

            <Card class="card-hover hover:border-primary cursor-pointer">
              <CardContent class="pt-6">
                <div class="flex flex-col items-center text-center p-2">
                  <div
                    class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                  >
                    <Users class="h-6 w-6 text-primary" />
                  </div>
                  <h3 class="font-medium mb-1">Manage Feeds</h3>
                  <p class="text-sm text-muted-foreground">Monitor relevant content</p>
                </div>
              </CardContent>
              <CardFooter class="pt-0 pb-4">
                <Button href="/feed" variant="outline" class="w-full">Manage</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      {/if}
    {/if}
  </main>
</div>
