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

<div class="flex min-h-screen flex-col md:flex-row">
  <div class="md:h-screen md:sticky md:top-0">
    <Sidebar {user} {accounts} />
  </div>

  <main class="flex-1 p-4 md:p-8 pt-16 md:pt-20">
    <div class="mb-6 space-y-4">
      <div class="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-100">Campaigns Dashboard</h1>
          <p class="text-gray-400 mt-1">
            {campaigns.length} active campaign{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          href="/add/campaign"
          class="w-full md:w-auto group hover:scale-[1.02] transition-transform whitespace-nowrap"
        >
          <Plus class="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
          New Campaign
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
        <Card class="transition-colors duration-300 border-gray-800 hover:border-blue-400">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Total Engagement
              <span class="text-blue-400 text-xs ml-1">(+24h)</span>
            </CardTitle>
            <div class="p-2 bg-blue-500/10 rounded-lg">
              <Activity class="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl md:text-3xl font-bold text-blue-400">{totalEngagement}</div>
            <p class="text-sm text-gray-400 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card class="transition-colors duration-300 border-gray-800 hover:border-green-400">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Active Now
              <span class="text-green-400 text-xs ml-1">Live</span>
            </CardTitle>
            <div class="p-2 bg-green-500/10 rounded-lg">
              <Mail class="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl md:text-3xl font-bold text-green-400">{activeListeners}</div>
            <p class="text-sm text-gray-400 mt-1">Real-time monitoring</p>
          </CardContent>
        </Card>

        <Card class="transition-colors duration-300 border-gray-800 hover:border-purple-400">
          <CardHeader class="flex flex-row items-center justify-between pb-2">
            <CardTitle class="text-sm font-medium text-gray-300">
              Messages Received
              <span class="text-purple-400 text-xs ml-1">(+24h)</span>
            </CardTitle>
            <div class="p-2 bg-purple-500/10 rounded-lg">
              <Sliders class="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div class="text-2xl md:text-3xl font-bold text-purple-400">{totalResponses}</div>
            <p class="text-sm text-gray-400 mt-1">All campaigns</p>
          </CardContent>
        </Card>
      </div>
    </div>

    <Card class="border-gray-800">
      <CardHeader>
        <CardTitle class="text-gray-100">Active Campaigns</CardTitle>
        <CardDescription class="text-gray-400">Manage your running DM campaigns</CardDescription>
      </CardHeader>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table class="min-w-[600px] md:min-w-full">
            <TableHeader class="bg-gray-900">
              <TableRow class="hover:bg-transparent">
                <TableHead class="text-gray-300 py-3">Status</TableHead>
                <TableHead class="text-gray-300">Campaign</TableHead>
                <TableHead class="text-gray-300">Strategy</TableHead>
                <TableHead class="text-gray-300">Keywords</TableHead>
                <TableHead class="text-gray-300">Account</TableHead>
                <TableHead class="text-gray-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody class="divide-y divide-gray-700">
              {#each campaigns as campaign}
                <TableRow class="hover:bg-gray-800/50">
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2">
                      <div
                        class={`h-2 w-2 rounded-full ${campaign.status ? 'bg-green-400' : 'bg-red-400'}`}
                      />
                      <Badge
                        variant={campaign.status ? 'default' : 'secondary'}
                        class="border border-gray-800 text-xs"
                      >
                        {campaign.status ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell class="font-medium text-gray-100 truncate max-w-[150px]"
                    >{campaign.name}</TableCell
                  >
                  <TableCell class="text-gray-300 capitalize text-sm">
                    {campaign.strategy.replaceAll('-', ' ')}
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap gap-1">
                      {#each JSON.parse(campaign.keywords) as keyword}
                        <Badge
                          variant="outline"
                          class="border-gray-800 text-gray-300 text-xs px-2 py-1"
                        >
                          {keyword}
                        </Badge>
                      {/each}
                    </div>
                  </TableCell>
                  <TableCell class="text-gray-300 truncate max-w-[100px] text-sm"
                    >{campaign.accountHandle}</TableCell
                  >
                  <TableCell>
                    <div class="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant={campaign.status ? 'destructive' : 'default'}
                        class="text-sm px-3 py-1"
                        on:click={() => toggleCampaignStatus(campaign.id)}
                      >
                        {#if campaign.status}
                          <Loader class="h-4 w-4 mr-1 animate-spin" />
                        {/if}
                        {campaign.status ? 'Pause' : 'Start'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        class="text-red-400 hover:bg-red-400/10 p-2"
                        on:click={() => deleteCampaign(campaign.id)}
                      >
                        <Trash class="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              {:else}
                <TableRow>
                  <TableCell class="text-center h-24 text-gray-400">
                    No campaigns found
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
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
