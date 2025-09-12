import type { HttpContext } from '@adonisjs/core/http'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'

export default class DockerController {
  // Secret de sécurité pour les opérations Docker
  private readonly DOCKER_SECRET = 'b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2'

  /**
   * Vérifie le secret Docker dans les headers ou le body
   */
  private verifyDockerSecret(request: any): boolean {
    const secretFromHeader = request.header('X-Docker-Secret')
    const secretFromBody = request.input('secret')
    const providedSecret = secretFromHeader || secretFromBody

    return providedSecret === this.DOCKER_SECRET
  }

  /**
   * Parse le payload selon le content type
   */
  private parseRequestPayload(request: any): any {
    const contentType = request.header('Content-Type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Pour les formulaires URL-encoded, utiliser request.all() qui parse automatiquement
      return request.all()
    } else {
      // Pour JSON et autres formats, utiliser request.body()
      return request.body()
    }
  }

  /**
   * Endpoint pour rebuild l'image de l'application
   * POST /api/docker/rebuild
   * Headers: X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   * OU Body: { "secret": "b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2" }
   */
  public async rebuild({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker (remplace l'authentification pour cet endpoint)
      if (!this.verifyDockerSecret(request)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret field in body'
        })
      }
      
      const result = await this.executeDockerRebuild()
      
      return response.ok({
        success: true,
        message: 'Application rebuild completed successfully',
        ...result
      })
    } catch (error) {
      console.error('Docker rebuild error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to rebuild application',
        details: error.message
      })
    }
  }

  /**
   * Endpoint pour un rebuild complet (build.sh)
   * POST /api/docker/full-rebuild
   * Headers: X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   * OU Body: { "secret": "b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2" }
   */
  public async fullRebuild({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker (remplace l'authentification pour cet endpoint)
      if (!this.verifyDockerSecret(request)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret field in body'
        })
      }

      const result = await this.executeDockerFullRebuild()
      
      return response.ok({
        success: true,
        message: 'Full application rebuild completed successfully',
        ...result
      })
    } catch (error) {
      console.error('Docker full rebuild error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to perform full rebuild',
        details: error.message
      })
    }
  }

  /**
   * Endpoint pour obtenir le statut des containers
   * GET /api/docker/status
   * Headers: X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   * OU Query: ?secret=b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   */
  public async status({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker (remplace l'authentification pour cet endpoint)
      const secretFromQuery = request.input('secret')
      if (!this.verifyDockerSecret(request) && (!secretFromQuery || secretFromQuery !== this.DOCKER_SECRET)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret query parameter'
        })
      }

      const status = await this.getDockerStatus()
      
      return response.ok({
        success: true,
        containers: status
      })
    } catch (error) {
      console.error('Docker status error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to get container status',
        details: error.message
      })
    }
  }

  /**
   * Endpoint pour obtenir les logs de l'application
   * GET /api/docker/logs
   * Headers: X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   * OU Query: ?secret=b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   */
  public async logs({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker (remplace l'authentification pour cet endpoint)
      const secretFromQuery = request.input('secret')
      if (!this.verifyDockerSecret(request) && (!secretFromQuery || secretFromQuery !== this.DOCKER_SECRET)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret query parameter'
        })
      }

      const lines = request.input('lines', 50) // Nombre de lignes par défaut
      const logs = await this.getAppLogs(lines)
      
      return response.ok({
        success: true,
        logs: logs
      })
    } catch (error) {
      console.error('Docker logs error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to get application logs',
        details: error.message
      })
    }
  }

  /**
   * Endpoint spécifique pour les webhooks GitHub
   * POST /api/docker/github-webhook
   * Content-Type: application/json OU application/x-www-form-urlencoded
   * GitHub envoie le secret via X-Hub-Signature-256
   */
  public async githubWebhook({ response, request }: HttpContext) {
    try {
      // GitHub utilise X-Hub-Signature-256, mais on peut aussi accepter notre format
      const githubSignature = request.header('X-Hub-Signature-256')
      const directSecret = request.header('X-Docker-Secret') || request.input('secret')
      
      // Vérifier le secret direct (plus simple pour les tests)
      if (directSecret === this.DOCKER_SECRET) {
        console.log('GitHub webhook: Direct secret validation successful')
      } else if (githubSignature) {
        // TODO: Implémenter la validation HMAC GitHub si nécessaire
        // Pour l'instant, on accepte si le header existe
        console.log('GitHub webhook: GitHub signature detected:', githubSignature?.substring(0, 10) + '...')
      } else {
        return response.forbidden({ 
          error: 'Invalid webhook secret',
          hint: 'Provide GitHub signature or direct secret'
        })
      }

      // Analyser le payload selon le content type
      const payload = this.parseRequestPayload(request)
      const eventType = request.header('X-GitHub-Event')
      const contentType = request.header('Content-Type') || 'unknown'
      
      console.log('GitHub webhook received:', {
        event: eventType,
        contentType: contentType,
        ref: payload?.ref,
        repository: payload?.repository?.name
      })

      // Décider du type de rebuild selon l'événement
      let result
      if (eventType === 'release' || payload?.ref === 'refs/heads/main' || payload?.ref === 'refs/heads/master') {
        console.log('Triggering full rebuild for main branch or release')
        result = await this.executeDockerFullRebuild()
      } else {
        console.log('Triggering quick rebuild for development push')
        result = await this.executeDockerRebuild()
      }
      
      return response.ok({
        success: true,
        message: 'GitHub webhook processed successfully',
        webhook_info: {
          event: eventType,
          content_type: contentType,
          ref: payload?.ref,
          rebuild_type: (eventType === 'release' || payload?.ref?.includes('main') || payload?.ref?.includes('master')) ? 'full' : 'quick'
        },
        ...result
      })
    } catch (error) {
      console.error('GitHub webhook error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to process GitHub webhook',
        details: error.message
      })
    }
  }

  /**
   * Endpoint pour vérifier l'état du service app
   * GET /api/docker/app-status
   */
  public async appStatus({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker
      const secretFromQuery = request.input('secret')
      if (!this.verifyDockerSecret(request) && (!secretFromQuery || secretFromQuery !== this.DOCKER_SECRET)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret query parameter'
        })
      }

      const isAppActive = await this.checkAppServiceActive()
      const isAppRunning = await this.checkAppServiceRunning()
      
      return response.ok({
        success: true,
        app_service: {
          active_in_compose: isAppActive,
          running: isAppRunning,
          status: isAppActive 
            ? (isAppRunning ? 'running' : 'stopped') 
            : 'disabled_in_compose'
        }
      })
    } catch (error) {
      console.error('Docker app status error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to check app status',
        details: error.message
      })
    }
  }

  /**
   * Endpoint pour nettoyer le système Docker sans rebuild
   * POST /api/docker/clean
   * Headers: X-Docker-Secret: b3f7c9a1d4e8f2b6c0a9d1e4f5b8c7a2
   */
  public async clean({ response, request }: HttpContext) {
    try {
      // Vérifier le secret Docker
      if (!this.verifyDockerSecret(request)) {
        return response.forbidden({ 
          error: 'Invalid Docker secret',
          hint: 'Provide the secret in X-Docker-Secret header or secret field in body'
        })
      }

      const startTime = Date.now()
      
      console.log('🧹 Starting Docker system cleanup...')
      await this.executeDockerSystemPrune()
      
      const duration = Date.now() - startTime
      
      return response.ok({
        success: true,
        message: 'Docker system cleaned successfully',
        duration,
        cleaned: [
          'Unused containers',
          'Unused networks', 
          'Unused images',
          'Unused volumes',
          'Build cache'
        ]
      })
    } catch (error) {
      console.error('Docker clean error:', error)
      return response.internalServerError({
        success: false,
        error: 'Failed to clean Docker system',
        details: error.message
      })
    }
  }

  /**
   * Exécute le script de rebuild rapide
   */
  private async executeDockerRebuild(): Promise<{ output: string; duration: number }> {
    const startTime = Date.now()
    const scriptPath = path.join(process.cwd(), 'rebuild.sh')
    
    // Vérifier que le script existe
    try {
      await fs.access(scriptPath)
    } catch {
      throw new Error('Rebuild script not found')
    }

    return new Promise(async (resolve, reject) => {
      try {
        // D'abord nettoyer le système Docker
        console.log('🧹 Cleaning Docker system before rebuild...')
        await this.executeDockerSystemPrune()
        console.log('✅ Docker system cleaned successfully')

        const childProcess = spawn('bash', [scriptPath], {
          cwd: process.cwd(),
          stdio: 'pipe'
        })

        let output = '🧹 Docker system cleaned\n'
        let errorOutput = ''

        childProcess.stdout?.on('data', (data: Buffer) => {
          output += data.toString()
        })

        childProcess.stderr?.on('data', (data: Buffer) => {
          errorOutput += data.toString()
        })

        childProcess.on('close', (code: number | null) => {
          const duration = Date.now() - startTime
          
          if (code === 0) {
            resolve({
              output: output + errorOutput,
              duration
            })
          } else {
            reject(new Error(`Rebuild failed with code ${code}: ${errorOutput}`))
          }
        })

        childProcess.on('error', (error: Error) => {
          reject(error)
        })
      } catch (cleanError) {
        reject(new Error(`Docker system clean failed: ${cleanError.message}`))
      }
    })
  }

  /**
   * Exécute le script de rebuild complet
   */
  private async executeDockerFullRebuild(): Promise<{ output: string; duration: number }> {
    const startTime = Date.now()
    const scriptPath = path.join(process.cwd(), 'build.sh')
    
    try {
      await fs.access(scriptPath)
    } catch {
      throw new Error('Build script not found')
    }

    return new Promise(async (resolve, reject) => {
      try {
        // D'abord nettoyer le système Docker
        console.log('🧹 Cleaning Docker system before full rebuild...')
        await this.executeDockerSystemPrune()
        console.log('✅ Docker system cleaned successfully')

        const childProcess = spawn('bash', [scriptPath], {
          cwd: process.cwd(),
          stdio: 'pipe'
        })

        let output = '🧹 Docker system cleaned\n'
        let errorOutput = ''

        childProcess.stdout?.on('data', (data: Buffer) => {
          output += data.toString()
        })

        childProcess.stderr?.on('data', (data: Buffer) => {
          errorOutput += data.toString()
        })

        childProcess.on('close', (code: number | null) => {
          const duration = Date.now() - startTime
          
          if (code === 0) {
            resolve({
              output: output + errorOutput,
              duration
            })
          } else {
            reject(new Error(`Full rebuild failed with code ${code}: ${errorOutput}`))
          }
        })

        childProcess.on('error', (error: Error) => {
          reject(error)
        })
      } catch (cleanError) {
        reject(new Error(`Docker system clean failed: ${cleanError.message}`))
      }
    })
  }

  /**
   * Obtient le statut des containers Docker
   */
  private async getDockerStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('docker-compose', ['ps', '--format', 'json'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      })

      let output = ''
      let errorOutput = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString()
      })

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            // Parse JSON output from docker-compose ps
            const lines = output.trim().split('\n').filter(line => line.trim())
            const containers = lines.map(line => JSON.parse(line))
            resolve(containers)
          } catch (parseError) {
            // Fallback to text format if JSON parsing fails
            resolve({ raw: output })
          }
        } else {
          reject(new Error(`Docker status failed: ${errorOutput}`))
        }
      })

      childProcess.on('error', (error: Error) => {
        reject(error)
      })
    })
  }

  /**
   * Obtient les logs de l'application
   */
  private async getAppLogs(lines: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('docker-compose', ['logs', '--tail', lines.toString(), 'app'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      })

      let output = ''
      let errorOutput = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString()
      })

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(output)
        } else {
          // Si le service app n'existe pas, retourner un message informatif
          if (errorOutput.includes('no such service: app')) {
            resolve('ℹ️  Service "app" not currently active in docker-compose.yaml\n\nAvailable services:\n- postgresql\n- redis\n- reverse-proxy\n\nTo activate the app service, uncomment it in docker-compose.yaml or use the full-rebuild endpoint.')
          } else {
            reject(new Error(`Failed to get logs: ${errorOutput}`))
          }
        }
      })

      childProcess.on('error', (error: Error) => {
        reject(error)
      })
    })
  }

  /**
   * Vérifie si le service app est activé dans docker-compose.yaml
   */
  private async checkAppServiceActive(): Promise<boolean> {
    try {
      const content = await fs.readFile(path.join(process.cwd(), 'docker-compose.yaml'), 'utf-8')
      // Vérifier si "app:" n'est pas commenté
      return !content.includes('  # app:')
    } catch (error) {
      return false
    }
  }

  /**
   * Vérifie si le service app est en cours d'exécution
   */
  private async checkAppServiceRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess = spawn('docker-compose', ['ps', '-q', 'app'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      })

      let output = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      childProcess.on('close', (code: number | null) => {
        // Si code 0 et output non vide, le service existe et tourne
        resolve(code === 0 && output.trim().length > 0)
      })

      childProcess.on('error', () => {
        resolve(false)
      })
    })
  }

  /**
   * Exécute docker system prune -af pour nettoyer complètement le système
   */
  private async executeDockerSystemPrune(): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['system', 'prune', '-af'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      })

      let output = ''
      let errorOutput = ''

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString()
      })

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('Docker system prune output:', output)
          resolve()
        } else {
          reject(new Error(`Docker system prune failed with code ${code}: ${errorOutput}`))
        }
      })

      childProcess.on('error', (error: Error) => {
        reject(error)
      })
    })
  }
}