<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { Zap, Rocket, Sparkles, CheckCircle } from 'lucide-svelte'

  type Plan = {
    title: string
    price: string
    buttonText: string
    features: string[]
    isHighlighted?: boolean
    limit?: string
  }

  const plans: Plan[] = [
    {
      title: 'Alpha Tester',
      price: 'Free',
      buttonText: 'Join Alpha Program',
      limit: 'First 100 users only',
      isHighlighted: true,
      features: [
        '50 automated DMs/month',
        '20 AI-generated posts/month',
        'Basic analytics dashboard',
        'Priority feature requests',
        'Early access to new tools',
        'Community support',
      ],
    },
    {
      title: 'Premium',
      price: '$9/mo',
      buttonText: 'Coming Soon',
      features: [
        'Unlimited automated DMs',
        'Unlimited AI posts',
        'Advanced analytics',
        'Multi-account support',
        'Custom templates',
        '24/7 priority support',
      ],
    },
  ]
</script>

<main class="min-h-screen">
  <LayoutLandingPage />

  <section id="pricing" class="relative pt-12">
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <h2
          class="text-4xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent"
        >
          Simple Pricing for Early Innovators
        </h2>
        <p class="text-gray-400 text-xl max-w-2xl mx-auto">
          Start growing your Bluesky presence risk-free during our alpha phase
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {#each plans as plan}
          <div
            class={`relative p-8 rounded-2xl transition-all duration-300 ${
              plan.isHighlighted
                ? 'border-2 border-teal-500/30 bg-gradient-to-br from-teal-900/20 to-blue-900/20 shadow-xl shadow-teal-500/10'
                : 'border border-gray-800 bg-gray-900/50 hover:border-gray-700'
            }`}
          >
            {#if plan.isHighlighted}
              <div
                class="absolute top-0 right-0 bg-teal-500 text-white px-4 py-1 rounded-bl-lg text-sm"
              >
                Limited Alpha
              </div>
            {/if}

            <div class="mb-6">
              <h3 class="text-2xl font-bold mb-2 flex items-center gap-2">
                {#if plan.isHighlighted}
                  <Rocket class="w-6 h-6 text-teal-400" />
                {:else}
                  <Sparkles class="w-6 h-6 text-blue-400" />
                {/if}
                {plan.title}
              </h3>
              <div class="text-3xl font-bold mb-4">
                {plan.price}
                {#if plan.limit}
                  <span class="block text-sm text-teal-400 mt-1">{plan.limit}</span>
                {/if}
              </div>
            </div>

            <ul class="space-y-3 mb-8">
              {#each plan.features as feature}
                <li class="flex items-start gap-3 text-gray-300">
                  <CheckCircle class="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
                  <span>{feature}</span>
                </li>
              {/each}
            </ul>

            <Button
              variant="outline"
              class={`w-full py-4 text-lg ${
                plan.isHighlighted
                  ? 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700'
                  : 'border-gray-700 text-gray-300 hover:border-blue-500'
              }`}
              href="/sign-up"
            >
              {plan.buttonText}
            </Button>
          </div>
        {/each}
      </div>

      <div class="mt-12 text-center text-gray-400 text-sm">
        <p class="flex items-center justify-center gap-2">
          <Zap class="w-4 h-4 text-yellow-500" />
          Alpha Special: Early users will lock in their pricing plan for life.
        </p>
        <p class="mt-2">No credit card required • Cancel anytime</p>
      </div>
    </div>
  </section>
</main>
