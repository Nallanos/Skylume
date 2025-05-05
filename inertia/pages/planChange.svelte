<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import Button from '@/shadcn-ui/button/button.svelte'
  import * as Card from '@/shadcn-ui/card'
  import { Gem, Zap, CheckCircle, ChevronRight } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import type User from '#models/user'

  let user: User = $page.props.user
  $: isFreePlan = user.plan === 'free'
  $: isProPlan = user.plan === 'pro'
</script>

<main class="flex md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
  <Sidebar {user} />

  <div class="flex flex-col w-full flex-2 overflow-hidden pt-8 px-6 md:px-12 md:ml-[220px]">
    <header class="mb-8">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold mb-1 text-foreground">Account Plan</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">Manage your subscription and usage</p>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      <!-- Carte Plan Actuel -->
      <Card.Card
        class="border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-400 transition-all duration-300 bg-white dark:bg-gray-800 shadow-sm"
      >
        <Card.CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.CardTitle class="text-sm font-medium text-gray-900 dark:text-gray-300">
            Current Plan
            {#if isProPlan}
              <span class="text-blue-600 text-xs ml-1">Active</span>
            {:else}
              <span class="text-gray-700 text-xs ml-1">Basic</span>
            {/if}
          </Card.CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Zap class="h-5 w-5 text-white" />
          </div>
        </Card.CardHeader>

        <Card.CardContent>
          <div class="text-3xl font-bold text-blue-500 mb-4">
            {#if isFreePlan}FREE{:else}PRO{/if}
          </div>

          {#if isFreePlan}
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-500" />
                <span>{user.dmsSent}/30 Free DMs per month</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-500" />
                <span>Basic Automation</span>
              </div>
            </div>
          {:else}
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-500" />
                <span>Unlimited DMs</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-500" />
                <span>Advanced Automation</span>
              </div>
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-500" />
                <span>Priority Support</span>
              </div>
            </div>
          {/if}
        </Card.CardContent>
      </Card.Card>

      <!-- Carte Upgrade -->
      <Card.Card
        class="border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-400 transition-all duration-300 bg-white dark:bg-gray-800 shadow-sm"
      >
        <Card.CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.CardTitle class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isFreePlan ? 'Upgrade to Pro' : 'Manage Subscription'}
          </Card.CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <Gem class="h-5 w-5 text-white" />
          </div>
        </Card.CardHeader>

        <Card.CardContent>
          {#if isFreePlan}
            <div class="space-y-4">
              <div class="text-gray-600 dark:text-gray-300 text-sm">
                <p class="mb-3">Get full access to all Pro features:</p>
                <ul class="space-y-2">
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-500" />
                    Unlimited Auto DMs
                  </li>
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-500" />
                    Multiple Accounts
                  </li>
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-500" />
                    Advanced Analytics
                  </li>
                </ul>
              </div>

              <Button
                on:click={async () => {
                  await router.post('/create-stripe-session')
                }}
                class="w-full mt-4 bg-purple-500 hover:bg-purple-400 transition-colors text-white py-2 rounded-md font-medium"
              >
                Upgrade to Pro - $4.99/mo
              </Button>
            </div>
          {:else}
            <div class="text-gray-600 dark:text-gray-300 text-sm space-y-4">
              <p>
                Your Pro subscription is active. Manage your billing information or downgrade to
                Free plan.
              </p>
              <Button
                on:click={async () => {
                  {
                    if (
                      !confirm(
                        'Are you sure you want to downgrade to Free plan? Your Pro features will be disabled immediately.'
                      )
                    )
                      return
                    await router.post('/downgrade-plan')
                  }
                }}
                class="w-full border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-md font-medium transition-all"
              >
                Downgrade to Free
              </Button>
            </div>
          {/if}
        </Card.CardContent>
      </Card.Card>
    </div>
  </div>
</main>
