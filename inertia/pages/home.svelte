<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import {
    Lock,
    Sparkles,
    Settings,
    CheckCircle,
    BarChart,
    Zap,
    MessageSquare,
  } from 'lucide-svelte'
  import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/ui/accordion'
</script>

<LayoutLandingPage />
<main class="container mx-auto w-screen">
  <!-- Hero Section Révisée -->
  <section
    class="relative flex flex-col justify-center items-center text-center px-4 pt-8 overflow-hidden w-full"
  >
    <!-- Fond animé -->
    <div class="absolute inset-0 w-full">
      <!-- Lignes animées -->
      <div class="animated-lines w-full"></div>
      <!-- Particules animées -->
      <div class="animated-particles">
        <div
          style="width:4px; height:4px; top:80%; left:10%; animation-duration:12s; animation-delay:0s;"
        ></div>
        <div
          style="width:6px; height:6px; top:60%; left:40%; animation-duration:18s; animation-delay:2s;"
        ></div>
        <div
          style="width:3px; height:3px; top:70%; left:70%; animation-duration:15s; animation-delay:4s;"
        ></div>
        <div
          style="width:5px; height:5px; top:90%; left:30%; animation-duration:20s; animation-delay:1s;"
        ></div>
        <div
          style="width:7px; height:7px; top:50%; left:80%; animation-duration:14s; animation-delay:3s;"
        ></div>
        <!-- Ajoutez d'autres particules si besoin -->
      </div>
    </div>

    <!-- Contenu principal (texte, boutons, etc.) -->
    <div class="max-w-4xl mb-8 relative z-10">
      <div class="mb-6 flex justify-center items-center gap-2">
        <div class="bg-blue-900/30 px-4 py-1 rounded-full text-sm font-medium text-blue-400">
          🚀 Alpha Exclusive - Shape the Future
        </div>
      </div>
      <h1 class="text-4xl md:text-7xl font-bold mb-6 leading-tight">
        Start building and <span
          class="bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent"
          >monetizing</span
        > your bluesky audience
      </h1>
      <p class="text-lg md:text-2xl text-gray-300 mb-8">
        Automate audience growth and monetization -
        <span class="font-semibold text-teal-400">Free during Alpha</span>
      </p>

      <div class="flex flex-col md:flex-row justify-center gap-4 mb-12">
        <Button
          href="/dashboard"
          variant="default"
          class="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all"
          aria-label="Start Free Trial"
        >
          Start Building for Free ➔
        </Button>
      </div>
      <p class="text-gray-300 text-sm">No credit card required - Get instant access</p>
    </div>
  </section>

  <!-- Why Choose Us -->
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold mb-4">Unlock Your Bluesky Potential</h2>
        <p class="text-gray-300">Stop wasting time and money on a dead audience.</p>
      </div>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="p-8 bg-gray-900/20 rounded-xl border border-red-900">
          <div class="text-red-400 text-sm mb-2">The Problem</div>
          <h3 class="text-xl font-bold mb-4">Your Audience is Silent</h3>
          <p class="text-gray-300 mb-4">
            Your posts get ignored, your follower count stagnates, and worst of all, you're losing
            money.
          </p>
          <p class="text-gray-300 mb-4">
            Whether you're a brand or a creator, an inactive audience means wasted effort and missed
            opportunities.
          </p>
        </div>
        <div class="p-8 bg-teal-900/10 rounded-xl border border-teal-800">
          <div class="text-teal-400 text-sm mb-2">Our Solution</div>
          <h3 class="text-xl font-bold mb-4">AI-Driven Engagement</h3>
          <p class="text-gray-300 mb-4">
            Automate interactions, target the right people, and turn your followers into active
            supporters.
          </p>
          <p class="text-gray-300">
            More engagement, more visibility, more revenue—without the manual grind.
          </p>
        </div>
      </div>
    </div>
  </section>

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
  <div class="w-full items-center justify-center flex">
    <Button
      href="/dashboard"
      variant="default"
      class="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all mx-auto"
      aria-label="Start Free Trial"
    >
      Start Building for Free ➔
    </Button>
  </div>
  <!-- How It Works -->
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-16">Simple 3-Step Success</h2>
      <div class="grid md:grid-cols-3 gap-8 text-left">
        <div class="p-6 bg-gray-900/30 rounded-xl">
          <div class="mb-4 text-teal-400 text-2xl">1</div>
          <Settings class="w-12 h-12 text-blue-400 mb-4" />
          <h3 class="text-xl font-bold mb-2">Connect Your Account</h3>
          <p class="text-gray-300">Secure API integration with Bluesky</p>
        </div>
        <div class="p-6 bg-gray-900/30 rounded-xl">
          <div class="mb-4 text-teal-400 text-2xl">2</div>
          <Sparkles class="w-12 h-12 text-purple-400 mb-4" />
          <h3 class="text-xl font-bold mb-2">Activate Tools</h3>
          <p class="text-gray-300">Set up automation in 5 minutes</p>
        </div>
        <div class="p-6 bg-gray-900/30 rounded-xl">
          <div class="mb-4 text-teal-400 text-2xl">3</div>
          <Lock class="w-12 h-12 text-teal-400 mb-4" />
          <h3 class="text-xl font-bold mb-2">Grow Safely</h3>
          <p class="text-gray-300">Compliance-focused automation</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Alpha Benefits Révisé -->
  <section class="py-16">
    <div class="max-w-6xl mx-auto px-4">
      <div class="text-center mb-12">
        <h3 class="text-sm uppercase tracking-widest text-blue-400 mb-4">Alpha Perks</h3>
        <h2 class="text-3xl font-bold mb-6">Help Build the Ultimate Bluesky Tool</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gray-800/20 p-6 rounded-xl border border-blue-800">
          <div class="text-lg font-bold text-blue-400 mb-2">🚀 Early Access</div>
          <p class="text-gray-300">Test new features before anyone else</p>
        </div>
        <div class="bg-gray-800/20 p-6 rounded-xl border border-purple-800">
          <div class="text-lg font-bold text-purple-400 mb-2">💡 Direct Influence</div>
          <p class="text-gray-300">Shape the product roadmap</p>
        </div>
        <div class="bg-gray-800/20 p-6 rounded-xl border border-teal-800">
          <div class="text-lg font-bold text-teal-400 mb-2">🔓 Free Forever</div>
          <p class="text-gray-300">Alpha features remain free for you</p>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->

  <section class="py-20 px-4">
    <div class="max-w-2xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Common Questions</h2>
      <Accordion>
        <AccordionItem value="items-1">
          <AccordionTrigger class="text-lg font-bold text-teal-400 mb-2"
            >Is it really free?</AccordionTrigger
          >
          <AccordionContent class="text-gray-300">
            Yes! All alpha features are completely free during our testing period.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="items-2">
          <AccordionTrigger class="text-lg font-bold text-blue-400 mb-2"
            >How long does setup take?</AccordionTrigger
          >
          <AccordionContent class="text-gray-300">
            Most users connect their Bluesky account in under 5 minutes.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="items-3">
          <AccordionTrigger class="text-lg font-bold text-purple-400 mb-2"
            >Can I provide feedback?</AccordionTrigger
          >
          <AccordionContent class="text-gray-300">
            We actively encourage and prioritize alpha user feedback.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </section>

  <!-- CTA Final -->
  <section class="py-20">
    <div class="max-w-4xl mx-auto text-center px-4">
      <div class="mb-6 text-sm text-teal-400 font-bold">ALPHA ACCESS OPEN</div>
      <h2 class="text-4xl font-bold mb-6">
        Ready to Pioneer the Future of<br />
        <span class="bg-gradient-to-r from-teal-400 to-blue-600 bg-clip-text text-transparent">
          Bluesky Automation?
        </span>
      </h2>
      <div class="mb-8">
        <Button
          href="/dashboard"
          variant="default"
          class="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all"
        >
          Start Building for Free ➔
        </Button>
      </div>
      <p class="text-gray-300 text-sm">No obligations • Cancel anytime • Privacy-first</p>
    </div>
  </section>
</main>

<style>
  :root {
    --particle-color: rgba(255, 255, 255, 0.3);
  }

  /* Animation d'apparition lors du chargement de la page */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .page-load-animation {
    animation: fadeIn 1s ease-out forwards;
  }

  /* Particules spectaculaires animées */
  .animated-particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .animated-particles div {
    position: absolute;
    /* Création d'un effet lumineux grâce à un dégradé radial et une ombre portée */
    background: radial-gradient(circle, #ffffff, var(--particle-color) 70%);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--particle-color);
    opacity: 0;
    animation: move-particle ease-in-out infinite;
  }
  @keyframes move-particle {
    0% {
      transform: translate(var(--start-x), var(--start-y)) scale(0.5);
      opacity: 0;
    }
    25% {
      transform: translate(var(--mid-x), var(--mid-y)) scale(1.2);
      opacity: 1;
    }
    50% {
      transform: translate(var(--mid-x), var(--mid-y)) scale(1);
      opacity: 0.8;
    }
    75% {
      transform: translate(var(--end-x), var(--end-y)) scale(1.2);
      opacity: 1;
    }
    100% {
      transform: translate(var(--end-x), var(--end-y)) scale(0.5);
      opacity: 0;
    }
  }

  /* Définition des trajectoires et caractéristiques pour chaque particule */
  .particle-1 {
    --start-x: 0vw;
    --start-y: 80vh;
    --mid-x: 30vw;
    --mid-y: 40vh;
    --end-x: 60vw;
    --end-y: 0vh;
    width: 4px;
    height: 4px;
    animation-duration: 15s;
    animation-delay: 0s;
  }
  .particle-2 {
    --start-x: 10vw;
    --start-y: 90vh;
    --mid-x: 50vw;
    --mid-y: 50vh;
    --end-x: 90vw;
    --end-y: 10vh;
    width: 6px;
    height: 6px;
    animation-duration: 18s;
    animation-delay: 3s;
  }
  .particle-3 {
    --start-x: 90vw;
    --start-y: 20vh;
    --mid-x: 70vw;
    --mid-y: 40vh;
    --end-x: 50vw;
    --end-y: 60vh;
    width: 3px;
    height: 3px;
    animation-duration: 12s;
    animation-delay: 5s;
  }
  .particle-4 {
    --start-x: 20vw;
    --start-y: 100vh;
    --mid-x: 40vw;
    --mid-y: 70vh;
    --end-x: 60vw;
    --end-y: 40vh;
    width: 5px;
    height: 5px;
    animation-duration: 20s;
    animation-delay: 2s;
  }
  .particle-5 {
    --start-x: 80vw;
    --start-y: 100vh;
    --mid-x: 60vw;
    --mid-y: 70vh;
    --end-x: 40vw;
    --end-y: 40vh;
    width: 7px;
    height: 7px;
    animation-duration: 22s;
    animation-delay: 4s;
  }
</style>
