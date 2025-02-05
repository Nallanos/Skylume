<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import type Account from '#models/account'
  import type User from '#models/user'

  const user = $page.props.user as User
  const accounts = user.account as unknown as Account[]
</script>

<div class="flex h-screen w-screen">
  <Sidebar {user} {accounts} />

  <div class="flex-1 flex items-center justify-center">
    <h1 class="text-center text-3xl font-bold">Coming soon</h1>
  </div>
</div>
