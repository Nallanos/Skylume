<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import Button from '@/ui/button/button.svelte'
  import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
  import { Gem, Zap, CheckCircle, ChevronRight } from 'lucide-svelte'
  import Sidebar from '@/components/Sidebar.svelte'
  import type Account from '#models/account'
  import type User from '#models/user'

  let user: User = $page.props.user
  let accounts = user.account as unknown as Account[]
  $: isFreePlan = user.plan === 'free'
  $: isProPlan = user.plan === 'pro'
</script>

<main class="flex md:flex-row min-h-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>

  <div class="flex flex-col w-full flex-2 overflow-hidden pt-6 px-12">
    <header class="flex gap-4 md:py-6">
      <div class="flex flex-col w-full">
        <div class="space-y-1 text-left">
          <h1 class="text-3xl font-bold">Account Plan</h1>
          <p class="text-sm text-gray-400">Manage your subscription and usage</p>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 animate-fade-in-up">
      <!-- Carte Plan Actuel -->
      <Card class="hover:border-blue-400 transition-all duration-300 group relative">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-gray-300">
            Current Plan
            {#if isProPlan}
              <span class="text-blue-400 text-xs ml-1">Active</span>
            {:else}
              <span class="text-gray-400 text-xs ml-1">Basic</span>
            {/if}
          </CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg">
            <Zap class="h-5 w-5 text-white" />
          </div>
        </CardHeader>

        <CardContent>
          <div class="text-3xl font-bold text-blue-400 mb-4">
            {user.plan.toUpperCase()}
          </div>

          {#if isFreePlan}
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2 text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-400" />
                <span>{user.dmsSent}/30 Free DMs per month</span>
              </div>
              <div class="flex items-center gap-2 text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-400" />
                <span>Basic Automation</span>
              </div>
            </div>
          {:else}
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-2 text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-400" />
                <span>Unlimited DMs</span>
              </div>
              <div class="flex items-center gap-2 text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-400" />
                <span>Advanced Automation</span>
              </div>
              <div class="flex items-center gap-2 text-gray-300">
                <CheckCircle class="h-4 w-4 text-green-400" />
                <span>Priority Support</span>
              </div>
            </div>
          {/if}
        </CardContent>
      </Card>

      <!-- Carte Upgrade -->
      <Card class="hover:border-purple-400 transition-all duration-300 group relative">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-gray-300">
            {isFreePlan ? 'Upgrade to Pro' : 'Manage Subscription'}
          </CardTitle>
          <div class="relative p-2 bg-gradient-to-br from-purple-600 to-purple-400 rounded-lg">
            <Gem class="h-5 w-5 text-white" />
          </div>
        </CardHeader>

        <CardContent>
          {#if isFreePlan}
            <div class="space-y-4">
              <div class="text-gray-300 text-sm">
                <p class="mb-3">Get full access to all Pro features:</p>
                <ul class="space-y-2">
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-400" />
                    Unlimited Auto DMs
                  </li>
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-400" />
                    Multiple Accounts
                  </li>
                  <li class="flex items-center gap-2">
                    <ChevronRight class="h-4 w-4 text-purple-400" />
                    Advanced Analytics
                  </li>
                </ul>
              </div>

              <Button
                on:click={async () => {
                  await router.post('/create-stripe-session')
                }}
                class="w-full mt-4 bg-purple-500 hover:bg-purple-400 transition-colors"
              >
                Upgrade to Pro - $4.99/mo
              </Button>
            </div>
          {:else}
            <div class="text-gray-300 text-sm space-y-4">
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
                class="w-full"
                variant="outline"
                color="red"
              >
                Downgrade to Free
              </Button>
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>
  </div>
</main>
