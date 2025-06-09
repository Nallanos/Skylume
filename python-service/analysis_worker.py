#!/usr/bin/env python3
"""
Worker Python pour traiter les analyses en bulk des followers.
Ce worker fait du polling HTTP vers l'API AdonisJS pour récupérer les jobs à traiter.
"""

import asyncio
import logging
import time
import os
from typing import Dict, Any, Optional

print("🔄 Initialisation du worker d'analyse...")
print("📦 Chargement des modules de base...")

from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()
print("✅ Variables d'environnement chargées")

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

print("📥 Importation des services AI...")
try:
    from ai_service.services.tagger import generate_tags
    print("✅ Module generate_tags importé avec succès")
except Exception as e:
    print(f"❌ Erreur lors de l'import de generate_tags: {e}")
    raise

print("📥 Importation du client API...")
try:
    from ai_service.clients.adonis_api_client import AdonisApiClient
    print("✅ Client API importé avec succès")
except Exception as e:
    print(f"❌ Erreur lors de l'import du client API: {e}")
    raise

print("✅ Tous les imports terminés")

class BulkAnalysisWorker:
    """Worker pour traiter les analyses en bulk et récurrentes des followers"""
    
    def __init__(self):
        print("🔧 Initialisation de BulkAnalysisWorker...")
        
        # Configuration depuis les variables d'environnement
        self.polling_interval = int(os.getenv('POLLING_INTERVAL', '10'))
        self.max_retries = 3
        self.running = False
        
        print(f"⚙️ Configuration: polling_interval={self.polling_interval}s, max_retries={self.max_retries}")
        
        print("🌐 Initialisation du client API...")
        try:
            self.api_client = AdonisApiClient()
            print("✅ Client API initialisé avec succès")
        except Exception as e:
            print(f"❌ Erreur lors de l'initialisation du client API: {e}")
            raise
        
        print("✅ BulkAnalysisWorker initialisé avec succès")
        
    async def start(self):
        """Démarre le worker en mode polling"""
        logger.info("Démarrage du worker d'analyse en bulk")
        self.running = True
        
        try:
            while self.running:
                try:
                    # Essayer d'abord de récupérer un job en bulk (priorité plus élevée)
                    job = await self.api_client.get_next_bulk_job()
                    
                    if not job:
                        # Si pas de job en bulk, essayer un job récurrent
                        job = await self.api_client.get_next_recurring_job()
                    
                    if job:
                        logger.info(f"Job récupéré: {job.get('jobId', 'N/A')} pour le compte {job['accountHandle']} (type: {job.get('analysisType', 'unknown')})")
                        await self._process_job(job)
                    else:
                        # Aucun job disponible, attendre avant le prochain polling
                        logger.debug("Aucun job disponible, attente...")
                        await asyncio.sleep(self.polling_interval)
                        
                except Exception as e:
                    logger.error(f"Erreur dans la boucle principale du worker: {e}")
                    await asyncio.sleep(self.polling_interval * 2)  # Attendre plus longtemps en cas d'erreur
                    
        except KeyboardInterrupt:
            logger.info("Interruption clavier détectée")
        finally:
            await self.stop()
            
    async def stop(self):
        """Arrête le worker proprement"""
        logger.info("Arrêt du worker d'analyse en bulk")
        self.running = False
        await self.api_client.close()
        
    async def _process_job(self, job: Dict[str, Any]) -> None:
        """Traite un job d'analyse"""
        job_id = job['jobId']
        analysis_id = job.get('analysisId')  # Peut être None pour les jobs récurrents
        account_handle = job['accountHandle']
        followers = job['followers']
        analysis_type = job.get('analysisType', 'unknown')
        
        try:
            logger.info(f"Début du traitement du job {job_id} pour {account_handle} (type: {analysis_type})")
            
            # Mettre à jour le progrès seulement pour les analyses en bulk (qui ont un ID d'analyse)
            if analysis_id:
                await self.api_client.update_analysis_progress(str(analysis_id), 0, "starting", "Démarrage de l'analyse")
            
            # Appeler la fonction generate_tags avec gestion d'erreur robuste
            try:
                results = await generate_tags(account_handle, followers)
            except KeyboardInterrupt:
                logger.info("Interruption clavier détectée pendant le traitement")
                raise
            except SystemExit:
                logger.error("SystemExit détecté pendant le traitement")
                raise
            except Exception as tag_error:
                logger.error(f"Erreur dans generate_tags: {tag_error}", exc_info=True)
                # Retourner une liste vide plutôt que de faire échouer tout le job
                results = []
            
            # Mettre à jour le progrès : analyse terminée (seulement pour les analyses en bulk)
            if analysis_id:
                await self.api_client.update_analysis_progress(str(analysis_id), 100, "completed", "Analyse terminée")
            
            # Finaliser le job selon le type
            if analysis_type == 'bulk':
                # Marquer le job comme terminé avec succès pour les analyses en bulk
                await self.api_client.complete_analysis_job(job_id, str(analysis_id) if analysis_id else None, {
                    'clustersData': results,  # Changed from 'clusters' to 'clustersData'
                    'totalAnalyzed': len(followers),
                    'accountHandle': account_handle,
                    'processedAt': time.time()
                })
            else:
                # Pour les analyses récurrentes, on log simplement le résultat
                logger.info(f"Analyse récurrente terminée pour {account_handle}: {len(results)} clusters générés")
            
            logger.info(f"Job {job_id} terminé avec succès (type: {analysis_type})")
            
        except (KeyboardInterrupt, SystemExit):
            logger.info("Arrêt du traitement du job suite à un signal d'arrêt")
            raise
        except Exception as e:
            logger.error(f"Erreur lors du traitement du job {job_id}: {e}", exc_info=True)
            
            # Marquer le job comme échoué seulement pour les analyses en bulk
            if analysis_type == 'bulk' and analysis_id:
                try:
                    await self.api_client.report_job_error(job_id, str(analysis_id), str(e))
                except Exception as report_error:
                    logger.error(f"Erreur lors du signalement d'erreur: {report_error}")

async def main():
    """Point d'entrée principal du worker"""
    print("🚀 Démarrage de la fonction main()...")
    print("🏗️ Création de l'instance BulkAnalysisWorker...")
    
    try:
        worker = BulkAnalysisWorker()
        print("✅ Worker créé avec succès")
        
        print("▶️ Démarrage du worker...")
        await worker.start()
    except KeyboardInterrupt:
        print("⏹️ Arrêt du worker via signal d'interruption")
        logger.info("Arrêt du worker via signal d'interruption")
    except Exception as e:
        print(f"💥 Erreur fatale dans le worker: {e}")
        logger.error(f"Erreur fatale dans le worker: {e}", exc_info=True)
        raise
    finally:
        print("🧹 Nettoyage final...")
        if 'worker' in locals():
            await worker.stop()
        print("✅ Nettoyage terminé")


if __name__ == "__main__":
    print("🎬 Lancement du worker d'analyse...")
    print("📋 Configuration de l'environnement async...")
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"💥 Erreur fatale lors du lancement: {e}")
        raise
