<script lang="ts" context="module">
  import { Button } from '@/ui/button'
  import { router } from '@inertiajs/svelte'
  import { Settings, House, Bot, CalendarCheck2 } from 'lucide-svelte'
</script>

<header class="container mx-auto w-2/3 flex flex-row items-center gap-6 pt-12 px-0">
  <nav
    class="flex justify-evenly h-12 items-center w-full border border-gray-700 rounded-md divide-x divide-gray-700"
  >
    <a href="/dashboard" class="w-full flex h-full justify-center items-center gap-2"
      ><House class="size-4" />
      <p>Dashboard</p></a
    >
    <a href="/bot" class="w-full flex h-full justify-center items-center gap-2">
      <Bot class="size-4" />
      <p>Add bots</p></a
    >
    <a href="/schedule" class="w-full flex h-full justify-center items-center gap-2">
      <CalendarCheck2 class="size-4" />
      <p>Schedule your post</p></a
    >

    <a href="/settings" class="w-full flex h-full justify-center items-center gap-2"
      ><Settings class="size-4" />
      <p>Settings</p></a
    >
  </nav>
  <form
    class="flex justify-self-end"
    on:submit={async (e) => {
      e.preventDefault()
      router.put('/logout')
    }}
  >
    <Button variant="outline" type="submit">Logout</Button>
  </form>
</header>
