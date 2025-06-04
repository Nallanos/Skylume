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
from dotenv import load_dotenv
from ai_service.services.tagger import generate_tags
from ai_service.clients.adonis_api_client import AdonisApiClient

# Charger les variables d'environnement
load_dotenv()

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BulkAnalysisWorker:
    """Worker pour traiter les analyses en bulk et récurrentes des followers"""
    
    def __init__(self):
        # Configuration depuis les variables d'environnement
        self.polling_interval = int(os.getenv('POLLING_INTERVAL', '10'))
        self.max_retries = 3
        self.running = False
        self.api_client = AdonisApiClient()
        
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
            
            # Appeler la fonction generate_tags
            results = await generate_tags(account_handle, followers)
            
            # Mettre à jour le progrès : analyse terminée (seulement pour les analyses en bulk)
            if analysis_id:
                await self.api_client.update_analysis_progress(str(analysis_id), 100, "completed", "Analyse terminée")
            
            # Finaliser le job selon le type
            if analysis_type == 'bulk':
                # Marquer le job comme terminé avec succès pour les analyses en bulk
                await self.api_client.complete_analysis_job(job_id, str(analysis_id) if analysis_id else None, {
                    'clusters': results,
                    'totalAnalyzed': len(followers),
                    'accountHandle': account_handle,
                    'processedAt': time.time()
                })
            else:
                # Pour les analyses récurrentes, on log simplement le résultat
                logger.info(f"Analyse récurrente terminée pour {account_handle}: {len(results)} clusters générés")
            
            logger.info(f"Job {job_id} terminé avec succès (type: {analysis_type})")
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement du job {job_id}: {e}", exc_info=True)
            
            # Marquer le job comme échoué seulement pour les analyses en bulk
            if analysis_type == 'bulk' and analysis_id:
                await self.api_client.report_job_error(job_id, str(analysis_id), str(e))

async def main():
    """Fonction principale pour démarrer le worker"""
    worker = BulkAnalysisWorker()
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Arrêt du worker via signal d'interruption")
    except Exception as e:
        logger.error(f"Erreur fatale dans le worker: {e}", exc_info=True)
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
