import { Server } from 'socket.io'
import http from 'node:http'

class WebSocketService {
  private io: Server | null = null
  
  init(httpServer: http.Server) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // À configurer selon vos besoins de sécurité
        methods: ['GET', 'POST']
      }
    })
    
    this.io.on('connection', (socket) => {
      console.log('Client connecté:', socket.id)
      
      socket.on('subscribe-to-account', (accountId: string) => {
        console.log(`Client ${socket.id} souscrit aux mises à jour pour le compte ${accountId}`)
        socket.join(`account-${accountId}`)
      })
      
      // Gestion du ping pour tester la connexion
      socket.on('ping', (data: any) => {
        console.log(`Ping reçu du client ${socket.id}:`, data)
        socket.emit('pong', {
          message: 'Pong du serveur',
          receivedAt: new Date().toISOString(),
          originalMessage: data
        })
      })
      
      socket.on('disconnect', () => {
        console.log('Client déconnecté:', socket.id)
      })
    })
    
    console.log('Service WebSocket initialisé')
    return this.io
  }
  
  getIO() {
    if (!this.io) {
      throw new Error('WebSocket non initialisé')
    }
    return this.io
  }
  
  // Méthode pour émettre des événements aux clients
  emit(event: string, data: any, room?: string) {
    if (!this.io) {
      console.log('Tentative d\'émission sans WebSocket initialisé')
      return
    }
    
    if (room) {
      console.log(`Émission de l'événement "${event}" vers la salle "${room}"`)
      this.io.to(room).emit(event, data)
    } else {
      console.log(`Émission de l'événement "${event}" à tous les clients`)
      this.io.emit(event, data)
    }
  }
}

export default new WebSocketService()