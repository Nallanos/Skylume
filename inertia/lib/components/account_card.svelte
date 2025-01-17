<script lang="ts">
  import Button from './../ui/button/button.svelte'
  import { Trash2 } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import type Account from '#models/account'
  import type { Listener } from '@/type'
  export let account: Account
  export let listeners: Listener[]
  import BotCard from './bot_card.svelte'
  const id = account.id
  $: accountListeners = listeners.filter((listener) => listener.accountId === id)

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

  <ul class="pt-2 gap-4 flex flex-col text-center">
    {#each accountListeners as bot}
      <BotCard {bot} />
    {/each}
  </ul>
</div>
