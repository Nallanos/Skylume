<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { CheckCircle, BarChart, Zap, MessageSquare } from 'lucide-svelte'
  import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/ui/accordion'

  let showMore = false
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
        Automate audience growth and monetization
      </p>

      <div class="flex flex-col md:flex-row justify-center gap-4 mb-12">
        <Button
          href="/dashboard"
          variant="default"
          class="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all"
          aria-label="Start Free Trial"
        >
          Try it for free
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
      Try it for free
    </Button>
  </div>

  <!-- Video Demo Section -->
  <section class="py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <!-- Video Container -->
        <div
          class="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800"
        >
          <video
            class="w-full aspect-video object-cover opacity-90"
            src="public/videos/FINAL.mp4"
            autoplay
            muted
            loop
            playsinline
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <!-- Text Content -->
        <div class="space-y-6">
          <h2 class="text-3xl md:text-4xl font-bold leading-tight">
            Transform Your Bluesky Strategy
            <span class="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent"
              >in 90 Seconds</span
            >
          </h2>
          <p class="text-lg text-gray-300">
            See how our AI-powered platform helps you automate engagement and grow your audience
            effortlessly. This quick demo shows:
          </p>
          <ul class="space-y-4">
            <li class="flex items-start gap-3">
              <CheckCircle class="w-6 h-6 text-teal-400 flex-shrink-0" />
              <span class="text-gray-300">How to set up bots in 3 clicks</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckCircle class="w-6 h-6 text-teal-400 flex-shrink-0" />
              <span class="text-gray-300">Effortless message scheduling</span>
            </li>
          </ul>
          <Button
            href="/dashboard"
            variant="default"
            class="h-12 px-8 text-lg rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all"
          >
            Try it for free
          </Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Titre section -->
      <h2
        class="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent"
      >
        They also loved it...
      </h2>

      <!-- Grille de témoignages -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Témoignage 1 -->
        <div class="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
          <div class="space-y-4">
            <!-- Auteur -->
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center"
                >
                  <img
                    class="rounded-full"
                    src="public/images/bafkreihdgxviv4vxx7dv4zfwhjylkmbharti2s7jhlndmu4nswpwhk677e.jpg"
                    alt="Alexis Bouchez"
                  />
                </div>
              </div>
              <div>
                <a
                  href="https://bsky.app/profile/alexisbouchez.com"
                  class="text-blue-400 hover:text-blue-300 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @alexisbouchez.com
                </a>
                <p class="text-sm text-gray-400">Founder</p>
              </div>
            </div>

            <!-- Citation -->
            <blockquote class="text-lg italic text-gray-300">
              "Making use of BlueskyBot is a great way to grow and engage with your audience on
              Bluesky."
            </blockquote>
          </div>
        </div>

        <!-- Témoignage 2 (exemple vide à dupliquer) -->
        <div class="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center"
                >
                  <img src="public/images/pdpDemon.jpg" alt="" class="rounded-full" />
                </div>
              </div>
              <div>
                <p class="text-blue-400 hover:text-blue-300 transition-colors">
                  @dem...ny.bsky.social
                </p>
                <p class="text-sm text-gray-400">Content creator</p>
              </div>
            </div>

            <div class="space-y-2">
              <blockquote class="text-lg italic text-gray-300">
                "I started using the Bluesky bot to help grow my platform, and honestly, it’s been a
                game changer."
              </blockquote>
              {#if showMore}
                <blockquote class="text-lg italic text-gray-300">
                  "I can never go back to not using it. It's very user-friendly. Just go through the
                  options, find the one you want, and you're done. There’s no complicated code you
                  need to understand or anything."
                </blockquote>

                <blockquote class="text-lg italic text-gray-300">
                  "If you want to connect with your community but don’t have a lot of time (or even
                  if you do), I’d really recommend testing it out."
                </blockquote>
              {/if}
            </div>

            <button
              class="mt-4 text-blue-400 hover:text-blue-300 transition-colors text-sm"
              on:click={() => (showMore = !showMore)}
            >
              {showMore ? 'See less...' : 'See more...'}
            </button>
          </div>
        </div>

        <!-- Témoignage 3 (exemple vide à dupliquer) -->
        <div class="p-6 bg-gray-800/30 rounded-xl border border-gray-700">
          <div class="space-y-4">
            <!-- Auteur -->
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div
                  class="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center"
                >
                  <img class="rounded-full" src="public/images/nallanos.jpg" alt="Alexis Bouchez" />
                </div>
              </div>
              <div>
                <a
                  href="https://bsky.app/profile/nallanos.bsky.social"
                  class="text-blue-400 hover:text-blue-300 underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @nallanos.bsky.social
                </a>
                <p class="text-sm text-gray-400">Founder</p>
              </div>
            </div>

            <!-- Citation -->
            <blockquote class="text-lg italic text-gray-300">
              "I use the tool myself on a daily basis, and each update is designed to make the
              experience even smoother."
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Alpha Benefits Révisé -->
  <section class="py-16 flex flex-col just w-full">
    <div class="mx-auto px-4 w-full flex flex-col">
      <div class="text-center mb-12">
        <h3 class="text-sm uppercase tracking-widest text-blue-400 mb-4">Alpha Perks</h3>
        <h2 class="text-3xl font-bold mb-6">Help Build the Ultimate Bluesky Tool</h2>
      </div>
      <div class=" gap-8 flex justify-center">
        <div class="bg-gray-800/20 w-1/3 p-6 rounded-xl border border-blue-800">
          <div class="text-lg font-bold text-blue-400 mb-2">🚀 Early Access</div>
          <p class="text-gray-300">Test new features before anyone else</p>
        </div>
        <div class="bg-gray-800/20 p-6 w-1/3 rounded-xl border border-purple-800">
          <div class="text-lg font-bold text-purple-400 mb-2">💡 Direct Influence</div>
          <p class="text-gray-300">Shape the product roadmap</p>
        </div>
      </div>
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
          Try it for free
        </Button>
      </div>
      <p class="text-gray-300 text-sm">No obligations • Cancel anytime • Privacy-first</p>
    </div>
  </section>
</main>
<footer class="border-t border-gray-800 pt-12 mt-16">
  <div class="container mx-auto px-4">
    <div class="py-8 flex flex-col md:flex-row justify-between items-start gap-8">
      <!-- Colonne de gauche -->
      <div class="text-center md:text-left mb-8 md:mb-0">
        <div class="mb-3">
          <span
            class="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent"
          >
            Bluesky Tools
          </span>
        </div>
        <p class="text-gray-400 text-sm">
          © 2024 Made with ❤️ par
          <a href="https://x.com/Nallan0s" class="hover:text-teal-400 transition-colors"
            >@Nallan0s</a
          >
        </p>
      </div>

      <!-- Quick Links + FAQ -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
        <!-- Quick Links -->
        <div>
          <h3 class="text-lg font-bold text-teal-400 mb-4">Quick Links</h3>
          <ul class="space-y-3">
            <li>
              <a href="/terms" class="text-gray-400 hover:text-teal-400 transition-colors">Terms</a>
            </li>
            <li>
              <a href="/privacy" class="text-gray-400 hover:text-teal-400 transition-colors"
                >Privacy</a
              >
            </li>
            <li>
              <a href="/pricing" class="text-gray-400 hover:text-teal-400 transition-colors"
                >Pricing</a
              >
            </li>
          </ul>
        </div>

        <!-- FAQ -->
        <div>
          <h3 class="text-lg font-bold text-teal-400 mb-4">FAQ</h3>
          <Accordion>
            <AccordionItem value="items-1">
              <AccordionTrigger class="text-base font-semibold text-blue-400">
                Is it really free?
              </AccordionTrigger>
              <AccordionContent class="text-gray-300 text-sm">
                Yes! During the alpha phase, all features are available at no cost. Our goal is to
                gather valuable feedback and improve the platform while allowing users to experience
                its full potential without any financial commitment.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="items-2">
              <AccordionTrigger class="text-base font-semibold text-purple-400">
                How long does it take to set up?
              </AccordionTrigger>
              <AccordionContent class="text-gray-300 text-sm">
                Setting up typically takes less than five minutes for most users. We have designed
                the process to be as intuitive and seamless as possible, requiring minimal
                configuration. Should you need assistance, our support team is available to guide
                you through the setup.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="items-3">
              <AccordionTrigger class="text-base font-semibold text-teal-400">
                Is it secure?
              </AccordionTrigger>
              <AccordionContent class="text-gray-300 text-sm">
                Absolutely. Security is our top priority. We implement industry-standard encryption
                and best practices to protect your data. Our infrastructure is regularly updated and
                monitored to prevent vulnerabilities, and we do not share your information with
                third parties. If you have specific security concerns, feel free to contact our team
                for more details.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <!-- Liens sociaux -->
      <div class="flex space-x-6 mt-8 md:mt-0">
        <!-- Lien Bluesky -->
        <a
          href="https://bsky.app/profile/nallan0s.bsky.social"
          class="p-2 rounded-lg hover:bg-gray-800/30 transition-all group relative"
          aria-label="Bluesky"
        >
          <!-- Icône Bluesky (conservée) -->
        </a>

        <!-- Lien X -->
        <a
          href="https://x.com/Nallan0s"
          class="p-2 rounded-lg hover:bg-gray-800/30 transition-all group relative"
          aria-label="X"
        >
          <!-- Icône X (conservée) -->
        </a>
      </div>
    </div>
  </div>
</footer>

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
</style>
