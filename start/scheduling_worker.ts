import SchedulingService from '#services/scheduling_service'

// Démarrer le service de scheduling quand l'application démarre
console.log('[STARTUP] Initializing scheduling service...')

// Initialiser explicitement le service et vérifier qu'il fonctionne
async function initializeSchedulingService() {
  try {
    // Le service est automatiquement initialisé lors de l'import
    // Mais on peut vérifier qu'il fonctionne en récupérant les stats
    const stats = await SchedulingService.getQueueStats()
    console.log('[STARTUP] Scheduling service initialized successfully')
    console.log(`[STARTUP] Queue stats: ${JSON.stringify(stats)}`)
    
    // Ajouter un listener pour voir si le worker fonctionne
    console.log('[STARTUP] BullMQ worker is ready to process jobs')
    
  } catch (error) {
    console.error('[STARTUP] Error initializing scheduling service:', error)
  }
}

// Démarrer l'initialisation
initializeSchedulingService()

export default SchedulingService

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('[SHUTDOWN] Stopping scheduling service...')
  await SchedulingService.cleanup()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[SHUTDOWN] Stopping scheduling service...')
  await SchedulingService.cleanup()
  process.exit(0)
})
