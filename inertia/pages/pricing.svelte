<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  import { Rocket, Sparkles, CheckCircle, X } from 'lucide-svelte'

  type PlanFeature = {
    text: string
    included: boolean
  }

  type Plan = {
    title: string
    price: string
    buttonText: string
    features: PlanFeature[]
    isHighlighted?: boolean
    limit?: string
  }

  const plans: Plan[] = [
    {
      title: 'Starter',
      price: 'Free',
      buttonText: 'Get Started',
      features: [
        { text: '30 automated DMs/month', included: true },
        { text: '5 scheduled posts at a time.', included: true },
        { text: 'Basic analytics dashboard', included: true },
        { text: 'Limited bot actions (auto-reply, follow-back)', included: true },
        { text: 'Community support', included: true },
        { text: 'Unlimited automated DMs', included: false },
        { text: 'Unlimited scheduled posts', included: false },
        { text: 'Massive DM campaigns', included: false },
      ],
    },
    {
      title: 'Pro',
      price: '$4.99/mo',
      buttonText: 'Upgrade to Pro',
      isHighlighted: true,
      features: [
        { text: 'Unlimited automated DMs', included: true },
        { text: 'Unlimited scheduled posts', included: true },
        { text: 'Massive DM campaigns', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Full bot automation (auto-reply, follow-back, etc.)', included: true },
        { text: 'Priority support', included: true },
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
                  {#if feature.included}
                    <CheckCircle class="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
                  {:else}
                    <X class="w-5 h-5 text-red-400/80 flex-shrink-0 mt-1" />
                  {/if}
                  <span class={feature.included ? '' : 'text-gray-500'}>{feature.text}</span>
                </li>
              {/each}
            </ul>

            <div class="flex h-full">
              <Button
                variant="outline"
                class={`w-full py-4 mt-full text-lg ${
                  plan.isHighlighted
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700'
                    : 'border-gray-700 text-gray-300 hover:border-blue-500'
                }`}
                href="/dashboard"
              >
                {plan.buttonText}
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
</main>
