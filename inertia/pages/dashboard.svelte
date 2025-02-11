<script lang="ts">
  import AddAccount from '@/components/AddAccount.svelte'
  import AccountCard from './../lib/components/AccountCard.svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import { Plus } from 'lucide-svelte'
  import type Account from '#models/account'
  import type User from '#models/user'
  import type { Listener } from '@/type'
  import Button from '@/ui/button/button.svelte'

  export let accounts: Account[]
  export let listeners: Listener[]

  const user = $page.props.user as User
</script>

<div class="flex min-h-screen">
  <Sidebar {user} {accounts} />

  <main class="flex-1 p-8 relative">
    {#if accounts.length === 0}
      <AddAccount />
    {:else}
      <!-- Title and Stats -->
      <div class="mb-8 space-y-2">
        <h1 class="text-3xl font-bold text-gray-100">Your Bots Manager</h1>
        <p class="text-gray-400">
          {accounts.length} connected account{accounts.length > 1 ? 's' : ''}
        </p>
      </div>

      <!-- Accounts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
        {#each accounts as account}
          <AccountCard {account} {listeners} />
        {/each}
      </div>

      <!-- Floating Add Button -->
      <div class="fixed top-8 right-8 animate-fade-in">
        <Button
          href="/add/account"
          class="group shadow-xl hover:shadow-2xl transition-all rounded-full px-6 py-4 bg-gradient-to-r bg-blue-500  hover:bg-blue-400"
        >
          <Plus class="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
          Add New Account
        </Button>
      </div>
    {/if}
  </main>
</div>

<style global>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }
</style>
