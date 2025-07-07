<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { router } from '@inertiajs/svelte'
  import { onMount } from 'svelte'

  onMount(async () => {
    const id = $page.url.substring(
      $page.url.indexOf('/account/') + 9,
      $page.url.indexOf('/dashboard/loading')
    )
    await router.get(`/account/${id}/dashboard`)
  })
</script>

<main>

  
</main>