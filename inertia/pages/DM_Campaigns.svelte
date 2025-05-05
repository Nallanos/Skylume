<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shadcn-ui/card'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shadcn-ui/table'
  import { Button } from '@/shadcn-ui/button'
  import { Badge } from '@/shadcn-ui/badge'
  import {
    Plus,
    Activity,
    Mail,
    Trash,
    Loader,
    Lock,
    MessageSquare,
    RefreshCcw,
  } from 'lucide-svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'
  import type { DmCampaign } from '@/type'
  import { router } from '@inertiajs/svelte'
  import Layout from '@/components/Layout.svelte'

  export let campaigns: Array<DmCampaign>

  let user: User = $page.props.user
  let isToggling: number | null = null

  $: totalEngagement = campaigns.reduce((sum, l) => sum + l.numberOfMessageSent, 0)
  $: totalResponses = campaigns.reduce((sum, l) => sum + l.numberOfMessageReceived, 0)
  $: activeCampaigns = campaigns.filter((l) => l.status).length
  $: responseRate = totalEngagement > 0 ? Math.round((totalResponses / totalEngagement) * 100) : 0

  async function toggleCampaignStatus(campaign_id: number) {
    isToggling = campaign_id
    try {
      await router.post('/dm_campaign/start', { campaign_id })
      // Wait to allow the server to update
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.get('/DM_Campaigns')
    } finally {
      setTimeout(() => {
        isToggling = null
      }, 500)
    }
  }

  const deleteCampaign = async (campaign_id: number) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await router.put('/dm_campaign/delete', { campaign_id })
    }
  }
</script>

<Layout {user}>
  {#if user.plan === 'free'}
    <div
      class="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center"
    >
      <Card class="max-w-md w-full">
        <CardContent class="pt-6 px-6 pb-6 text-center flex flex-col items-center">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock class="h-8 w-8 text-primary" />
          </div>
          <h3 class="text-xl font-semibold mb-2">Premium Feature</h3>
          <p class="text-muted-foreground mb-6">
            DM campaigns are only available for premium users.
          </p>
          <Button
            on:click={async () => {
              const { sessionStripe } = await router.post('/create-stripe-session')
              if (sessionStripe) {
                window.location.href = sessionStripe
              } else {
                console.error('Error creating the session')
              }
            }}
            class="w-full"
          >
            Upgrade to Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  {/if}

  <!-- Header Section -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold gradient-heading">DM Campaigns</h1>
      <p class="text-muted-foreground mt-1">
        {campaigns.length} active campaign{campaigns.length !== 1 ? 's' : ''}
      </p>
    </div>
    {#if user.plan !== 'free'}
      <Button
        href="/add/campaign"
        size="sm"
        class="group shadow-sm hover:shadow-md transition-all rounded-md"
      >
        <Plus class="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
        New Campaign
      </Button>
    {:else}
      <Button
        href="/pricing"
        variant="default"
        size="sm"
        class="group shadow-sm hover:shadow-md transition-all rounded-md"
      >
        <Plus class="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
        Upgrade to Premium
      </Button>
    {/if}
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    <Card class="card-hover border-primary/10">
      <CardHeader class="pb-2 pt-4">
        <div class="flex justify-between items-start">
          <CardTitle class="text-sm font-medium">Messages Sent</CardTitle>
          <div class="dashboard-stat-icon">
            <MessageSquare class="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{totalEngagement}</div>
        <p class="text-xs text-muted-foreground mt-1">Last 30 days total</p>
      </CardContent>
    </Card>

    <Card class="card-hover border-primary/10">
      <CardHeader class="pb-2 pt-4">
        <div class="flex justify-between items-start">
          <CardTitle class="text-sm font-medium">Active Campaigns</CardTitle>
          <div class="dashboard-stat-icon">
            <Activity class="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{activeCampaigns}</div>
        <p class="text-xs text-muted-foreground mt-1">Currently running</p>
      </CardContent>
    </Card>

    <Card class="card-hover border-primary/10">
      <CardHeader class="pb-2 pt-4">
        <div class="flex justify-between items-start">
          <CardTitle class="text-sm font-medium">Response Rate</CardTitle>
          <div class="dashboard-stat-icon">
            <Mail class="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">
          {responseRate}%
          <span class="text-xs text-success ml-1">{totalResponses} responses</span>
        </div>
        <p class="text-xs text-muted-foreground mt-1">Overall performance</p>
      </CardContent>
    </Card>
  </div>

  <!-- Campaigns Table -->
  <Card>
    <CardHeader>
      <div class="flex justify-between items-center">
        <div>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>Manage your running DM campaigns</CardDescription>
        </div>
        <Button variant="ghost" size="sm" class="h-8 gap-1">
          <RefreshCcw class="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </CardHeader>
    <CardContent class="p-0">
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Account</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {#each campaigns as campaign}
              <TableRow>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <div
                      class={`h-2 w-2 rounded-full ${campaign.status ? 'bg-success' : 'bg-destructive'}`}
                    />
                    <Badge
                      variant={campaign.status ? 'outline' : 'secondary'}
                      class="bg-transparent border-primary/20 text-xs"
                    >
                      {campaign.status ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell class="font-medium truncate max-w-[150px]">
                  {campaign.name}
                </TableCell>
                <TableCell class="capitalize text-sm">
                  {campaign.strategy.replaceAll('-', ' ')}
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    {#each JSON.parse(campaign.keywords) as keyword}
                      <Badge
                        variant="outline"
                        class="text-xs px-2 py-0.5 bg-primary/5 border-primary/10"
                      >
                        {keyword}
                      </Badge>
                    {/each}
                  </div>
                </TableCell>
                <TableCell class="truncate max-w-[100px] text-sm">
                  {campaign.accountHandle}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant={campaign.status ? 'destructive' : 'default'}
                      class="h-8 text-xs px-3"
                      disabled={isToggling === campaign.id}
                      on:click={() => toggleCampaignStatus(campaign.id)}
                    >
                      {#if isToggling === campaign.id}
                        <Loader class="h-3 w-3 mr-1 animate-spin" />
                      {/if}
                      {campaign.status ? 'Pause' : 'Start'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      on:click={() => deleteCampaign(campaign.id)}
                    >
                      <Trash class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            {:else}
              <TableRow>
                <TableCell class="text-center h-24 text-muted-foreground">
                  No campaigns found
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</Layout>
