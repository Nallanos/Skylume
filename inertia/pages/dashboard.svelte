<script lang="ts">
  import Layout from '@/components/layout.svelte'
  import AccountCard from '@/components/account_card.svelte'
  import type { Account } from '@/type'
  import { page } from '@inertiajs/svelte'

  export let accounts: Account[]
</script>

<Layout />

<main class="container pt-12 justify-center items-center flex flex-col gap-7 w-2/3 px-0">
  <h1 class="text-2xl font-semibold">Your bluesky accounts</h1>
  {#each accounts as account}
    <AccountCard {account}></AccountCard>
  {/each}
</main>
