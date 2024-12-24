<script lang="ts">
  import LayoutLandingPage from '@/components/layoutLandingPage.svelte'
  import Button from '@/ui/button/button.svelte'
  // Typescript support for plan data
  type Plan = {
    title: string
    price: string
    buttonText: string
    features: string[]
    isDemo?: boolean
  }

  const plans: Plan[] = [
    {
      title: 'Premium',
      price: 'Pay as you go',
      buttonText: 'Coming Soon',
      features: [
        'Advanced auto-send with personalized messaging',
        'Detailed analytics to track engagement and growth',
        'Priority support to resolve any issues promptly',
        'Unlimited access to all advanced features',
      ],
    },
  ]
</script>

<LayoutLandingPage />
<section id="pricing" class="text-white flex items-center justify-center pt-10">
  <div class="flex gap-6 px-4">
    {#each plans as plan}
      <div
        class={`rounded-lg p-6 border border-gray-800 flex flex-col justify-between transform transition-transform hover:scale-105`}
      >
        <div>
          <h2 class="text-2xl font-bold mb-4">{plan.title}</h2>
          <p class="text-2xl font-extrabold mb-4">{plan.price}</p>
          <ul class="space-y-2 text-sm">
            {#each plan.features as feature}
              <li class="flex items-center space-x-2">
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </div>
        <Button
          variant="default"
          class={`mt-6 px-4 py-2 text-sm font-bold rounded bg-blue-500 text-white${
            plan.isDemo ? 'border border-white hover:bg-white' : 'bg-white hover:bg-blue-400'
          }`}
        >
          {plan.buttonText}
        </Button>
      </div>
    {/each}
  </div>
</section>
