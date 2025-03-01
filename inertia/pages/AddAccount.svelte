<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import AddAccount from '@/components/AddAccount.svelte'
  import type User from '#models/user'
  import { page } from '@inertiajs/svelte'
  import type Account from '#models/account'

  let user: User = $page.props.user
  let accounts = user.account as unknown as Account[]
</script>

<div class="flex min-h-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>
  <main class="flex p-8 w-full">
    <AddAccount />
  </main>
</div>
