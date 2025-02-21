<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
  import { Label } from '@/ui/label'
  import { RadioGroup, RadioGroupItem } from '@/ui/radio-group'
  import { Button } from '@/ui/button'
  import { Input } from '@/ui/input'
  import { Textarea } from '@/ui/textarea'
  import { Send, X } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import * as Select from '@/ui/select'
  import type User from '#models/user'
  import type Account from '#models/account'
  import { router } from '@inertiajs/svelte'

  const user = $page.props.user as User

  let campaignName = ''
  let selectedTargeting = 'all'
  let keywords: string[] = []
  let messageContent = ''
  let newKeyword = ''
  let account_handle = ''
  let errorMessage = '' // Ajout pour gérer l'affichage des erreurs

  let accounts = user.account as unknown as Account[]

  const addKeyword = () => {
    if (newKeyword.trim()) {
      keywords = [...keywords, newKeyword.trim()]
      newKeyword = ''
    }
  }

  function handleSelect(value: string) {
    account_handle = value
  }

  const createCampaign = async () => {
    errorMessage = '' // Reset le message d'erreur

    if (!campaignName || !account_handle || !messageContent) {
      errorMessage = 'Please fill in all required fields before submitting.'
      return
    }

    await createCampaignApi({
      campaign_name: campaignName,
      account_handle: account_handle,
      campaign_target: selectedTargeting,
      keywords: keywords,
      campaign_message: messageContent,
    })
  }

  type payloadCampaign = {
    campaign_name: string
    account_handle: string
    campaign_message: string
    campaign_target: string
    keywords: string[]
  }

  const createCampaignApi = async (data: payloadCampaign) => {
    console.log(data)
    router.post('/dm_campaign/create', data)
  }
</script>

<div class="flex min-h-screen">
  <Sidebar {user} {accounts} />

  <main class="flex-1 p-8 relative pt-20">
    <div class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold">Add DM Campaigns</h1>
      <p class="text-gray-400">
        Reach your Bluesky followers with precision, with massive dm campaign specifically targeted
      </p>
    </div>

    <div class="space-y-8">
      <div class="space-y-2">
        <p class="block text-sm font-medium">Account</p>
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
                <Select.Item value={account.handle} on:click={() => handleSelect(account.handle)}>
                  {account.handle}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
          <Select.Input name="account" required />
        </Select.Root>
      </div>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Campaign Settings</CardTitle>
          <CardDescription>Basic configuration for your DM campaign</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Campaign Name</Label>
            <Input bind:value={campaignName} class="border-gray-800" required />
          </div>
        </CardContent>
      </Card>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Audience Targeting</CardTitle>
          <CardDescription>Select who should receive your message</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <RadioGroup bind:value={selectedTargeting} class="space-y-4" required>
            <div class="flex items-center space-x-3">
              <RadioGroupItem value="all" />
              <Label>Send to all followers</Label>
            </div>
            <div class="flex items-center space-x-3">
              <RadioGroupItem value="no-interaction" />
              <Label>Followers with no prior interaction</Label>
            </div>
            <div class="flex items-center space-x-3">
              <RadioGroupItem value="not-received" />
              <Label>Followers who haven't received this message</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Keyword Targeting</CardTitle>
          <CardDescription>Add keywords to refine your audience</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex gap-2 flex-wrap">
            {#each keywords as keyword, i (keyword)}
              <div class="px-3 py-1 rounded-full border border-gray-800 flex items-center gap-2">
                <span>{keyword}</span>
                <X
                  class="h-4 w-4 cursor-pointer"
                  on:click={() => (keywords = keywords.filter((_, index) => index !== i))}
                />
              </div>
            {/each}
          </div>
          <div class="flex gap-2">
            <Input
              bind:value={newKeyword}
              class="border-gray-800 max-w-[300px]"
              placeholder="Add keyword..."
              on:keydown={(e) => e.key === 'Enter' && addKeyword()}
            />
            <Button variant="outline" class="border-gray-800" on:click={addKeyword}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card class="border-gray-800">
        <CardHeader>
          <CardTitle>Message Content</CardTitle>
          <CardDescription>Write your DM template</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            bind:value={messageContent}
            class="border-gray-800 min-h-[200px]"
            placeholder="Write your message here..."
            required
          />
        </CardContent>
      </Card>

      {#if errorMessage}
        <p class="text-red-500 text-sm">{errorMessage}</p>
      {/if}

      <div class="flex justify-end gap-4 pb-16">
        <Button variant="outline" class="border-gray-800">Cancel</Button>
        <Button on:click={createCampaign} class="gap-2">
          <Send class="h-4 w-4" />
          Add Campaign
        </Button>
      </div>
    </div>
  </main>
</div>
