<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Card from '@/ui/card/card.svelte'
  import CardHeader from '@/ui/card/card-header.svelte'
  import { Key, ShieldCheck, Loader, UserPlus } from 'lucide-svelte'
  import { page } from '@inertiajs/svelte'
  import Button from '@/ui/button/button.svelte'
  import Input from '@/ui/input/input.svelte'
  import AlertTitle from '@/ui/alert/alert-title.svelte'
  import AlertDescription from '@/ui/alert/alert-description.svelte'
  import Alert from '@/ui/alert/alert.svelte'
  import CardContent from '@/ui/card/card-content.svelte'
  import CardTitle from '@/ui/card/card-title.svelte'
  let token_app_password = ''
  let bksy_social = ''
  $: isLoading = false

  function handleSubmit() {
    isLoading = true
    router.put(
      '/account',
      { bksy_social, token_app_password },
      {
        onFinish: () => (isLoading = false),
      }
    )
  }
</script>

<div class="max-w-3xl mx-auto space-y-8 animate-fade-in">
  <!-- Hero Section -->
  <div class="text-center space-y-4">
    <h1
      class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
    >
      Connect Your Bluesky Account
    </h1>
    <p class="text-gray-300 text-lg">Secure integration using app passwords for granular control</p>
  </div>

  <!-- Steps Container -->
  <div class="space-y-12">
    <!-- Step 1 -->
    <Card class="hover:border-blue-400 transition-colors">
      <CardHeader class="flex flex-row items-center space-x-4">
        <div class="p-3 bg-blue-400/10 rounded-full">
          <Key class="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <CardTitle class="text-xl">Step 1: Create App Password</CardTitle>
          <p class="text-gray-400">Settings → Advanced → App Passwords</p>
        </div>
      </CardHeader>
      <CardContent class="grid md:grid-cols-2 gap-6 items-center">
        <div class="space-y-2">
          <p class="text-gray-300">
            1. Enable <strong>Direct Messages</strong> access<br />
            2. Copy generated token
          </p>
        </div>
        <img
          src="../../resources/images/CreateAppPassword.png"
          alt="App password setup"
          class="rounded-xl border border-gray-700 shadow-xl hover:shadow-2xl transition-shadow"
        />
      </CardContent>
    </Card>

    <!-- Step 2 -->
    <Card class="hover:border-purple-400 transition-colors">
      <CardHeader class="flex flex-row items-center space-x-4">
        <div class="p-3 bg-purple-400/10 rounded-full">
          <ShieldCheck class="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <CardTitle class="text-xl">Step 2: Authorize Access</CardTitle>
          <p class="text-gray-400">Securely link your account</p>
        </div>
      </CardHeader>
      <CardContent class="space-y-6">
        {#if $page.props.errors}
          <Alert variant="destructive" class="text-red-500">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{$page.props.errors.credentials}</AlertDescription>
          </Alert>
        {/if}

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-gray-300">Bluesky Handle</h3>
            <Input
              bind:value={bksy_social}
              placeholder="yourhandle.bsky.social"
              required
              class="bg-gray-800 border-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div class="space-y-2">
            <h3 class="text-sm font-medium text-gray-300">App Password</h3>
            <Input
              type="password"
              bind:value={token_app_password}
              placeholder="Paste your token here"
              required
              class="bg-gray-800 border-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <Button type="submit" class="w-full group" disabled={isLoading}>
            {#if isLoading}
              <Loader class="h-4 w-4 mr-2 animate-spin" />
            {:else}
              <UserPlus class="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
            {/if}
            Secure Connection
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
