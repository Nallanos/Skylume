<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import { Button } from '@/ui/button/'
</script>

<div class="flex flex-col gap-4 h-screen">
  <LayoutLandingPage />
  <main class="container mx-auto justify-center h-2/3 items-center flex flex-col pb-60">
    <h1 class="font-semibold text-5xl pb-4 text-white">Get started</h1>
    <div class="py-4 flex gap-6">
      <Button href="/login" variant="outline" class="w-24 h-12 rounded-full text-sm p-2"
        >Login</Button
      >
      <Button
        href="/sign-up"
        variant="default"
        class="w-44 h-12 rounded-full text-white text-sm p-2">Create an Account</Button
      >
    </div>
  </main>
</div>
