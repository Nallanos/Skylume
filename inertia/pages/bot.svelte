<script lang="ts">
  import Layout from '@/components/layout.svelte'
  import type { Listener } from '@/type'
  import { page, router } from '@inertiajs/svelte'
  import { RefreshCcw } from 'lucide-svelte'

  async function handleButton() {
    console.log('refreshing bot data', bot.id)
    await router.post('/bot/refresh', { listenerId: bot.id })
  }

  $: bot = $page.props.bot as Listener
  console.log(bot)
</script>

<Layout />

<main class="container flex flex-col gap-6 mt-12 border border-gray-800 rounded-md w-2/3">
  <div class="flex justify-center text-center w-full pt-2">
    <h1 class="text-2xl ml-auto font-bold">Bot {bot.id}</h1>
    <button class="ml-auto" on:click={handleButton}><RefreshCcw class="size-5" /></button>
  </div>
  <div>
    <h3>Preview of the message:</h3>
    <div class="p-4 justify-end flex rounded-md">
      <p class="bg-[#0c74ff] p-2 rounded-md w-2/3">{bot.message}</p>
    </div>
  </div>

  <p>The total of message sent by the bot: <b>{bot.numberOfMessageSent}</b></p>
  <p></p>
</main>
