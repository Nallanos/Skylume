<script lang="ts">
  import { Input } from '@/ui/input/'
  import { router } from '@inertiajs/svelte'
  import Layout from '@/components/layout.svelte'
  import * as Select from '@/ui/select'
  import type { Account, EventType } from '@/type'
  import Textarea from '@/ui/textarea/textarea.svelte'
  export let accounts: Account[]
  const events: EventType[] = ['mention', 'follow', 'reply']
  const actions = ['Follow', 'Send a Message']
  let event: string
  let action: string
  let handle: string
  let message: string = ''
  let wait_time: number

  async function handleSelect(selectType: string, selectAction: string) {
    console.log('handle called')
    if (selectType === 'handle') {
      handle = selectAction
    } else if (selectType === 'action') {
      action = selectAction
    } else if (selectType === 'event') {
      event = selectAction
    }
  }

  async function handleSubmit() {
    console.log(message)
    wait_time *= 60
    router.post('/bot/add', {
      event,
      action,
      handle,
      message,
      wait_time,
    })
  }
</script>

<Layout />

<div class="w-2/3 flex flex-col justify-center items-center container px-0">
  <header class="pt-12 w-full flex flex-col">
    <h3 class="text-2xl w-full font-medium">Manage your bots</h3>
    <p class="w-full pt-4">
      The following section will allow you to add bots that listen for a chosen event and trigger a
      specified reaction after a defined delay. You will have full control over the event, reaction,
      and timing for each bot.
    </p>
  </header>

  <main class="pt-12 w-full flex">
    <div class="border border-gray-800 rounded-md w-full">
      <h4 class="text-xl p-4">Add a bot</h4>
      <form class="flex flex-col p-4 gap-4" on:submit|preventDefault={handleSubmit}>
        <div>
          <label for="">Account</label>
          <Select.Root portal={null}>
            <Select.Trigger class="w-full">
              <Select.Value placeholder="Select a Bluesky account" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Your accounts</Select.Label>
                {#each accounts as account}
                  <Select.Item
                    value={account.handle}
                    on:click={() => {
                      handleSelect('handle', account.handle)
                    }}
                  >
                    {account.handle}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
            <Select.Input name="account" />
          </Select.Root>
        </div>

        <div>
          <label for="">Event</label>
          <Select.Root portal={null}>
            <Select.Trigger class="w-full">
              <Select.Value placeholder="Select the event that will activate your bot’s response" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Events</Select.Label>
                {#each events as evt}
                  <Select.Item
                    value={evt}
                    on:click={() => {
                      handleSelect('event', evt)
                    }}
                  ></Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
            <Select.Input name="event" />
          </Select.Root>
        </div>

        <div>
          <label for="">Actions</label>
          <Select.Root portal={null}>
            <Select.Trigger class="w-full">
              <Select.Value placeholder="Select your bot’s response" />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Bot's Actions</Select.Label>
                {#each actions as act}
                  <Select.Item
                    value={act}
                    on:click={() => {
                      handleSelect('action', act)
                    }}
                  >
                    {act}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
            <Select.Input name="action" />
          </Select.Root>
        </div>

        {#if action === 'Send a Message'}
          <div>
            <label for="message">Message</label>
            <Textarea
              bind:value={message}
              required
              class="w-full p-2 border border-gray-800 rounded-md outline-none"
              placeholder="Type the message for the bot to send"
            ></Textarea>
          </div>
        {/if}

        <div>
          <label for="wait_time">Delay before action (min)</label>
          <Input type="number" bind:value={wait_time} placeholder="0" required></Input>
        </div>
        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Add the bot
        </button>
      </form>
    </div>
  </main>
</div>
