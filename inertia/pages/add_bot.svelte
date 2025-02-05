<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import * as Select from '@/ui/select'
  import type { EventType } from '@/type'
  import Textarea from '@/ui/textarea/textarea.svelte'
  import type Account from '#models/account'
  import type User from '#models/user'
  import { page } from '@inertiajs/svelte'

  export let accounts: Account[]
  const user = $page.props.user as User

  const events: EventType[] = ['follow', 'reply', 'like']
  const actions = ['Follow', 'Send a Message']

  let event: string
  let action: string
  let handle: string
  let message: string = ''
  let loading = false

  function handleSelect(selectType: string, value: string) {
    if (selectType === 'handle') handle = value
    else if (selectType === 'action') action = value
    else if (selectType === 'event') event = value
  }

  async function handleSubmit() {
    if (!handle || !event || !action) {
      alert('Please fill all required fields')
      return
    }

    loading = true
    try {
      await router.post('/bot/add', { event, action, handle, message })
    } finally {
      loading = false
    }
  }
</script>

<div class="flex h-screen w-screen">
  <Sidebar {user} {accounts} />

  <div class="flex-1 flex flex-col items-center overflow-auto p-8">
    <header class="w-full max-w-2xl mb-12">
      <h3 class="text-3xl font-bold mb-4">Bot Management</h3>
      <p class="leading-relaxed text-gray-300">
        Configure your bots to automatically respond to Bluesky activities. Customize events,
        actions, and timing according to your preferences.
      </p>
    </header>

    <main class="w-full max-w-2xl">
      <div class="rounded-xl shadow-sm border border-gray-800 p-6">
        <h4 class="text-lg font-semibold mb-6">New Bot</h4>

        <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
          <!-- Account Selection -->
          <div class="space-y-2">
            <label class="block text-sm font-medium">Account</label>
            <Select.Root portal={null}>
              <Select.Trigger
                class="w-full px-3 py-2 border border-gray-800 rounded-lg hover:border-gray-400 "
              >
                <Select.Value placeholder="Select an account" />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Your accounts</Select.Label>
                  {#each accounts as account}
                    <Select.Item
                      value={account.handle}
                      on:click={() => handleSelect('handle', account.handle)}
                    >
                      {account.handle}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
              <Select.Input name="account" required />
            </Select.Root>
          </div>

          <!-- Event Selection -->
          <div class="space-y-2">
            <label class="block text-sm font-medium">Event</label>
            <Select.Root portal={null}>
              <Select.Trigger
                class="w-full px-3 py-2 border border-gray-800 rounded-lg hover:border-gray-400 "
              >
                <Select.Value placeholder="Choose an event" />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Trigger Events</Select.Label>
                  {#each events as evt}
                    <Select.Item value={evt} on:click={() => handleSelect('event', evt)}
                      >{evt}</Select.Item
                    >
                  {/each}
                </Select.Group>
              </Select.Content>
              <Select.Input name="event" required />
            </Select.Root>
          </div>

          <!-- Action Selection -->
          <div class="space-y-2">
            <label class="block text-sm font-medium">Action</label>
            <Select.Root portal={null}>
              <Select.Trigger
                class="w-full px-3 py-2 border border-gray-800 rounded-lg hover:border-gray-400"
              >
                <Select.Value placeholder="Select an action" />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.Label>Response Actions</Select.Label>
                  {#each actions as act}
                    <Select.Item value={act} on:click={() => handleSelect('action', act)}
                      >{act}</Select.Item
                    >
                  {/each}
                </Select.Group>
              </Select.Content>
              <Select.Input name="action" required />
            </Select.Root>
          </div>

          <!-- Message Input -->
          {#if action === 'Send a Message'}
            <div class="space-y-2">
              <label for="message" class="block text-sm font-medium">Message</label>
              <Textarea
                bind:value={message}
                required
                id="message"
                class="w-full px-3 py-2 border border-gray-800 rounded-lg  focus:ring-2 focus:ring-blue-500"
                placeholder="Write your message..."
              />
            </div>
          {/if}

          <!-- Submit Button -->
          <button
            type="submit"
            disabled={loading}
            class="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Bot'}
          </button>
        </form>
      </div>
    </main>
  </div>
</div>
