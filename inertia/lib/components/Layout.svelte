<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import type User from '#models/user'

  export let user: User
</script>

<div class="flex min-h-screen bg-background relative">
  <!-- Sidebar avec largeur fixe -->
  <div class="md:block hidden">
    <Sidebar {user} />
  </div>

  <div class="md:hidden block">
    <Sidebar {user} />
  </div>

  <!-- Contenu principal avec marge à gauche pour éviter la superposition -->
  <main
    class="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 transition-all duration-300 md:ml-64 w-full text-foreground"
  >
    <slot />
  </main>
</div>

<style>
  /* S'assurer que le contenu principal a toujours un espacement approprié sur mobile */
  @media (max-width: 768px) {
    main {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
