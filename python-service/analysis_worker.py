#!/usr/bin/env python3
"""
Worker Python pour traiter les analyses en bulk des followers.
Ce worker fait du polling HTTP vers l'API AdonisJS pour récupérer les jobs à traiter.
"""

import asyncio
import logging
import time
import httpx
import os
from typing import Dict, Any, Optional
from ai_service.services.tagger import generate_tags
from ai_service.database.connection import get_database

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BulkAnalysisWorker:
    """Worker pour traiter les analyses en bulk et récurrentes des followers"""
    
    def __init__(self, api_base_url: str = "http://localhost:8081"):
        self.api_base_url = api_base_url.rstrip('/')
        self.polling_interval = 10
        self.max_retries = 3
        self.running = False
        
    async def start(self):
        """Démarre le worker en mode polling"""
        logger.info("Démarrage du worker d'analyse en bulk")
        self.running = True
        
        # Initialiser la connexion à la base de données
        database = await get_database()
        
        try:
            while self.running:
                try:
                    # Essayer d'abord de récupérer un job en bulk (priorité plus élevée)
                    job = await self._get_next_bulk_job()
                    
                    if not job:
                        # Si pas de job en bulk, essayer un job récurrent
                        job = await self._get_next_recurring_job()
                    
                    if job:
                        logger.info(f"Job récupéré: {job.get('jobId', 'N/A')} pour le compte {job['accountHandle']} (type: {job.get('analysisType', 'unknown')})")
                        await self._process_job(job, database)
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
        
    async def _get_next_bulk_job(self) -> Optional[Dict[str, Any]]:
        """Récupère le prochain job en bulk depuis l'API AdonisJS"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.api_base_url}/internal/python/next-bulk-job")
                
                if response.status_code == 204:
                    # Aucun job disponible
                    return None
                elif response.status_code == 200:
                    data = response.json()
                    if data['status'] == 'success':
                        return data['data']
                    else:
                        logger.warning(f"Réponse API inattendue pour job bulk: {data}")
                        return None
                else:
                    logger.error(f"Erreur API lors de la récupération du job bulk: {response.status_code}")
                    return None
                    
        except httpx.TimeoutException:
            logger.warning("Timeout lors de la récupération du job bulk")
            return None
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du job bulk: {e}")
            return None

    async def _get_next_recurring_job(self) -> Optional[Dict[str, Any]]:
        """Récupère le prochain job récurrent depuis l'API AdonisJS"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.api_base_url}/internal/python/next-recurring-job")
                
                if response.status_code == 204:
                    # Aucun job disponible
                    return None
                elif response.status_code == 200:
                    data = response.json()
                    if data['status'] == 'success':
                        return data['data']
                    else:
                        logger.warning(f"Réponse API inattendue pour job récurrent: {data}")
                        return None
                else:
                    logger.error(f"Erreur API lors de la récupération du job récurrent: {response.status_code}")
                    return None
                    
        except httpx.TimeoutException:
            logger.warning("Timeout lors de la récupération du job récurrent")
            return None
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du job récurrent: {e}")
            return None
            
    async def _process_job(self, job: Dict[str, Any], database) -> None:
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
                await self._update_progress(analysis_id, 0, len(followers), 0)
            
            # Appeler la fonction generate_tags
            results = await generate_tags(account_handle, followers, database)
            
            # Mettre à jour le progrès : analyse terminée (seulement pour les analyses en bulk)
            if analysis_id:
                await self._update_progress(analysis_id, len(followers), len(followers), 100)
            
            # Finaliser le job selon le type
            if analysis_type == 'bulk':
                # Marquer le job comme terminé avec succès pour les analyses en bulk
                await self._complete_job(job_id, analysis_id, True, {
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
                await self._complete_job(job_id, analysis_id, False, error=str(e))
            
    async def _update_progress(self, analysis_id: int, analyzed: int, total: int, percentage: float) -> None:
        """Met à jour le progrès d'une analyse"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_base_url}/internal/python/update-progress",
                    json={
                        'analysisId': analysis_id,
                        'analyzed': analyzed,
                        'total': total,
                        'percentage': percentage
                    }
                )
                
                if response.status_code != 200:
                    logger.warning(f"Erreur lors de la mise à jour du progrès: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du progrès: {e}")
            
    async def _complete_job(self, job_id: str, analysis_id: int, success: bool, results: Dict[str, Any] = None, error: str = None) -> None:
        """Marque un job comme terminé"""
        try:
            payload = {
                'jobId': job_id,
                'analysisId': analysis_id,
                'success': success
            }
            
            if success and results:
                payload['results'] = results
            elif not success and error:
                payload['error'] = error
                
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_base_url}/internal/python/complete-job",
                    json=payload
                )
                
                if response.status_code != 200:
                    logger.error(f"Erreur lors de la finalisation du job: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Erreur lors de la finalisation du job: {e}")


async def main():
    """Fonction principale pour démarrer le worker"""
    # Récupérer l'URL de l'API depuis les variables d'environnement
    # Correction: utiliser le bon port par défaut (8081 au lieu de 3333)
    api_url = os.getenv('ADONISJS_API_URL', 'http://localhost:8081')
    
    worker = BulkAnalysisWorker(api_url)
    
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
