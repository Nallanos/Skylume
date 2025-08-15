import { SchedulingQueueManager } from '../app/services/scheduling_manager.js'
import app from '@adonisjs/core/services/app'

// Démarrer le service de scheduling quand l'application démarre
console.log('[STARTUP] Initializing scheduling service...')

// Initialiser explicitement le service et vérifier qu'il fonctionne
async function initializeSchedulingService() {
  try {
    const schedulingManager = await app.container.make(SchedulingQueueManager)
    await schedulingManager.createAndStartSchedulersQueue()
    
    console.log('[STARTUP] Scheduling queue manager initialized successfully')
    console.log('[STARTUP] BullMQ worker is ready to process jobs')
    
  } catch (error) {
    console.error('[STARTUP] Error initializing scheduling service:', error)
  }
}

// Démarrer l'initialisation si on n'est pas en mode test
if (!app.inTest) {
  initializeSchedulingService()
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Stopping scheduling service...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Stopping scheduling service...')
  process.exit(0)
})
