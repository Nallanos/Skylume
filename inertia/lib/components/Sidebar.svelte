<script lang="ts">
  import type User from '#models/user'
  import type Account from '#models/account'
  import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/ui/accordion'
  import {
    Bot,
    Calendar,
    Sparkles,
    LayoutDashboard,
    Puzzle,
    Menu,
    EllipsisVertical,
    MessageSquare,
    X as CloseIcon,
  } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  } from '@/ui/dropdown-menu'
  import Button from '@/ui/button/button.svelte'
  export let user: User
  export let accounts: Account[]

  let isSidebarOpen = false

  async function handleLogout() {
    await router.put('/logout')
  }

  async function handleDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action is irreversible.')) {
      await router.delete('/delete')
    }
  }
</script>

{#if !isSidebarOpen}
  <button
    class="md:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-md"
    on:click={() => (isSidebarOpen = true)}
  >
    <Menu class="h-6 w-6" />
  </button>
{/if}

<!-- Sidebar -->
<aside
  class="fixed left-0 h-full z-40 w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto flex flex-col"
  class:translate-x-0={isSidebarOpen}
  class:-translate-x-full={!isSidebarOpen}
>
  <!-- Bouton de fermeture (visible sur mobile) -->
  <button class="absolute top-4 right-4 md:hidden p-2" on:click={() => (isSidebarOpen = false)}>
    <CloseIcon class="h-6 w-6" />
  </button>

  <nav class="px-3 py-4 overflow-y-auto mt-8 flex-1">
    <div class="mb-6 px-2 space-y-1">
      <a
        href="/dashboard"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-foreground/90 hover:text-foreground"
      >
        <LayoutDashboard class="h-4 w-4" />
        Dashboard
      </a>
      <a
        href="/bot"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-foreground/90 hover:text-foreground"
      >
        <Bot class="h-4 w-4" />
        Add a bot
      </a>
      <a
        href="/schedule"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-foreground/90 hover:text-foreground"
      >
        <Calendar class="h-4 w-4" />
        All your scheduled posts
      </a>
      <a
        href="/DM_Campaigns"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent text-foreground/90 hover:text-foreground"
      >
        <MessageSquare class="h-4 w-4" />
        DM Campaigns
      </a>
    </div>
    {#each accounts as account}
      <Accordion class="border-t border-border pt-4">
        <AccordionItem value="account">
          <AccordionTrigger class="px-2 hover:no-underline">
            <div class="flex-1 flex items-center gap-2 text-sm font-medium">
              <Puzzle class="h-4 w-4" />
              <span>{account.handle}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent class="mt-1 space-y-1">
            <a
              href={`/account/${account.id}/dashboard`}
              class="flex items-center gap-3 rounded-md px-3 py-2 ml-4 text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <LayoutDashboard class="h-4 w-4" />
              Bot Dashboard
            </a>
            <a
              href={`/schedule`}
              class="flex items-center gap-3 rounded-md px-3 py-2 ml-4 text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Calendar class="h-4 w-4" />
              Schedule your posts
            </a>
            <a
              href={`/account/${account.id}/ai-posts`}
              class="flex items-center gap-3 rounded-md px-3 py-2 ml-4 text-sm transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Sparkles class="h-4 w-4" />
              AI posts generation
            </a>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    {/each}
  </nav>

  <!-- Section utilisateur avec menu dropdown -->
  {#if user}
    <div class="p-4 border-t border-border flex items-center justify-between">
      <p class="text-sm font-medium truncate text-foreground">{user.email}</p>
      <!-- Menu déroulant -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild let:builder>
          <Button
            class="p-2 rounded-md hover:bg-accent bg-background"
            variant="secondary"
            builders={[builder]}
          >
            <EllipsisVertical class="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="border border-gray-800">
          <DropdownMenuItem on:click={handleLogout}>Logout</DropdownMenuItem>
          <DropdownMenuItem class="text-red-500" on:click={handleDeleteAccount}>
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  {/if}
</aside>
