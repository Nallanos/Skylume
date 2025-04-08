<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'

  const user = $page.props.user as User
</script>

<div class="flex h-screen w-screen">
  <div class="h-screen">
    <Sidebar {user} />
  </div>

  <div class="flex-1 flex items-center justify-center">
    <h1 class="text-center text-3xl font-bold">Coming soon</h1>
  </div>
</div>
