<script lang="ts">
  import type User from '#models/user'
  import type Account from '#models/account'
  import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/ui/accordion'
  import { Bot, Calendar, Sparkles, LayoutDashboard, Puzzle } from 'lucide-svelte'
  import Button from '@/ui/button/button.svelte'
  import { router } from '@inertiajs/svelte'
  export let user: User
  export let accounts: Account[]

  async function handleLogout() {
    await router.put('/logout')
  }
</script>

<aside class="w-64 h-screen flex flex-col border-r border-border bg-background">
  <nav class="flex-1 px-3 py-4 overflow-y-auto">
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
              Dashboard
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
  <div class="p-4 border-t border-border">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium truncate text-foreground">{user.email}</p>
      <Button variant="outline" on:click={handleLogout}>Logout</Button>
    </div>
  </div>
</aside>
