<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import { Button } from '@/ui/button/'
</script>

<div class="min-h-screen">
  <LayoutLandingPage />
  <main
    class="container mx-auto px-4 h-screen flex flex-col justify-center items-center relative overflow-hidden"
  >
    <div class="relative z-10 text-center space-y-8">
      <h1
        class="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent animate-fade-in-up"
      >
        Transform Your Experience
      </h1>

      <p class="text-xl text-blue-100/90 font-light max-w-2xl mx-auto">
        Join our community and unlock exclusive features. Start your journey today with just a few
        clicks.
      </p>

      <div class="flex flex-col sm:flex-row justify-center gap-6 pt-8 animate-fade-in-up delay-300">
        <Button
          href="/sign-up"
          variant="default"
          class="min-w-[200px] h-14 rounded-full text-lg font-semibold
                 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400
                 transform transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          ✨ Create Free Account
        </Button>

        <Button
          href="/login"
          variant="outline"
          class="min-w-[200px] h-14 rounded-full text-lg font-semibold
                 border-2 border-blue-300 text-blue-100 hover:bg-blue-500/20
                 transform transition-all duration-300 hover:scale-105"
        >
          🚀 Existing User? Login
        </Button>
      </div>
    </div>
  </main>
</div>

<style>
  @keyframes fade-in-up {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
  }
</style>
