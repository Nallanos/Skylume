<script lang="ts">
  // Define props for the component
  export let size: 'sm' | 'md' | 'lg' = 'md'
  export let color: string = 'text-blue-500'

  // Map sizes to classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  // Get the appropriate class based on the size prop
  $: spinnerClass = sizeClasses[size]
</script>

<div class="inline-flex items-center justify-center">
  <div
    class={`animate-spin rounded-full border-2 border-t-transparent ${spinnerClass} ${color}`}
  ></div>
</div>

<style>
  /* Optional: You can add additional styling here if needed */
</style>
