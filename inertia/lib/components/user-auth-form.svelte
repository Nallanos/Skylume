<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Button } from '@/ui/button'
  import { Input } from '@/ui/input/'
  import { Label } from '@/ui/label/'
  import { cn } from '@/utils'
  export let apiAuth: string
  export let error: any
  const srcLogoBSKY = '../../../resources/images/Bluesky_Logo.png'
  let email = ''
  let password = ''
  let response: Response | undefined
  async function handleSubmit() {
    const res = await router.post(`/${apiAuth}`, { password, email })
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
    <div class="grid gap-2">
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
        />
      </div>

      <div class="grid gap-2 pt-2 pb-4">
        <Label class="text-white" for="password">Password</Label>
        <Input
          bind:value={password}
          id="password"
          placeholder="password"
          type="password"
          autocapitalize="none"
          autocomplete="password"
          autocorrect="off"
          disabled={isLoading}
        />
      </div>

      <Button type="submit" class="text-white">Submit</Button>
    </div>
  </form>
  <div class="relative">
    <div class="absolute inset-0 flex items-center">
      <span class="w-full border-t" />
    </div>
    <div class="relative flex justify-center text-xs uppercase">
      <span class="bg-background text-muted-foreground px-2"> Or continue with </span>
    </div>
  </div>
  <Button variant="outline" type="button" disabled={isLoading} class="flex gap-1 "
    ><img src={srcLogoBSKY} class="size-4" alt="bluesky logo" />BlueSky</Button
  >
</div>
