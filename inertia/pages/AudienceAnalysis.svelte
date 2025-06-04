<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import Cluster from '@/components/Cluster.svelte'
  import { page } from '@inertiajs/svelte'
  import { onMount, onDestroy } from 'svelte'
  import { router } from '@inertiajs/svelte'
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
  export let analysisStatus: {
    id: number
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'stopped'
    progress: {
      analyzed: number
      total: number
      percentage: number
    }
    startedAt: string | null
    completedAt: string | null
    errorMessage: string | null
  } | null = null

  $: user = $page.props.user as User

  let isStartingAnalysis = false
  let isStoppingAnalysis = false
  let analysisError = ''
  let eventSource: EventSource | null = null

  // Reactive statements
  $: isAnalysisInProgress =
    analysisStatus && ['pending', 'in_progress'].includes(analysisStatus.status)
  $: hasCompletedAnalysis = analysisStatus && analysisStatus.status === 'completed'
  $: hasFailedAnalysis = analysisStatus && analysisStatus.status === 'failed'
  $: hasStoppedAnalysis = analysisStatus && analysisStatus.status === 'stopped'

  // SSE Functions
  function startSSEConnection() {
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource(`/api/accounts/${account.id}/follower-analysis/stream`)

    eventSource.onmessage = (event) => {
      try {
        const newStatus = JSON.parse(event.data)

        if (newStatus.error) {
          console.error('SSE Error:', newStatus.error)
          return
        }

        // Mettre à jour le statut local
        if (newStatus.status !== 'no_analysis') {
          analysisStatus = newStatus

          // Si l'analyse est terminée, rediriger vers la page complète après un délai
          if (newStatus.status === 'completed') {
            setTimeout(() => {
              router.visit(`/analytics/${account.id}/audience`, { replace: true })
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // Reconnexion automatique après 5 secondes en cas d'erreur
      setTimeout(() => {
        if (isAnalysisInProgress) {
          startSSEConnection()
        }
      }, 5000)
    }

    eventSource.onopen = () => {
      console.log('SSE connection opened')
    }
  }

  function stopSSEConnection() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  // Lifecycle hooks
  onMount(() => {
    if (isAnalysisInProgress) {
      startSSEConnection()
    }
  })

  onDestroy(() => {
    stopSSEConnection()
  })

  // Analysis control functions
  async function startAnalysis() {
    if (isStartingAnalysis) return

    isStartingAnalysis = true
    analysisError = ''

    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      const result = await response.json()

      if (response.ok && result.status === 'success') {
        // Créer un nouvel analysisStatus depuis la réponse
        analysisStatus = {
          id: result.analysisId,
          status: 'pending',
          progress: { analyzed: 0, total: result.estimatedTotal || 0, percentage: 0 },
          startedAt: new Date().toISOString(),
          completedAt: null,
          errorMessage: null,
        }
        startSSEConnection() // Démarrer SSE au lieu du polling
      } else {
        analysisError = result.message || "Erreur lors du démarrage de l'analyse"
      }
    } catch (error) {
      console.error("Erreur lors du démarrage de l'analyse:", error)
      analysisError = 'Erreur de connexion. Veuillez réessayer.'
    } finally {
      isStartingAnalysis = false
    }
  }

  async function stopAnalysis() {
    if (isStoppingAnalysis || !analysisStatus) return

    isStoppingAnalysis = true

    try {
      const response = await fetch(`/api/accounts/${account.id}/follower-analysis/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      const result = await response.json()

      if (response.ok && result.status === 'success') {
        analysisStatus.status = 'stopped'
        stopSSEConnection() // Arrêter SSE au lieu du polling
      } else {
        analysisError = result.message || "Erreur lors de l'arrêt de l'analyse"
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt de l'analyse:", error)
      analysisError = 'Erreur de connexion. Veuillez réessayer.'
    } finally {
      isStoppingAnalysis = false
    }
  }

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

    <!-- Analysis Status Section -->
    {#if isAnalysisInProgress}
      <div
        class="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-blue-800 dark:text-blue-300">
            {analysisStatus?.status === 'pending' ? 'Analyse en attente...' : 'Analyse en cours...'}
          </h2>
          <button
            on:click={stopAnalysis}
            disabled={isStoppingAnalysis}
            class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            {#if isStoppingAnalysis}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Arrêt...
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
              </svg>
              Arrêter
            {/if}
          </button>
        </div>

        <p class="text-blue-700 dark:text-blue-400 mb-4">
          {#if analysisStatus?.status === 'pending'}
            Votre analyse a été ajoutée à la file d'attente et sera traitée sous peu.
          {:else}
            Nous analysons vos followers pour identifier des groupes d'audience. Ce processus peut
            prendre plusieurs minutes.
          {/if}
        </p>

        {#if analysisStatus?.progress}
          <div class="space-y-2">
            <div class="flex justify-between text-sm text-blue-700 dark:text-blue-400">
              <span
                >Progression : {analysisStatus.progress.analyzed} / {analysisStatus.progress.total} followers</span
              >
              <span>{analysisStatus.progress.percentage.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-blue-200 dark:bg-blue-700/50 rounded-full h-2.5">
              <div
                class="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300"
                style="width: {analysisStatus.progress.percentage}%"
              ></div>
            </div>
          </div>
        {:else}
          <div class="w-full bg-blue-200 dark:bg-blue-700/50 rounded-full h-2.5">
            <div class="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full animate-pulse w-1/4"></div>
          </div>
        {/if}

        {#if analysisStatus?.startedAt}
          <p class="text-xs text-blue-600 dark:text-blue-300 mt-3">
            Démarrée le {new Date(analysisStatus.startedAt).toLocaleString('fr-FR')}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Analysis Failed/Stopped Status -->
    {#if hasFailedAnalysis || hasStoppedAnalysis}
      <div
        class="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6"
      >
        <div class="flex items-center gap-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-red-600 dark:text-red-400"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <h2 class="text-xl font-semibold text-red-800 dark:text-red-300">
            {hasFailedAnalysis ? 'Analyse échouée' : 'Analyse arrêtée'}
          </h2>
        </div>

        <p class="text-red-700 dark:text-red-400 mb-4">
          {#if hasFailedAnalysis}
            L'analyse de votre audience a rencontré une erreur et n'a pas pu être complétée.
          {:else}
            L'analyse de votre audience a été arrêtée manuellement.
          {/if}
        </p>

        {#if analysisStatus?.errorMessage}
          <div
            class="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 mb-4"
          >
            <p class="text-sm text-red-800 dark:text-red-300">
              <strong>Détail de l'erreur :</strong>
              {analysisStatus.errorMessage}
            </p>
          </div>
        {/if}

        <button
          on:click={startAnalysis}
          disabled={isStartingAnalysis}
          class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {#if isStartingAnalysis}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Redémarrage...
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
            Relancer l'analyse
          {/if}
        </button>
      </div>
    {/if}

    <!-- Analysis Completed Status -->
    {#if hasCompletedAnalysis && superClusters.length === 0}
      <div
        class="bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6"
      >
        <div class="flex items-center gap-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-green-600 dark:text-green-400"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22,4 12,14.01 9,11.01"></polyline>
          </svg>
          <h2 class="text-xl font-semibold text-green-800 dark:text-green-300">Analyse terminée</h2>
        </div>

        <p class="text-green-700 dark:text-green-400 mb-4">
          L'analyse de votre audience est terminée, mais aucun groupe significatif n'a été détecté.
          Cela peut arriver si votre audience est très homogène ou si vous avez peu de followers.
        </p>

        {#if analysisStatus?.completedAt}
          <p class="text-xs text-green-600 dark:text-green-300">
            Terminée le {new Date(analysisStatus.completedAt).toLocaleString('fr-FR')}
          </p>
        {/if}
      </div>
    {/if}
    <!-- Super Clusters Display -->
    {#if superClusters.length > 0}
      <!-- Analysis Success Summary -->
      {#if hasCompletedAnalysis}
        <div
          class="bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6"
        >
          <div class="flex items-center gap-3 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-green-600 dark:text-green-400"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
            <h2 class="text-xl font-semibold text-green-800 dark:text-green-300">
              Analyse terminée avec succès !
            </h2>
          </div>

          <p class="text-green-700 dark:text-green-400 mb-3">
            Nous avons identifié {superClusters.length} groupe{superClusters.length > 1 ? 's' : ''} principal{superClusters.length >
            1
              ? 'aux'
              : ''} dans votre audience avec un total de {clusters.length} sous-groupe{clusters.length >
            1
              ? 's'
              : ''}.
          </p>

          <div class="flex flex-wrap gap-4 text-sm">
            {#if analysisStatus?.progress}
              <div class="flex items-center gap-2 text-green-600 dark:text-green-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>{analysisStatus.progress.analyzed} followers analysés</span>
              </div>
            {/if}
            {#if analysisStatus?.completedAt}
              <div class="flex items-center gap-2 text-green-600 dark:text-green-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                <span
                  >Terminée le {new Date(analysisStatus.completedAt).toLocaleString('fr-FR')}</span
                >
              </div>
            {/if}
          </div>

          <div class="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
            <button
              on:click={startAnalysis}
              disabled={isStartingAnalysis}
              class="bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Relancer l'analyse
            </button>
          </div>
        </div>
      {/if}

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
    {/if}

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

    <!-- Start Analysis Button (only show if no analysis exists or if last analysis was completed/failed/stopped) -->
    {#if !analysisStatus || (!isAnalysisInProgress && superClusters.length === 0)}
      <div
        class="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center mb-6"
      >
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {!analysisStatus ? "Analyse d'audience non disponible" : 'Lancer une nouvelle analyse'}
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {!analysisStatus
            ? "Démarrez une analyse pour découvrir les groupes dans votre audience et comprendre leurs centres d'intérêt."
            : 'Relancez une analyse pour obtenir des données plus récentes sur votre audience.'}
        </p>
        <button
          on:click={startAnalysis}
          class="bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-900 text-white font-semibold rounded-lg px-6 py-3 transition-all flex items-center justify-center gap-2 mx-auto"
          disabled={isStartingAnalysis}
        >
          {#if isStartingAnalysis}
            <svg
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Démarrage de l'analyse...
          {:else}
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
              class="mr-2"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6"></path>
              <path d="m9 9 3-3 3 3"></path>
              <path d="m9 15 3 3 3-3"></path>
            </svg>
            {!analysisStatus ? "Démarrer l'analyse d'audience" : "Relancer l'analyse"}
          {/if}
        </button>

        {#if analysisError}
          <p class="mt-3 text-red-600 dark:text-red-400 text-sm">
            {analysisError}
          </p>
        {/if}
      </div>
    {/if}
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
