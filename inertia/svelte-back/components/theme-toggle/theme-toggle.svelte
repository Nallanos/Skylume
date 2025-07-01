<script lang="ts">
  import { Moon, Sun } from 'lucide-svelte'
  import { Button } from '@/shadcn-ui/button'
  import { theme } from '../../../stores/theme'
  import { onMount } from 'svelte'

  let mounted = false
  let currentTheme: 'light' | 'dark' = 'dark'

  onMount(() => {
    mounted = true
    const storedTheme = localStorage.getItem('theme') || 'dark'
    currentTheme = storedTheme as 'light' | 'dark'
    theme.setTheme(currentTheme)
  })

  function toggleTheme() {
    theme.toggleTheme()
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  }
</script>

{#if mounted}
  <Button
    variant="ghost"
    size="icon"
    class="w-9 px-0 rounded-full overflow-hidden relative"
    on:click={toggleTheme}
    aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
  >
    <div
      class="absolute inset-0 transition-all duration-500 ease-in-out bg-gradient-to-br {currentTheme ===
      'dark'
        ? 'from-indigo-900/10 to-purple-900/10 opacity-0'
        : 'from-amber-200/20 to-yellow-100/20 opacity-100'}"
    ></div>
    <Sun
      class="h-[1.2rem] w-[1.2rem] transition-all duration-500 {currentTheme === 'dark'
        ? 'rotate-90 scale-0 opacity-0'
        : 'rotate-0 scale-100 opacity-100'} text-amber-500"
    />
    <Moon
      class="absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 {currentTheme === 'dark'
        ? 'rotate-0 scale-100 opacity-100'
        : 'rotate-90 scale-0 opacity-0'} text-indigo-400"
    />
  </Button>
{/if}
