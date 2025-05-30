import type { HttpContext } from '@adonisjs/core/http'

export interface SSEConnection {
  id: string
  accountId: string
  response: any
  isActive: boolean
}

/**
 * Service pour gérer les connexions Server-Sent Events
 */
export class SSEService {
  private connections: Map<string, SSEConnection> = new Map()

  /**
   * Crée une nouvelle connexion SSE
   */
  createConnection(connectionId: string, accountId: string, { response }: HttpContext): SSEConnection {
    // Configuration des headers SSE
    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })

    const connection: SSEConnection = {
      id: connectionId,
      accountId,
      response: response.response,
      isActive: true
    }

    this.connections.set(connectionId, connection)

    // Nettoyage automatique quand la connexion se ferme
    response.response.on('close', () => {
      this.removeConnection(connectionId)
    })

    response.response.on('error', () => {
      this.removeConnection(connectionId)
    })

    return connection
  }

  /**
   * Envoie des données à une connexion spécifique
   */
  sendToConnection(connectionId: string, data: any): boolean {
    const connection = this.connections.get(connectionId)
    if (!connection || !connection.isActive) {
      return false
    }

    try {
      connection.response.write(`data: ${JSON.stringify(data)}\n\n`)
      return true
    } catch (error) {
      console.error(`Error sending SSE data to connection ${connectionId}:`, error)
      this.removeConnection(connectionId)
      return false
    }
  }

  /**
   * Envoie des données à toutes les connexions d'un compte
   */
  sendToAccount(accountId: string, data: any): number {
    let sentCount = 0

    for (const [connectionId, connection] of this.connections) {
      if (connection.accountId === accountId && connection.isActive) {
        if (this.sendToConnection(connectionId, data)) {
          sentCount++
        }
      }
    }

    return sentCount
  }

  /**
   * Ferme une connexion
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection && connection.isActive) {
      try {
        connection.response.end()
      } catch (error) {
        console.error(`Error closing SSE connection ${connectionId}:`, error)
      }
      this.removeConnection(connectionId)
    }
  }

  /**
   * Supprime une connexion de la map
   */
  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.isActive = false
      this.connections.delete(connectionId)
    }
  }

  /**
   * Obtient le nombre de connexions actives
   */
  getActiveConnectionsCount(): number {
    return this.connections.size
  }

  /**
   * Obtient le nombre de connexions pour un compte spécifique
   */
  getAccountConnectionsCount(accountId: string): number {
    let count = 0
    for (const connection of this.connections.values()) {
      if (connection.accountId === accountId && connection.isActive) {
        count++
      }
    }
    return count
  }

  /**
   * Ferme toutes les connexions d'un compte
   */
  closeAccountConnections(accountId: string): void {
    for (const [connectionId, connection] of this.connections) {
      if (connection.accountId === accountId) {
        this.closeConnection(connectionId)
      }
    }
  }
}

// Instance singleton
export const sseService = new SSEService()
