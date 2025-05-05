<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Button } from '@/shadcn-ui/button'
  import { Input } from '@/shadcn-ui/input/'
  import { cn } from '@/utils'
  import Label from '@/shadcn-ui/label/label.svelte'
  import Checkbox from '@/shadcn-ui/checkbox/checkbox.svelte'
  export let apiAuth: string
  export let error: any

  let email = ''
  let password = ''
  let marketing_consent = true
  let response: Response | undefined
  async function handleSubmit() {
    const res = await router.post(`/${apiAuth}`, { password, email, marketing_consent })
    console.log(res)
    response == res
  }
  let className: string | undefined | null = undefined
  export { className as class }
  let isLoading = false
</script>

<div class={cn('grid gap-6', className)} {...$$restProps}>
  <form on:submit|preventDefault={handleSubmit}>
    {#if error.errors && error.errors.credentials}
      <div class="text-red-500">{error.errors.credentials}</div>
    {/if}
    <div class="grid gap-4">
      <div class="grid gap-2">
        <Label for="email">Bluesky Handle</Label>
        <Input
          bind:value={email}
          id="email"
          placeholder="nallanos.bsky.social"
          autocapitalize="none"
          autocomplete="email"
          autocorrect="off"
          disabled={isLoading}
          required
        />
      </div>

      <div class="grid gap-2 pt-2">
        <Label class="text-white" for="password">App Password</Label>
        <Input
          bind:value={password}
          id="password"
          placeholder="password"
          type="password"
          autocapitalize="none"
          autocomplete="password"
          autocorrect="off"
          required
          disabled={isLoading}
        />
      </div>
      {#if apiAuth != 'login'}
        <div>
          <div class="flex items-center space-x-2">
            <Checkbox id="terms" bind:checked={marketing_consent} />
            <Label for="terms">I agree to receive offers and information by email.</Label>
          </div>
        </div>
      {:else}
        <div class="flex gap-1">
          <a href="/password/reset" class="underline text-sm">Forgot your password ?</a>
        </div>
      {/if}

      <Button type="submit" class="text-white">Submit</Button>
    </div>
  </form>
</div>
