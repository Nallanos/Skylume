<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '@/utils.js'

  type $$Props = HTMLAttributes<HTMLDivElement>

  let className: $$Props['class'] = undefined
  export { className as class }
</script>

<div
  class={cn(
    'bg-card text-card-foreground rounded-xl border-0 shadow-[0_0_0_1px_rgba(var(--card-border-rgb),0.1),0_2px_5px_0_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_1px_rgba(var(--card-border-rgb),0.15),0_2px_5px_0_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.2),0_3px_10px_0_rgba(0,0,0,0.06)] dark:hover:shadow-[0_0_0_1px_rgba(var(--primary-rgb),0.25),0_3px_10px_0_rgba(0,0,0,0.1)]',
    className
  )}
  {...$$restProps}
>
  <slot />
</div>

<style>
  :global(:root) {
    --card-border-rgb: 226, 232, 240;
    --primary-rgb: 79, 70, 229;
  }
  :global(.dark) {
    --card-border-rgb: 51, 65, 85;
    --primary-rgb: 99, 102, 241;
  }
</style>
