<script lang="ts">
  import Layout from '@/components/layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { Input } from '../lib/ui/input/'
  import { page } from '@inertiajs/svelte'
  let token_app_password = ''
  let bksy_social = ''
  function handleSubmit() {
    router.put('/settings', { bksy_social, token_app_password })
  }
</script>

<Layout />
<main class="container pt-12 justify-center items-center w-2/3 flex px-0">
  <div class="border border-gray-800 rounded-md w-full px-4">
    <div>
      <h1 class="text-2xl font-semibold pt-4">Link your bluesky account with appPassword</h1>
      <p class="py-2">
        We've chosen to implement appPasswords to provide seamless, secure access without
        compromising your main account credentials. With appPasswords, you stay in control—easily
        generating and revoking passwords for each app, ensuring your data stays safe while enjoying
        a hassle-free experience.
      </p>
      <div class="py-2">
        <h3 class="font-medium text-lg">Step 1: Create an appPassword in your bluesky account</h3>
        <p>
          Go to Settings, scroll to appPassword, create one and allow access to your direct
          messages.
        </p>
        <div class="w-full flex justify-center">
          <img
            src="../../resources/images/CreateAppPassword.png"
            class="rounded-3xl py-4 w-[30%]"
            alt="Create App Password"
          />
        </div>
        <p>Bluesky will then give you a unique token.</p>
        <h3 class="font-medium text-lg pt-2">Step 2: Give us the authorization</h3>
        <p>Copy and paste the token and your Bluesky social here:</p>
        {#if $page.props.errors && $page.props.errors.credentials == 'Invalid social or password'}
          <p class="text-red-500">{$page.props.errors.credentials}</p>
        {/if}
        <form on:submit|preventDefault={handleSubmit}>
          <div class="flex flex-col space-y-2 pt-2">
            <Input
              type="text"
              bind:value={bksy_social}
              placeholder="nallanos.bsky.social"
              required
              class="w-full p-2 border rounded-md"
            />
            <Input
              type="password"
              bind:value={token_app_password}
              placeholder="Write the token here"
              required
              class="w-full p-2 border rounded-md"
            />
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >Add app protection</button
            >
          </div>
        </form>
        <h3 class="font-medium text-lg py-6">
          Final step: See your connected accounts on the dashboard!
        </h3>
      </div>
    </div>
  </div>
</main>
