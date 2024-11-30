<script lang="ts">
  import { Button } from '@/ui/button/'
</script>

<main class="container mx-auto justify-center items-center flex flex-col h-screen pb-60">
  <img src="'../../resources/images/logo.png" alt="logo" class="size-44" />
  <h1 class="font-semibold text-5xl pb-4 text-white">Bluesky-copilot</h1>
  <div class="py-4 flex gap-6">
    <Button href="/login" variant="outline" class="w-24 h-12 rounded-full text-sm p-2">Login</Button
    >
    <Button href="/sign-up" variant="default" class="w-44 h-12 rounded-full text-white text-sm p-2"
      >Create an Account</Button
    >
  </div>
</main>
