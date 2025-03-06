<script lang="ts">
  import AddAccount from '@/components/AddAccount.svelte'
  import AccountCard from './../lib/components/AccountCard.svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import { Plus } from 'lucide-svelte'
  import type Account from '#models/account'
  import type User from '#models/user'
  import Button from '@/ui/button/button.svelte'

  export let accounts: Account[]
  console.log(accounts)
  $: user = $page.props.user as User
</script>

<div class="flex min-h-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>

  <main class="flex-1 p-8 relative pt-20">
    {#if accounts.length === 0}
      <AddAccount />
    {:else}
      <!-- Title and Stats -->
      <div class="mb-8 space-y-2 flex flex-col w-full md:flex md:justify-between">
        <div>
          <h1 class="text-2xl font-bold w-full text-justify">Your Bluesky Accounts</h1>
          <p class="text-gray-400">
            {accounts.length} connected account{accounts.length > 1 ? 's' : ''}
          </p>
        </div>
        <!-- Floating Add Button -->
        <div class=" animate-fade-in">
          <Button
            href="/add/account"
            class="group shadow-xl hover:shadow-2xl transition-all rounded-md px-6 py-4 bg-gradient-to-r bg-blue-500  hover:bg-blue-400"
          >
            <Plus class="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
            Add New Account
          </Button>
        </div>
      </div>
      <div
        class="mb-8 p-4 rounded-lg bg-red-900/20 border border-red-800/50 flex items-start gap-3"
      >
        <div class="text-red-500 animate-pulse">⚠️</div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-red-200">Alpha Version Notice</p>
          <p class="text-sm text-red-400/90 leading-snug">
            Our app is currently down due to a BullMQ job error. I'm tied up with classes, so
            resolution might be delayed. Thank you for your patience and understanding.
          </p>
        </div>
      </div>
      <!-- Accounts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
        {#each accounts as account}
          <AccountCard {account} />
        {/each}
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
