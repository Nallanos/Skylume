<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { MessageSquare, Zap, BarChart, Cloud, CheckCircle, Users } from 'lucide-svelte'
</script>

<LayoutLandingPage />

<main class="container mx-auto text-gray-300">
  <!-- Hero Section -->
  <section class="min-h-screen flex flex-col justify-center items-center text-center px-4">
    <div class="max-w-4xl mb-8">
      <div class="mb-6 flex justify-center items-center gap-2">
        <div class="bg-blue-900/30 px-4 py-1 rounded-full text-sm font-medium text-blue-400">
          🚀 Currently in Alpha - Join the Movement
        </div>
      </div>
      <h1 class="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        Start building and <span
          class="bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent"
          >monetizing</span
        >
        your bluesky audience
      </h1>
      <p class="text-xl md:text-2xl text-gray-400 mb-8">
        Automate your Bluesky sales with AI-powered tools -
        <span class="font-semibold text-teal-400">Free 30-day trial, no credit card required</span>
      </p>

      <div class="flex flex-col md:flex-row justify-center gap-4 mb-12">
        <Button
          href="/sign-up"
          variant="default"
          class="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all"
          aria-label="Start Free Trial"
        >
          Join the Alpha Program ➔
        </Button>
      </div>

      <div class="flex flex-col md:flex-row justify-center gap-6 text-gray-400 text-sm">
        <div class="flex items-center gap-2">
          <CheckCircle class="w-4 h-4 text-teal-400" />
          <span>5-minute setup</span>
        </div>
        <div class="flex items-center gap-2">
          <Cloud class="w-4 h-4 text-blue-400" />
          <span>Automatic synchronization</span>
        </div>
        <div class="flex items-center gap-2">
          <Users class="w-4 h-4 text-purple-400" />
          <span>Daily updates & improvements</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold mb-4">Your Bluesky Growth Engine</h2>
        <p class="text-gray-400 text-xl">Everything you need to convert your audience</p>
      </div>

      <div class="grid md:grid-cols-3 gap-12">
        <!-- Feature 1 -->
        <div
          class="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-blue-500 transition-all"
        >
          <MessageSquare class="w-12 h-12 text-blue-400 mb-6" />
          <h3 class="text-2xl font-bold mb-4">Automated Personalized DMs</h3>
          <p class="text-gray-400 mb-6">
            Convert new followers into leads with
            <span class="text-blue-400">AI-powered personalized messages</span>
          </p>
          <ul class="space-y-3 text-gray-400">
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Customizable templates</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Smart delay between messages</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Conversion tracking</span>
            </li>
          </ul>
        </div>

        <!-- Feature 2 -->
        <div
          class="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-purple-500 transition-all"
        >
          <Zap class="w-12 h-12 text-purple-400 mb-6" />
          <h3 class="text-2xl font-bold mb-4">AI Content Generation</h3>
          <p class="text-gray-400 mb-6">
            Create engaging posts with
            <span class="text-purple-400">AI trained on viral content patterns</span>
          </p>
          <ul class="space-y-3 text-gray-400">
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Content scheduling</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Performance analytics</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Hashtag suggestions</span>
            </li>
          </ul>
        </div>

        <!-- Feature 3 -->
        <div
          class="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-teal-500 transition-all"
        >
          <BarChart class="w-12 h-12 text-teal-400 mb-6" />
          <h3 class="text-2xl font-bold mb-4">Advanced Analytics</h3>
          <p class="text-gray-400 mb-6">
            Track your performance with
            <span class="text-teal-400">real-time dashboards</span>
          </p>
          <ul class="space-y-3 text-gray-400">
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Campaign ROI tracking</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Best time to post analysis</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-400" />
              <span>Custom alerts</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Early Adopter Benefits -->

  <section class="py-16">
    <div class="max-w-6xl mx-auto px-4">
      <div class="text-center mb-12">
        <h3 class="text-sm uppercase tracking-widest text-blue-400 mb-4">Why Join the Alpha?</h3>
        <h2 class="text-3xl font-bold mb-6">Shape the Future of Bluesky Automation</h2>
        <p class="text-gray-400 max-w-2xl mx-auto">
          As an alpha user, you'll get exclusive benefits and direct influence on product
          development
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gray-800/20 p-6 rounded-xl border border-gray-700">
          <div class="text-2xl font-bold text-teal-400 mb-4">1. Lifetime Discount</div>
          <p class="text-gray-400">
            Alpha users will receive special pricing that will never increase
          </p>
        </div>
        <div class="bg-gray-800/20 p-6 rounded-xl border border-gray-700">
          <div class="text-2xl font-bold text-blue-400 mb-4">2. Direct Influence</div>
          <p class="text-gray-400">Your feedback will shape the product roadmap and features</p>
        </div>
        <div class="bg-gray-800/20 p-6 rounded-xl border border-gray-700">
          <div class="text-2xl font-bold text-purple-400 mb-4">3. Early Access</div>
          <p class="text-gray-400">Be the first to access new features before public release</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-20 to-teal-900/20">
    <div class="max-w-4xl mx-auto text-center px-4">
      <h2 class="text-4xl font-bold mb-6">
        Ready to <span class="text-teal-400">supercharge your Bluesky growth</span>?
      </h2>
      <p class="text-xl text-gray-300 mb-8">
        Join our alpha program and help shape the future of Bluesky automation
      </p>
      <Button
        href="/sign-up"
        class="h-16 px-12 text-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 rounded-lg"
      >
        Join the Alpha Program
      </Button>
      <p class="mt-4 text-sm text-gray-400">No credit card required - Cancel anytime</p>
    </div>
  </section>
</main>
