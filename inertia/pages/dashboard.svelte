<script lang="ts">
  import Layout from '@/components/layout.svelte'
  import AccountCard from '@/components/account_card.svelte'
  import type { Listener } from '@/type'
  import type Account from '#models/account'

  export let accounts: Account[]
  export let listeners: Listener[]
</script>

<Layout />

<main class="container pt-12 justify-center items-center flex flex-col gap-7 w-2/3 px-0">
  <h1 class="text-2xl font-semibold">Your bluesky accounts</h1>
  {#each accounts as account}
    <AccountCard {account} {listeners}></AccountCard>
  {/each}
</main>
