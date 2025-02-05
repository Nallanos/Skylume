<script context="module" lang="ts">
  import Button from '@/ui/button/button.svelte'
</script>

<header class="bg-gray-900/50 backdrop-blur-md fixed w-full top-0 z-50 border-b border-gray-800">
  <nav class="container mx-auto flex justify-between items-center px-6 py-4">
    <a href="/" class="flex items-center gap-2">
      <span
        class="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent"
      >
        Bluesky Bot
      </span>
    </a>

    <div class="hidden md:flex items-center gap-8">
      <a href="/landing-page" class="text-gray-300 hover:text-teal-400 transition-colors"
        >Features</a
      >
      <a href="/pricing" class="text-gray-300 hover:text-teal-400 transition-colors">Pricing</a>
      <a href="/sign-up" class="text-gray-300 hover:text-teal-400 transition-colors"
        >Alpha Program</a
      >
      <Button
        href="/sign-up"
        variant="outline"
        class="border-teal-500 text-teal-400 hover:bg-teal-900/20"
      >
        Join Alpha
      </Button>
    </div>
  </nav>
</header>
