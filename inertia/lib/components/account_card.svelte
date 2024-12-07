<script lang="ts">
  import Button from './../ui/button/button.svelte'
  import { Trash2 } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import type Account from '#models/account'
  import type { Listener } from '@/type'
  export let account: Account
  export let listeners: Listener[]

  const id = account.id
  let accountListeners = listeners.filter((listener) => listener.accountId === id)

  async function handleDelete() {
    console.log(id)
    router.post('/dashboard/accounts/delete', { id: id })
  }
</script>

<div class="border border-gray-800 rounded-md w-full px-4 flex flex-col py-2">
  <div class="flex justify-center text-center">
    <h3 class="text-2xl font-medium">{account.handle}</h3>
    <Button variant="destructive" on:click={handleDelete} class="ml-auto"
      ><Trash2 class="size-4" /></Button
    >
  </div>
  <div class="flex">
    <p>There's <span class="font-bold">{accountListeners.length}</span> active bots :</p>
  </div>
  <ul class="pt-2 gap-2 flex flex-col">
    {#each accountListeners as bot}
      <li class="pl-2 flex flex-col gap-4">
        <p>
          Bot number {bot.id} Listening on {bot.event} and
          {#if bot.action == 'Send a Message'}
            send "{bot.message}"
          {:else}
            {bot.action}
          {/if}
        </p>
      </li>
    {/each}
  </ul>
</div>
