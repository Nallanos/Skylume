<script lang="ts">
  import Button from '@/ui/button/button.svelte'
  import { Trash2 } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import type Listener from '#models/listener'

  export let listener: Listener

  function handleDelete() {
    console.log(listener.id)
    router.post('/bot/remove', { listener_id: listener.id })
  }
</script>

<div
  class="pl-2 flex flex-col w-full border justify-center items-center border-gray-800 rounded-md p-2 h-24"
>
  <a href={`/bot/${listener.id}`}>
    <h4 class=" w-full mx-auto">
      Bot <b class="pl-1">{listener.id}</b>
    </h4>
  </a>
  <header class="flex items-center w-full">
    <Button variant="destructive" on:click={handleDelete} class="ml-auto">
      <Trash2 class="size-4" />
    </Button>
  </header>
  <p>
    Listening to {listener.event} and
    {#if listener.action === 'send A message'}
      send {listener.message}
    {:else}
      {listener.action}
    {/if}
  </p>
</div>
