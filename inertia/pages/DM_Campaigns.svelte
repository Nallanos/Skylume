<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table'
  import { Button } from '@/ui/button'
  import { Badge } from '@/ui/badge'
  import { Plus, Activity, Mail, Sliders, Trash, Loader } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'
  import type { DmCampaign } from '@/type'
  import type Account from '#models/account'
  import { router } from '@inertiajs/svelte'

  export let campaigns: Array<DmCampaign>

  let user: User = $page.props.user
  let accounts = user.account as unknown as Account[]
  $: totalEngagement = campaigns.reduce((sum, l) => sum + l.numberOfMessageSent, 0)
  $: totalResponses = campaigns.reduce((sum, l) => sum + l.numberOfMessageReceived, 0)
  $: activeListeners = campaigns.filter((l) => l.status).length

  async function toggleCampaignStatus(campaign_id: number) {
    router.post('/dm_campaign/start', { campaign_id })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    router.get('/DM_Campaigns')
  }

  const deleteCampaign = async (campaign_id: number) => {
    await router.put('/dm_campaign/delete', { campaign_id })
  }
</script>

<div class="flex min-h-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>

  <main class="flex-1 p-8 relative pt-20">
    <div class="mb-8 space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-100">Campaigns Dashboard</h1>
          <p class="text-gray-400">
            {campaigns.length} active campaign{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button href="/add/campaign" class="group hover:scale-[1.02] transition-transform">
          <Plus class="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
          New Campaign
        </Button>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        <Card
          class="hover:border-blue-400 transition-all duration-300 w-full group relative overflow-hidden border-gray-800"
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-2xl transition-colors"
          />

          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Total Engagement
              <span class="text-blue-400 text-xs ml-1">(+24h)</span>
            </CardTitle>
            <div class="relative p-2 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg">
              <Activity class="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold text-blue-400">{totalEngagement}</div>
            <p class="text-sm text-gray-400 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card
          class="hover:border-green-400 transition-all duration-300 w-full group relative overflow-hidden border-gray-800"
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-2xl transition-colors"
          />

          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Active Now
              <span class="text-green-400 text-xs ml-1">Live</span>
            </CardTitle>
            <div class="relative p-2 bg-gradient-to-br from-green-600 to-green-400 rounded-lg">
              <div class="relative h-5 w-5">
                <div class="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                <Mail class="h-5 w-5 text-white relative" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold text-green-400">
              {activeListeners}
            </div>
            <p class="text-sm text-gray-400 mt-1">Real-time monitoring</p>
          </CardContent>
        </Card>

        <Card
          class="hover:border-purple-400 transition-all duration-300 w-full group relative overflow-hidden border-gray-800"
        >
          <div
            class="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-2xl transition-colors"
          />

          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Messages Received
              <span class="text-purple-400 text-xs ml-1">(+24h)</span>
            </CardTitle>
            <div class="relative p-2 bg-gradient-to-br from-purple-600 to-purple-400 rounded-lg">
              <Sliders class="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold text-purple-400">{totalResponses}</div>
            <p class="text-sm text-gray-400 mt-1">All campaigns</p>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Liste des campagnes -->
    <Card class="border-gray-800">
      <CardHeader>
        <CardTitle class="text-gray-100">Active Campaigns</CardTitle>
        <CardDescription class="text-gray-400">Manage your running DM campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <Table class="border border-gray-700 rounded-lg overflow-hidden">
          <TableHeader class="sticky top-0 z-20 bg-gray-900">
            <TableRow class="hover:bg-transparent">
              <TableHead class="text-gray-300">Status</TableHead>
              <TableHead class="text-gray-300">Campaign</TableHead>
              <TableHead class="text-gray-300">Strategy</TableHead>
              <TableHead class="text-gray-300">Keywords</TableHead>
              <TableHead class="text-gray-300">Account</TableHead>
              <TableHead class="text-gray-300 text-right">
                Actions
                <div
                  class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-800 border-b border-r border-gray-700 transform rotate-45"
                />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody class="divide-y divide-gray-700">
            {#each campaigns as campaign}
              <TableRow class="hover:bg-gray-800/50 transition-colors">
                <TableCell>
                  <div class="flex items-center space-x-2">
                    <div
                      class={`h-2 w-2 rounded-full ${campaign.status ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
                    />
                    <Badge
                      variant={campaign.status ? 'default' : 'secondary'}
                      class="border border-gray-800"
                    >
                      {campaign.status ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell class="font-medium text-gray-100">{campaign.name}</TableCell>
                <TableCell class="text-gray-300 capitalize"
                  >{campaign.strategy.replaceAll('-', ' ')}</TableCell
                >
                <TableCell>
                  <div class="flex flex-wrap gap-2">
                    {#each JSON.parse(campaign.keywords) as keyword}
                      <Badge variant="outline" class="border-gray-800 text-gray-300"
                        >{keyword}</Badge
                      >
                    {/each}
                  </div>
                </TableCell>
                <TableCell class="text-gray-300">{campaign.accountHandle}</TableCell>
                <TableCell class="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant={campaign.status ? 'destructive' : 'default'}
                    class="group hover:scale-[1.02] transition-transform"
                    on:click={() => toggleCampaignStatus(campaign.id)}
                  >
                    {#if campaign.status}
                      <Loader class="h-4 w-4 mr-2 animate-spin" />
                    {/if}
                    {campaign.status ? 'Pause' : 'Start'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-red-400 hover:bg-red-400/10"
                    on:click={() => deleteCampaign(campaign.id)}
                    disabled={campaign.status}
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            {:else}
              <TableRow>
                <TableCell class="text-center h-24 text-gray-400">No campaigns found</TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </main>
</div>

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
