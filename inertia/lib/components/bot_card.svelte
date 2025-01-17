<script lang="ts">
  import Button from '@/ui/button/button.svelte'
  import { Trash2 } from 'lucide-svelte'
  import type { Listener } from '@/type'
  export let bot: Listener
  import { router } from '@inertiajs/svelte'

  function handleDelete() {
    console.log(bot.id)
    router.post('/bot/remove', { listener_id: bot.id })
  }
</script>

<div
  class="pl-2 flex flex-col w-full border justify-center items-center border-gray-800 rounded-md p-2 h-24"
>
  <header class="flex items-center w-full">
    <h4 class=" w-full mx-auto">
      Bot <b class="pl-1">{bot.id}</b>
    </h4>
    <Button variant="destructive" on:click={handleDelete} class="ml-auto">
      <Trash2 class="size-4" />
    </Button>
  </header>
  <p>
    Listening to {bot.event} and
    {#if bot.action === 'send A message'}
      send {bot.message}
    {:else}
      {bot.action}
    {/if}
  </p>
</div>
