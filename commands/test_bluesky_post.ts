import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import AccountService from '#services/account_service'
import Account from '#models/account'
import { AtpAgent } from '@atproto/api'
import fs from 'fs'
import path from 'path'

export default class TestBlueskyPost extends BaseCommand {
  static commandName = 'test:bluesky:post'
  static description = 'Test les nouvelles fonctions de post Bluesky avec images et warnings'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Début des tests des fonctions de post Bluesky')

    try {
      // Récupérer le premier compte disponible
      const account = await Account.first()
      if (!account) {
        this.logger.error('Aucun compte trouvé. Veuillez d\'abord créer un compte.')
        return
      }

      this.logger.info(`Utilisation du compte: ${account.handle}`)

      // Créer une instance du service
      const agent = new AtpAgent({ service: 'https://bsky.social' })
      const accountService = new AccountService(agent)

      // Test 1: Post simple sans image
      this.logger.info('=== Test 1: Post simple sans image ===')
      
      const textPost = await accountService.createPostWithMedia(account, {
        text: '🧪 Test des nouvelles fonctions de post - message simple',
      })

      this.logger.success(`Post texte créé: ${textPost.uri}`)

      // Test 2: Post avec image safe (si l'image existe)
      this.logger.info('=== Test 2: Post avec image safe ===')
      
      const testImagePath = path.join(process.cwd(), 'public', 'images', 'test.jpg')
      
      if (fs.existsSync(testImagePath)) {
        const imageBuffer = fs.readFileSync(testImagePath)
        
        const safePost = await accountService.postSafeContent(
          account,
          '🧪 Test avec image safe',
          [
            {
              file: imageBuffer,
              alt: 'Image de test safe',
              mimeType: 'image/jpeg'
            }
          ]
        )

        this.logger.success(`Post safe avec image créé: ${safePost.uri}`)
      } else {
        this.logger.warning(`Image de test non trouvée: ${testImagePath}`)
        this.logger.info('Création d\'une image de test...')
        
        // Créer le répertoire s'il n'existe pas
        const imagesDir = path.join(process.cwd(), 'public', 'images')
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true })
        }
        
        // Créer une image de test simple (pixel rouge)
        const testImageBuffer = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
        ])
        
        fs.writeFileSync(testImagePath, testImageBuffer)
        this.logger.info('Image de test créée')
      }

      // Test 3: Test avec chemins d'images (ancienne méthode)
      this.logger.info('=== Test 3: Post avec chemins d\'images ===')
      
      try {
        const pathPost = await accountService.postWithImagePaths(
          account,
          '🧪 Test avec chemins d\'images (rétrocompatibilité)',
          ['images/test.jpg'],
          ['Image de test via chemin']
        )

        this.logger.success(`Post avec chemins créé: ${pathPost.uri}`)
      } catch (error) {
        this.logger.error(`Erreur test chemins: ${error.message}`)
      }

      // Test 4: Post NSFW (optionnel - à activer manuellement)
      if (process.env.TEST_NSFW === 'true') {
        this.logger.info('=== Test 4: Post NSFW (TEST_NSFW=true) ===')
        
        try {
          const nsfwPost = await accountService.postNSFWContent(
            account,
            '🧪 Test NSFW avec warning',
            [
              {
                file: fs.readFileSync(testImagePath),
                alt: 'Image de test avec warning NSFW',
                mimeType: 'image/jpeg'
              }
            ],
            'sexual'
          )

          this.logger.success(`Post NSFW créé: ${nsfwPost.uri}`)
        } catch (error) {
          this.logger.error(`Erreur test NSFW: ${error.message}`)
        }
      } else {
        this.logger.info('Test NSFW ignoré (définir TEST_NSFW=true pour l\'activer)')
      }

      this.logger.success('Tous les tests terminés avec succès!')

    } catch (error) {
      this.logger.error(`Erreur lors des tests: ${error.message}`)
      this.logger.error(error.stack)
    }
  }
}
