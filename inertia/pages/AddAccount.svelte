<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import AddAccount from '@/components/AddAccount.svelte'
  import type User from '#models/user'
  import { page } from '@inertiajs/svelte'

  let user: User = $page.props.user
</script>

<div class="flex min-h-screen">
  <div class="h-screen">
    <Sidebar {user} />
  </div>
  <main class="flex p-8 w-full">
    <AddAccount />
  </main>
</div>
