/**
 * WebSocket configuration file 
 * Uses Socket.IO for real-time communication
 */

import server from '@adonisjs/core/services/server'
import websocketService from '../app/services/websocket_service.js'

// Initialize WebSocket after HTTP server has booted
server.booted(() => {
  const httpServer = server.nodeServer
  if (httpServer) {
    websocketService.init(httpServer)
  } else {
    console.error('Failed to initialize WebSocket: HTTP server not available')
  }
})

export default websocketService