import AccountService from './account_service.js';
import Account from '#models/account';
import { AtpAgent } from '@atproto/api';
import fs from 'fs';
import path from 'path';

/**
 * Exemples d'utilisation des nouvelles fonctions de post avec images et warnings
 */

export async function exampleUsage() {
  try {
    // Récupérer un compte depuis la base de données
    const account = await Account.findOrFail(1); // Remplacez par l'ID du compte souhaité
    
    // Créer une instance du service
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    const accountService = new AccountService(agent);

    // Exemple 1: Post NSFW avec image et warning
    console.log('=== Exemple 1: Post NSFW avec image ===');
    
    // Charger une image depuis le disque
    const imageBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'example.jpg'));
    
    const nsfwPost = await accountService.postNSFWContent(
      account,
      'Voici une image explicite avec warning ! ⚠️',
      [
        {
          file: imageBuffer,
          alt: 'Photo explicite d\'une personne en tenue suggestive',
          mimeType: 'image/jpeg'
        }
      ],
      'porn' // ou 'nudity', 'sexual', 'graphic-media'
    );

    console.log('Post NSFW créé:', nsfwPost.uri);

    // Exemple 2: Post normal avec plusieurs images
    console.log('\n=== Exemple 2: Post normal avec plusieurs images ===');
    
    const safePost = await accountService.postSafeContent(
      account,
      'Voici mes photos de vacances ! 🌴',
      [
        {
          file: fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'plage1.jpg')),
          alt: 'Belle plage avec du sable blanc',
          mimeType: 'image/jpeg'
        },
        {
          file: fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'plage2.jpg')),
          alt: 'Coucher de soleil sur l\'océan',
          mimeType: 'image/jpeg'
        }
      ]
    );

    console.log('Post safe créé:', safePost.uri);

    // Exemple 3: Post avec chemins d'images (compatible avec l'ancienne méthode)
    console.log('\n=== Exemple 3: Post avec chemins d\'images ===');
    
    const pathPost = await accountService.postWithImagePaths(
      account,
      'Photos partagées via chemins de fichiers',
      ['images/photo1.jpg', 'images/photo2.jpg'],
      ['Description photo 1', 'Description photo 2'],
      ['sexual'] // Content warning optionnel
    );

    console.log('Post avec chemins créé:', pathPost.uri);

    // Exemple 4: Post texte uniquement avec la nouvelle méthode
    console.log('\n=== Exemple 4: Post texte uniquement ===');
    
    const textPost = await accountService.createPostWithMedia(account, {
      text: 'Juste un message sans image !',
    });

    console.log('Post texte créé:', textPost.uri);

    // Exemple 5: Post avec labels multiples
    console.log('\n=== Exemple 5: Post avec plusieurs labels ===');
    
    const multiLabelPost = await accountService.createPostWithMedia(account, {
      text: 'Contenu avec plusieurs warnings',
      images: [
        {
          file: imageBuffer,
          alt: 'Image avec contenu mixte',
          mimeType: 'image/jpeg'
        }
      ],
      labels: ['sexual', 'graphic-media'] // Plusieurs labels
    });

    console.log('Post multi-labels créé:', multiLabelPost.uri);

  } catch (error) {
    console.error('Erreur dans les exemples:', error.message);
  }
}

/**
 * Fonction utilitaire pour tester rapidement un post NSFW
 */
export async function quickNSFWTest(accountId: number, imagePath: string, message: string) {
  try {
    const account = await Account.findOrFail(accountId);
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    const accountService = new AccountService(agent);

    const imageBuffer = fs.readFileSync(path.join(process.cwd(), 'public', imagePath));
    
    const result = await accountService.postNSFWContent(
      account,
      message,
      [
        {
          file: imageBuffer,
          alt: 'Image NSFW',
          mimeType: 'image/jpeg'
        }
      ],
      'porn'
    );

    console.log('Post NSFW test réussi:', result.uri);
    return result;
  } catch (error) {
    console.error('Erreur test NSFW:', error.message);
    throw error;
  }
}

/**
 * Fonction utilitaire pour tester rapidement un post safe
 */
export async function quickSafeTest(accountId: number, imagePaths: string[], message: string) {
  try {
    const account = await Account.findOrFail(accountId);
    const agent = new AtpAgent({ service: 'https://bsky.social' });
    const accountService = new AccountService(agent);

    const images = imagePaths.map(imagePath => ({
      file: fs.readFileSync(path.join(process.cwd(), 'public', imagePath)),
      alt: `Image: ${path.basename(imagePath)}`,
      mimeType: 'image/jpeg'
    }));
    
    const result = await accountService.postSafeContent(account, message, images);

    console.log('Post safe test réussi:', result.uri);
    return result;
  } catch (error) {
    console.error('Erreur test safe:', error.message);
    throw error;
  }
}

// Exemple d'utilisation simple
// exampleUsage();
