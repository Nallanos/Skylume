<script lang="ts">
  import Button from '@/ui/button/button.svelte'
  import { Menu, X } from 'lucide-svelte'

  let isSidebarOpen = false
  let isScrolled = false
</script>

<!-- Header principal -->
<header
  class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-shadow duration-200 {isScrolled
    ? 'shadow-sm'
    : ''} md:static"
>
  <div class="container max-w-7xl mx-auto">
    <nav class="flex justify-between items-center h-16 px-4 sm:px-6">
      <!-- Côté gauche (Logo + Menu mobile) -->
      <div class="flex items-center gap-4 md:gap-6">
        <button
          on:click={() => (isSidebarOpen = !isSidebarOpen)}
          class="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu size={20} class="text-foreground" />
        </button>

        <a href="/" class="flex items-center gap-2">
          <span
            class="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent"
          >
            Bluesky Bot
          </span>
        </a>
      </div>

      <!-- Navigation desktop -->
      <div class="hidden md:flex items-center gap-6">
        <a
          href="/pricing"
          class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Pricing
        </a>
        <a
          href="/philosophy"
          class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Our Philosophy
        </a>
        <a
          href="/login"
          class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Login
        </a>

        <Button href="/dashboard" size="sm" class="gap-2">Join Alpha</Button>
      </div>
    </nav>
  </div>
</header>

<!-- Sidebar mobile -->
<div
  class="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-300 {isSidebarOpen
    ? 'opacity-100 visible'
    : 'opacity-0 invisible'}"
>
  <div
    class="fixed left-0 top-0 h-full w-3/4 max-w-xs border-r border-gray-800 bg-background shadow-lg transition-transform duration-300 {isSidebarOpen
      ? 'translate-x-0'
      : '-translate-x-full'}"
  >
    <div class="p-4 border-b border-gray-800">
      <div class="flex items-center justify-between">
        <span class="text-lg font-semibold">Menu</span>
        <button on:click={() => (isSidebarOpen = false)} class="p-2 hover:bg-accent rounded-lg">
          <X size={20} />
        </button>
      </div>
    </div>
    <div class="p-4 flex flex-col gap-4">
      <a href="/login" class="py-2 px-3 rounded-lg hover:bg-accent transition-colors"> Login </a>
    </div>
    <div class="p-4 flex flex-col gap-4">
      <a href="/pricing" class="py-2 px-3 rounded-lg hover:bg-accent transition-colors">
        Pricing
      </a>
      <Button href="/dashboard" class="w-full mt-4">Join Alpha</Button>
    </div>
  </div>
</div>
