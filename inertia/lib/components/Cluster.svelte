<script lang="ts">
  export let tag: string
  export let size: number
  export let handles: string[] = []
  export let clusterType: string = 'unknown'

  let showHandles = false

  function toggleHandles() {
    showHandles = !showHandles
  }

  // Définir la couleur de fond en fonction du type de cluster
  let clusterColorClass = ''
  switch (clusterType) {
    case 'new':
      clusterColorClass = 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
      break
    case 'existing':
      clusterColorClass = 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
      break
    default:
      clusterColorClass = 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  }
</script>

<div class={`p-4 rounded-lg border ${clusterColorClass} mb-4`}>
  <div class="flex justify-between items-center">
    <h3 class="text-lg font-semibold dark:text-white">{tag}</h3>
    <span
      class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full"
      >{size} followers</span
    >
  </div>

  <div class="mt-2 flex justify-between items-center">
    <span class="text-sm text-gray-600 dark:text-gray-300">
      {#if clusterType === 'new'}
        Nouveau cluster
      {:else if clusterType === 'existing'}
        Cluster existant
      {:else}
        Type: {clusterType}
      {/if}
    </span>

    {#if handles && handles.length > 0}
      <button
        class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        on:click={toggleHandles}
      >
        {showHandles ? 'Masquer' : 'Voir'} les comptes ({handles.length})
      </button>
    {/if}
  </div>

  {#if showHandles && handles && handles.length > 0}
    <div
      class="mt-3 p-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700 max-h-40 overflow-y-auto"
    >
      <ul class="text-sm">
        {#each handles.slice(0, 10) as handle}
          <li
            class="mb-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
          >
            @{handle}
          </li>
        {/each}
        {#if handles.length > 10}
          <li class="text-gray-500 dark:text-gray-400 italic">
            + {handles.length - 10} autres comptes
          </li>
        {/if}
      </ul>
    </div>
  {/if}
</div>
