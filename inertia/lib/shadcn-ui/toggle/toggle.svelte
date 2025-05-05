<script lang="ts">
  import { Toggle as TogglePrimitive } from 'bits-ui'
  import { type Size, type Variant, toggleVariants } from './index.js'
  import { cn } from '@/utils.js'

  type $$Props = TogglePrimitive.Props & {
    variant?: Variant
    size?: Size
  }
  type $$Events = TogglePrimitive.Events

  let className: $$Props['class'] = undefined
  export let variant: $$Props['variant'] = 'default'
  export let size: $$Props['size'] = 'default'
  export let pressed: $$Props['pressed'] = undefined
  export { className as class }
</script>

<!-- toggle.svelte -->
<TogglePrimitive.Root
  bind:pressed
  class={cn(toggleVariants({ variant, size, className }), pressed && 'bg-blue-600 text-white')}
  {...$$restProps}
  on:click
>
  <slot />
</TogglePrimitive.Root>
