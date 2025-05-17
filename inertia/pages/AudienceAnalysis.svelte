<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import Cluster from '@/components/Cluster.svelte'
  import { page } from '@inertiajs/svelte'
  import type User from '#models/user'
  import type Account from '#models/account'

  // Props and state variables
  export let account: Account
  export let clusters: {
    id: number
    tag: string
    handles: string[]
    size: number
    accountHandle: string
    superClusterId: number
    embeddings: number[]
    superCluster?: {
      id: number
      tag: string
    }
  }[] = []
  export let superClusters: {
    id: number
    tag: string
    handles: string[]
    size: number
    accountHandle: string
    embeddings: number[]
  }[] = []

  $: user = $page.props.user as User

  // State for UI
  let analysisInProgress = superClusters.length === 0

  // Group clusters by superCluster
  $: groupedClusters = clusters.reduce(
    (groups, cluster) => {
      const superClusterId = cluster.superClusterId
      if (!groups[superClusterId]) {
        groups[superClusterId] = []
      }
      groups[superClusterId].push(cluster)
      return groups
    },
    {} as Record<number, typeof clusters>
  )

  console.log('Clusters:', clusters)
  console.log('Super Clusters:', superClusters)
  console.log('Grouped Clusters:', groupedClusters)
</script>

<div class="flex min-h-screen bg-background">
  <Sidebar {user} />

  <main class="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 max-w-7xl mx-auto w-full">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold gradient-heading">Analyse d'audience</h1>
        <p class="text-muted-foreground mt-1">
          Comprenez mieux votre audience sur Bluesky avec l'analyse de clusters
        </p>
      </div>

      <div class="flex space-x-3 items-center">
        <a
          href="/analytics/{account.id}"
          class="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium"
        >
          Retour aux statistiques
        </a>
      </div>
    </div>

    <!-- Analysis Status -->
    {#if analysisInProgress}
      <div
        class="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center mb-6"
      >
        <h2 class="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-2">
          Analyse en cours...
        </h2>
        <p class="text-blue-700 dark:text-blue-400 mb-4">
          Nous sommes en train d'analyser vos followers pour identifier des groupes d'audience. Ce
          processus peut prendre plusieurs minutes.
        </p>
        <div class="w-full bg-blue-200 dark:bg-blue-700/50 rounded-full h-2.5">
          <div class="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>
    {:else}
      <!-- Super Clusters Display -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Groupes d'audience majeurs</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each superClusters as superCluster}
            <div
              class="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border-l-4 border-indigo-500 dark:border-indigo-400"
            >
              <h3 class="text-lg font-semibold dark:text-white">{superCluster.tag}</h3>
              <div class="mt-2 flex items-center">
                <span
                  class="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-sm rounded-full"
                >
                  {superCluster.size} followers
                </span>
                <span class="mx-2 text-gray-500 dark:text-gray-400">•</span>
                <span class="text-sm text-gray-600 dark:text-gray-300"
                  >{superCluster.handles.length} comptes identifiés</span
                >
              </div>
              <p class="mt-3 text-gray-600 dark:text-gray-300">
                Ce groupe représente une partie significative de votre audience partageant des
                intérêts communs.
              </p>
            </div>
          {/each}
        </div>
      </div>

      <!-- Clusters by Super Cluster -->
      {#each superClusters as superCluster}
        <div class="mb-10">
          <h2 class="text-xl font-semibold mb-3">Sous-groupes dans "{superCluster.tag}"</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#if groupedClusters[superCluster.id]}
              {#each groupedClusters[superCluster.id] as cluster}
                <Cluster
                  tag={cluster.tag}
                  size={cluster.size}
                  handles={cluster.handles}
                  clusterType="existing"
                />
              {/each}
            {:else}
              <p class="text-gray-500 dark:text-gray-400">
                Aucun sous-groupe détecté pour ce groupe principal.
              </p>
            {/if}
          </div>
        </div>
      {/each}

      <!-- Standalone Clusters (without a superCluster) if any -->
      {#if clusters.some((c) => !c.superClusterId)}
        <div class="mb-10">
          <h2 class="text-xl font-semibold mb-3">Groupes indépendants</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each clusters.filter((c) => !c.superClusterId) as cluster}
              <Cluster
                tag={cluster.tag}
                size={cluster.size}
                handles={cluster.handles}
                clusterType="new"
              />
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Insights and Recommendations -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold mb-3 dark:text-white">Recommandations</h2>
      <div class="space-y-4">
        <div class="flex gap-3 items-start">
          <div
            class="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-medium dark:text-white">Créez du contenu ciblé</h3>
            <p class="text-gray-600 dark:text-gray-300">
              Adaptez votre contenu aux centres d'intérêt de vos groupes d'audience principaux pour
              augmenter l'engagement.
            </p>
          </div>
        </div>

        <div class="flex gap-3 items-start">
          <div
            class="p-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-medium dark:text-white">Identifiez des collaborateurs potentiels</h3>
            <p class="text-gray-600 dark:text-gray-300">
              Parcourez les comptes identifiés dans chaque groupe pour trouver des collaborateurs
              pertinents pour votre niche.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  :global(.gradient-heading) {
    background: linear-gradient(to right, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
