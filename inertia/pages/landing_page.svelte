<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { Handshake, Check, Lock, MessageSquare, Hourglass, Star } from 'lucide-svelte'
</script>

<LayoutLandingPage />
<main class="container pt-10 text-center text-gray-300 gap-8 flex flex-col">
  <section class="flex flex-col items-center gap-4">
    <div class="w-[970px]">
      <h1 class="text-6xl">
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent">Boost</b
        >
        Your Bluesky
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent"
          >Conversions</b
        >
        by
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent">2x</b>
        with Bots That
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent"
          >Engage</b
        > Instantly
      </h1>
      <h3 class="text-xl pt-4">
        30 days free to boost your Bluesky conversions with engaging bots guaranteed
      </h3>
    </div>
    <div class="flex flex-col items-center gap-3">
      <Button
        href="/sign-up"
        variant="default"
        class="w-44 h-10 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-400"
        aria-label="Get Started with Bluesky Bots"
      >
        Join the Waitlist
      </Button>
      <p class="text-gray-400 text-sm">Start your free trial. No credit card required.</p>
    </div>
  </section>

  <section id="features ">
    <div class="bg-dark text-white py-4">
      <div class="max-w-6xl mx-auto px-6">
        <!-- Header Section -->
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold">Everything you need - all in one platform.</h1>
          <p class="text-l text-gray-400">
            From setup to growth - engage effortlessly without leaving Bluesky.
          </p>
        </div>

        <!-- Features Grid -->
        <div
          class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 border border-gray-800 rounded-md p-10"
        >
          <!-- Feature: Chat -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><MessageSquare /></div>
            <h2 class="text-lg font-semibold">Chat</h2>
            <p class="text-gray-400">
              <b>Double engagement</b> with <b>auto-send messages</b> on Bluesky
            </p>
          </div>

          <!-- Feature: Deployments -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><Handshake /></div>
            <h2 class="text-lg font-semibold">Trust</h2>
            <p class="text-gray-400">
              Enhance <b>customer relationships</b> on Bluesky with <b>auto-sent messages</b>,
              delivering instant, <b>personalized responses</b> that build <b>trust</b> and
              <b>loyalty</b>.
            </p>
          </div>

          <!-- Feature: Easy to Use -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><Check /></div>
            <h2 class="text-lg font-semibold">Easy to Use</h2>
            <p class="text-gray-400">
              Easy to set up and simple to use, Bluesky-Copilot makes <b>engagement effortless</b>.
            </p>
          </div>

          <!-- Feature: Risk-free -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><Lock /></div>
            <h2 class="text-lg font-semibold">Risk-free</h2>
            <p class="text-gray-400">
              Experience the full power of Bluesky with a <b>free trial</b> - <b>no commitment</b>,
              just <b>results</b>.
            </p>
          </div>

          <!-- Feature: Time-saving -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><Hourglass /></div>
            <h2 class="text-lg font-semibold">Time-saving</h2>
            <p class="text-gray-400">
              Save precious time by automating <b>routine tasks</b> with Bluesky, allowing you to focus
              on what truly matters.
            </p>
          </div>

          <!-- Feature: Opportunity -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><Star /></div>
            <h2 class="text-lg font-semibold">Opportunity</h2>
            <p class="text-gray-400">
              Effortlessly initiate <b>conversations</b> that you might otherwise miss, ensuring no
              <b>opportunity for engagement</b> is left untapped.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
