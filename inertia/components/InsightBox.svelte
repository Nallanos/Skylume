<script lang="ts">
  export let category: string;
  export let insights: any = {};
  
  // Fonction pour formater le titre de la catégorie
  function formatCategory(cat: string) {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
</script>

<div class="bg-white shadow rounded-lg p-4 mb-4">
  <h3 class="text-lg font-semibold mb-2">{formatCategory(category)}</h3>
  
  {#if category === 'audience'}
    <div class="space-y-3">
      {#if insights.topInterests && insights.topInterests.length > 0}
        <div>
          <h4 class="text-sm font-medium text-gray-600">Centres d'intérêt principaux</h4>
          <div class="flex flex-wrap gap-2 mt-1">
            {#each insights.topInterests as interest}
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {interest}
              </span>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if insights.activeHours && insights.activeHours.length > 0}
        <div>
          <h4 class="text-sm font-medium text-gray-600">Heures d'activité</h4>
          <div class="flex flex-wrap gap-2 mt-1">
            {#each insights.activeHours as hour}
              <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                {hour}
              </span>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if insights.demographicTrends}
        <div>
          <h4 class="text-sm font-medium text-gray-600">Résumé</h4>
          <p class="text-sm text-gray-700">{insights.demographicTrends}</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      {#each Object.entries(insights) as [key, value]}
        <div>
          <span class="text-sm font-medium text-gray-600">{key}:</span>
          <span class="text-sm text-gray-700 ml-1">{value}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>