<script>
  import Button from '@/ui/button/button.svelte'
</script>

<header class="container mx-auto w-full flex items-center justify-center gap-8 px-6 py-2 shadow-md">
  <img src="/resources/images/logo.png" alt="Company Logo" class="h-12 w-auto" />
  <nav
    class="flex justify-evenly items-center h-12 w-1/2 rounded-full border border-gray-900 px-4 shadow"
  >
    <a
      href="/dashboard"
      class="px-4 text-gray-300 hover:text-blue-400"
      title="Navigate to Dashboard">App</a
    >
    <a href="#pricing" class="px-4 text-gray-300 hover:text-blue-400" title="View Pricing Options"
      >Pricing</a
    >
    <a href="#features" class="px-4 text-gray-300 hover:text-blue-400" title="Discover Features"
      >Features</a
    >
  </nav>
</header>

<main class="container mx-auto pt-10 text-center text-gray-300 gap-8 flex flex-col">
  <section class="flex flex-col items-center gap-4">
    <div class="text-4xl w-[600px] leading-snug">
      <h1>
        <b class="text-blue-400">Boost</b> Your Bluesky
        <b class="text-blue-400">Conversions</b> with Bots That
        <b class="text-blue-400">Engage</b> Instantly
      </h1>
    </div>
    <div class="flex flex-col items-center gap-3">
      <Button
        href="/home"
        variant="default"
        class="w-44 h-10 rounded-full bg-blue-500 text-gray-900 text-sm hover:bg-blue-400"
        aria-label="Get Started with Bluesky Bots"
      >
        Get Started
      </Button>
      <p class="text-gray-400 text-sm">Start your free trial. No credit card required.</p>
    </div>
  </section>
  <section class="pt-10 bg-gray-700 py-10 rounded-lg">
    <h2 class="text-2xl font-semibold text-gray-200">Why Bluesky Engagement Matters</h2>
    <div class="flex flex-col gap-6 mt-6 text-gray-400 max-w-3xl mx-auto text-center">
      <p>
        In today's fast-paced digital world, capturing your audience's attention is critical.
        Bluesky offers a platform for direct, authentic interactions with your community.
      </p>
      <p>
        However, maintaining consistent engagement can be challenging. This is where bots step in —
        providing instant, meaningful responses to your audience, ensuring they feel valued and
        connected at all times.
      </p>
      <p>
        By automating interactions, you can focus on scaling your business while still delivering a
        personalized experience for every user.
      </p>
    </div>
  </section>
         
  <section class="flex flex-col border border-gray-900 rounded-md">
    <h2 class="text-2xl font-semibold text-gray-200 py-2">Why Choose Us?</h2>
    <div class="flex justify-center gap-10 mt-6">
      <div class="max-w-sm pb-4">
        <h3 class="font-semibold text-gray-300">Instant Engagement</h3>
        <p class="text-gray-400">
          Our bots respond instantly to your audience, improving interaction rates.
        </p>
      </div>
      <div class="max-w-sm">
        <h3 class="font-semibold text-gray-300">Easy Integration</h3>
        <p class="text-gray-400">
          Set up our bots with a few clicks. No coding experience required.
        </p>
      </div>
      <div class="max-w-sm">
        <h3 class="font-semibold text-gray-300">Proven Results</h3>
        <p class="text-gray-400">Join thousands of users who have boosted their conversions.</p>
      </div>
    </div>
  </section>
</main>
