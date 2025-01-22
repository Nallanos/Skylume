<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { MessageSquare, Hourglass, Star } from 'lucide-svelte'
</script>

<LayoutLandingPage />
<main class="container pt-10 text-center text-gray-300 gap-8 flex flex-col">
  <section class="flex flex-col items-center gap-4">
    <div class="w-full px-4">
      <h1 class="text-4xl md:text-6xl">
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent"
          >Increase</b
        >
        Your Bluesky
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent">Sales</b
        >
        by
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent">2x</b>
        by marketing on
        <b class="bg-gradient-to-r from-teal-400 to-blue-700 bg-clip-text text-transparent"
          >BlueSky.</b
        >
      </h1>
      <h3 class="text-lg md:text-xl pt-4">30 days free to boost your sales with engaging bots</h3>
    </div>
    <div class="flex flex-col items-center gap-3">
      <Button
        href="/sign-up"
        variant="default"
        class="w-36 md:w-44 h-10 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-400"
        aria-label="Get Started with Bluesky Bots"
      >
        Join the Waitlist
      </Button>
      <p class="text-gray-400 text-sm">Get traction on your start up.</p>
    </div>
  </section>

  <section id="features">
    <div class="bg-dark text-white py-4">
      <div class="max-w-6xl mx-auto px-4 md:px-6">
        <!-- Header Section -->
        <div class="text-center mb-6">
          <h1 class="text-lg md:text-xl font-bold">
            Everything you need for boost your sales on your start up.
          </h1>
          <p class="text-sm md:text-l text-gray-400">
            From setup to growth - engage effortlessly without leaving Bluesky.
          </p>
        </div>

        <!-- Features Grid -->
        <div
          class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 border border-gray-800 rounded-md p-4 md:p-10"
        >
          <!-- Feature: Chat -->
          <div class="text-center">
            <div class="flex justify-center items-center text-2xl"><MessageSquare /></div>
            <h2 class="text-lg font-semibold">Chat</h2>
            <p class="text-gray-400">
              <b>Double engagement</b> with <b>auto-send messages</b> on Bluesky
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

  <section class="flex flex-col items-center gap-12">
    <div class="text-center">
      <h2 class="text-lg font-semibold text-blue-500 uppercase tracking-wide">Key Features</h2>
      <h1 class="mt-2 text-4xl font-extrabold leading-tight">
        Discover the Features That Make Bluesky Bot Stand Out
      </h1>
    </div>
    <div class="justify-center items-center flex max-w-screen-lg mx-auto overflow-hidden w-full">
      <img
        src="resources/images/Dashboard.webp"
        alt="Dashboard preview"
        class="max-w-full border border-gray-800 rounded-md"
      />
      <div class="flex flex-col px-4 mt-4 md:mt-0">
        <h3 class="text-xl font-semibold">Get Customers, Effortlessly.</h3>
        <p class="mt-2 text-sm text-gray-300">
          Get more customers by converting your Bluesky audience into loyal buyers with automated,
          personalized messages that drive real results and boost your growth.
        </p>
      </div>
    </div>
  </section>
</main>
