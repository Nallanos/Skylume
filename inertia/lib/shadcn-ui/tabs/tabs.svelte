<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import { cn } from '@/utils'

  let className: string | undefined | null = undefined
  export { className as class }
</script>

<TabsPrimitive.Root class={cn('', className)} {...$$restProps}>
  <slot />
</TabsPrimitive.Root>
