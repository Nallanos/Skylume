<script lang="ts">
  import type User from '#models/user'
  import {
    Calendar,
    LayoutDashboard,
    Menu,
    EllipsisVertical,
    X as CloseIcon,
    Hash,
    MessageSquare,
    Settings,
  } from 'lucide-svelte'
  import { router } from '@inertiajs/svelte'
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
  } from '@/shadcn-ui/dropdown-menu'
  import Button from '@/shadcn-ui/button/button.svelte'
  import ThemeToggle from '@/components/theme-toggle/theme-toggle.svelte'
  import { page } from '@inertiajs/svelte'

  export let user: User

  let isSidebarOpen = false
  let path = $page.url

  async function handleLogout() {
    await router.put('/logout')
  }

  async function handleDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action is irreversible.')) {
      await router.delete('/delete')
    }
  }

  function isActive(href: string): boolean {
    // Cas spécial pour la page d'accueil
    if (href === '/') {
      return path === '/' || path === ''
    }
    // Pour les autres pages
    return path.startsWith(href)
  }
</script>

{#if !isSidebarOpen}
  <button
    class="md:hidden fixed top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur border border-border rounded-md shadow-sm"
    on:click={() => (isSidebarOpen = true)}
  >
    <Menu class="h-5 w-5 text-foreground/80" />
  </button>
{/if}

<!-- Sidebar -->
<aside
  class="fixed inset-y-0 left-0 z-50 w-64 bg-card/80 backdrop-blur-md border-r border-border/50 shadow-sm transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col overflow-hidden sidebar-main"
  class:translate-x-0={isSidebarOpen}
  class:-translate-x-full={!isSidebarOpen}
>
  <!-- Bouton de fermeture (visible sur mobile) -->
  <button
    class="absolute top-4 right-4 md:hidden p-2 rounded-full hover:bg-background/80 transition-colors"
    on:click={() => (isSidebarOpen = false)}
  >
    <CloseIcon class="h-5 w-5 text-foreground/70" />
  </button>

  <div class="p-4 flex items-center gap-3 flex-shrink-0 border-b border-border/30">
    <a href="/" class="flex items-center gap-3">
      <div
        class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm"
      >
        B
      </div>
      <span
        class="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"
      >
        Bluesky Bot
      </span>
    </a>
  </div>

  <nav class="px-3 py-4 flex-1 overflow-y-auto scrollbar-thin">
    <div class="space-y-1.5">
      <a
        href="/dashboard"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
          '/dashboard'
        )
          ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
          : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'}"
      >
        <LayoutDashboard class="h-[18px] w-[18px] flex-shrink-0" />
        Dashboard
      </a>
      <a
        href="/feed"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
          '/feed'
        )
          ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
          : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'}"
      >
        <Hash class="h-[18px] w-[18px] flex-shrink-0" />
        Feeds
      </a>
      <a
        href="/schedule"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
          '/schedule'
        )
          ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
          : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'}"
      >
        <Calendar class="h-[18px] w-[18px] flex-shrink-0" />
        Scheduling
      </a>
      <a
        href="/DM_Campaigns"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
          '/DM_Campaigns'
        )
          ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
          : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'}"
      >
        <MessageSquare class="h-[18px] w-[18px] flex-shrink-0" />
        DM Campaigns
      </a>
      <a
        href="/ai-analysis"
        class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
          '/ai-analysis'
        )
          ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
          : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'}"
      >
        <span
          class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white"
        >
          AI
        </span>
        AI Analysis
      </a>
    </div>

    {#if user?.plan === 'pro'}
      <div class="mt-8">
        <div class="px-3 mb-2">
          <p
            class="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider"
          >
            Pro Features
          </p>
          <div class="h-0.5 w-8 bg-purple-500 rounded mt-1"></div>
        </div>
        <div class="space-y-1.5">
          <a
            href="/AiPost"
            class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 {isActive(
              '/AiPost'
            )
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-500 font-semibold shadow-sm'
              : 'text-blue-700 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-700 dark:hover:text-blue-500 font-medium'}"
          >
            <span
              class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white"
            >
              AI
            </span>
            AI Posts
          </a>
        </div>
      </div>
    {/if}
  </nav>

  <!-- Section utilisateur avec menu dropdown -->
  {#if user}
    <div
      class="p-4 border-t border-border/30 flex flex-col gap-2 flex-shrink-0 bg-card/60 backdrop-blur-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-sm"
        >
          <span class="text-sm font-bold text-blue-700 dark:text-blue-500"
            >{user.email[0].toUpperCase()}</span
          >
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate text-blue-700 dark:text-blue-500">
            {user.email}
          </p>
          <p
            class="text-xs font-medium text-blue-600 dark:text-blue-400 truncate flex items-center"
          >
            <span
              class="inline-block w-2 h-2 rounded-full {user.plan === 'pro'
                ? 'bg-blue-500'
                : 'bg-gray-400'} mr-1.5"
            ></span>
            {user.plan === 'pro' ? 'Pro' : 'Free'} Plan
          </p>
        </div>

        <!-- Menu déroulant -->
        <DropdownMenu>
          <DropdownMenuTrigger asChild let:builder>
            <Button
              class="p-2 rounded-md hover:bg-accent bg-background/0"
              variant="ghost"
              size="icon"
              builders={[builder]}
            >
              <EllipsisVertical class="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem href="/profile">
              <Settings class="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem href="/plan/change">
              <span class="mr-2">✨</span>
              Upgrade Plan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem on:click={handleLogout}>Logout</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              on:click={handleDeleteAccount}
            >
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div class="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
        <span class="text-sm font-medium text-blue-700 dark:text-blue-400">Theme</span>
        <ThemeToggle />
      </div>
    </div>
  {/if}
</aside>

<style>
  :global(.sidebar-main) {
    width: 16rem; /* 64px / 4px = 16rem in tailwind */
  }

  @media (max-width: 768px) {
    :global(.sidebar-main) {
      width: 16rem;
    }
  }
</style>
