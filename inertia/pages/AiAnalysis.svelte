<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { page } from '@inertiajs/svelte';
import { io } from 'socket.io-client';
import InsightBox from '../components/InsightBox.svelte';
import ContentSuggestion from '../components/ContentSuggestion.svelte';
import Cluster from '../components/Cluster.svelte';

// Données initiales des props Inertia
let account_insights = $page.props.account_insights || [];
let content_suggestions = $page.props.content_suggestions || [];
let clusters = $page.props.clusters || [];
let accountId = $page.props.accountId;

// État local pour les notifications WebSocket
let wsConnected = false;
let notifications = [];
let socket;

onMount(() => {
  // Initialisation de la connexion WebSocket
  try {
    socket = io(window.location.origin);
    
    socket.on('connect', () => {
      console.log('WebSocket connecté!');
      wsConnected = true;
      
      // Abonnement aux mises à jour du compte actuel
      if (accountId) {
        socket.emit('subscribe-to-account', accountId);
        console.log(`Abonné aux mises à jour du compte ${accountId}`);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket déconnecté');
      wsConnected = false;
    });
    
    // Écouter les mises à jour des clusters
    socket.on('clusters:update', (data) => {
      console.log('Nouveaux clusters reçus via WebSocket:', data);
      
      if (data.accountId === accountId) {
        // Ajouter les nouveaux clusters à la liste existante
        clusters = [...clusters, ...data.clusters];
        
        // Ajouter une notification
        notifications = [...notifications, {
          message: `${data.clusters.length} nouveaux clusters reçus!`,
          timestamp: new Date().toLocaleTimeString()
        }];
      }
    });
    
    // Ajouter l'écouteur de pong
    socket.on('pong', (data) => {
      console.log('Pong reçu du serveur:', data);
      
      // Ajouter une notification pour le pong
      notifications = [...notifications, {
        message: `Pong reçu: ${data.message}`,
        timestamp: new Date().toLocaleTimeString(),
        success: true
      }];
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du WebSocket:', error);
  }
});

onDestroy(() => {
  // Fermeture propre de la connexion WebSocket
  if (socket) {
    socket.disconnect();
  }
});

// Méthode pour tester manuellement la connexion WebSocket
function testWebSocketConnection() {
  if (socket && socket.connected) {
    console.log('Test de la connexion WebSocket en envoyant un message au serveur');
    socket.emit('ping', { message: 'Test du client', timestamp: new Date().toISOString() });
    
    notifications = [...notifications, {
      message: 'Ping envoyé au serveur',
      timestamp: new Date().toLocaleTimeString()
    }];
  } else {
    notifications = [...notifications, {
      message: 'WebSocket non connecté',
      timestamp: new Date().toLocaleTimeString(),
      error: true
    }];
  }
}

// Méthode pour effacer les notifications
function clearNotifications() {
  notifications = [];
}
</script>

<svelte:head>
  <title>AI Analysis - Bluesky Copilot</title>
</svelte:head>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">AI Insights Analysis</h1>
  
  <!-- Indicateur de statut WebSocket -->
  <div class="mb-4 flex items-center">
    <div class={`h-3 w-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
    <span class="text-sm">{wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}</span>
    <button 
      class="ml-4 px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600" 
      on:click={testWebSocketConnection}
    >
      Test Connection
    </button>
    
    {#if notifications.length > 0}
      <button 
        class="ml-2 px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600" 
        on:click={clearNotifications}
      >
        Clear Notifications
      </button>
    {/if}
  </div>
  
  <!-- Notifications WebSocket -->
  {#if notifications.length > 0}
    <div class="mb-6 p-4 bg-gray-100 rounded-lg max-h-40 overflow-y-auto">
      <h3 class="font-semibold mb-2">Real-time Updates</h3>
      {#each notifications as notification}
        <div class={`p-2 mb-1 rounded 
          ${notification.error ? 'bg-red-100' : ''} 
          ${notification.success ? 'bg-green-100' : ''} 
          ${!notification.error && !notification.success ? 'bg-blue-100' : ''}`
        }>
          <span class="font-medium">{notification.timestamp}:</span> {notification.message}
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Insights de l'audience -->
    <section>
      <h2 class="text-xl font-semibold mb-3">Audience Insights</h2>
      {#each account_insights as insight}
        <InsightBox category={insight.category} insights={insight.insights} />
      {/each}
    </section>
    
    <!-- Suggestions de contenu -->
    <section>
      <h2 class="text-xl font-semibold mb-3">Content Suggestions</h2>
      {#each content_suggestions as suggestion}
        <ContentSuggestion 
          title={suggestion.title}
          description={suggestion.description}
          type={suggestion.type}
        />
      {/each}
    </section>
  </div>
  
  <!-- Clusters identifiés -->
  <section class="mt-8">
    <h2 class="text-xl font-semibold mb-3">Identified Clusters</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each clusters as cluster}
        <Cluster 
          tag={cluster.tag}
          size={cluster.size}
          handles={cluster.handles}
          clusterType={cluster.clusterType || 'unknown'}
        />
      {/each}
    </div>
  </section>
</div>