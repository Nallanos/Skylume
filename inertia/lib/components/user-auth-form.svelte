<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Button } from '@/ui/button'
  import { Input } from '@/ui/input/'
  import { cn } from '@/utils'
  import Label from '@/ui/label/label.svelte'
  import Checkbox from '@/ui/checkbox/checkbox.svelte'
  page.URL
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
        <Label for="email">Email</Label>
        <Input
          bind:value={email}
          id="email"
          placeholder="name@example.com"
          type="email"
          autocapitalize="none"
          autocomplete="email"
          autocorrect="off"
          disabled={isLoading}
          required
        />
      </div>

      <div class="grid gap-2 pt-2">
        <Label class="text-white" for="password">Password</Label>
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
  <!-- <Button variant="outline" type="button" disabled={isLoading} class="flex gap-1 "
    ><img src={srcLogoBSKY} class="size-4" alt="bluesky logo" />BlueSky</Button
  > -->
</div>
