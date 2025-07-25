#!/usr/bin/env python3
"""
Worker Python pour traiter les analyses en bulk des followers.
Ce worker fait du polling HTTP vers l'API AdonisJS pour récupérer les jobs à traiter.
"""

import asyncio
import logging
import logging
import time
import os
import signal
import psutil  # Add for process monitoring
from typing import Dict, Any, Optional

logging.getLogger("httpx").setLevel(logging.WARNING)
print("Initialisation du worker d'analyse...")
print("Chargement des modules de base...")

from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()
print("Variables d'environnement chargées")
print(f"EMBEDDING_MODEL_PRIMARY configuré: {os.getenv('EMBEDDING_MODEL_PRIMARY', 'NOT_FOUND')}")

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

print("Importation des services AI...")
try:
    from ai_service.services.main_orchestrator import MainOrchestrator
    print("Module MainOrchestrator importé avec succès")
except Exception as e:
    print(f"Erreur lors de l'import de MainOrchestrator: {e}")
    raise

print("Importation du client API...")
try:
    from ai_service.clients.adonis_api_client import AdonisApiClient
    print("Client API importé avec succès")
except Exception as e:
    print(f"Erreur lors de l'import du client API: {e}")
    raise

print("Tous les imports terminés")

from ai_service.services.dependency_factory import DependencyFactory

class BulkAnalysisWorker:
    """Worker pour traiter les analyses en bulk et récurrentes des followers"""
    
    def __init__(self):
        print("Initialisation de BulkAnalysisWorker...")
        # Configuration depuis les variables d'environnement
        self.polling_interval = int(os.getenv('POLLING_INTERVAL', '10'))
        self.max_retries = 3
        self.running = False
        # Process monitoring settings
        self.memory_threshold_mb = 2048  # 2GB limit
        self.cpu_threshold_percent = 80  # 80% CPU limit
        self.last_activity_time = time.time()  # Track last activity for health monitoring
        self.health_check_interval = 300  # 5 minutes between health checks
        print(f"Configuration: polling_interval={self.polling_interval}s, max_retries={self.max_retries}")
        print(f"Process limits: memory={self.memory_threshold_mb}MB, cpu={self.cpu_threshold_percent}%")
        print("Initialisation du client API...")
        try:
            self.api_client = AdonisApiClient()
            print("Client API initialisé avec succès")
        except Exception as e:
            print(f"Erreur lors de l'initialisation du client API: {e}")
            raise
        # Instancier MainOrchestrator une seule fois pour tout le worker
        print("Initialisation du MainOrchestrator (singleton du worker)...")
        try:
            from ai_service.services.main_orchestrator import MainOrchestrator
            
            # Initialiser les composants un par un avec des logs détaillés
            print("🔧 Chargement de l'embedding model...")
            embedding_model = DependencyFactory.get_embedding_model()
            print("✅ Embedding model chargé")
            
            print("🔧 Chargement du clusterer...")
            clusterer = DependencyFactory.get_clusterer()
            print("✅ Clusterer chargé")
            
            print("🔧 Chargement du tag generator...")
            tag_generator = DependencyFactory.get_tag_generator()
            print("✅ Tag generator chargé")
            
            print("🔧 Chargement du text cleaner...")
            text_cleaner = DependencyFactory.get_text_cleaner()
            print("✅ Text cleaner chargé")
            
            print("🔧 Assemblage du MainOrchestrator...")
            self.orchestrator = MainOrchestrator(
                api_client=self.api_client,
                embedding_model=embedding_model,
                clusterer=clusterer,
                tag_generator=tag_generator,
                text_cleaner=text_cleaner
            )
            print("✅ MainOrchestrator initialisé avec succès (singleton)")
        except Exception as e:
            print(f"Erreur lors de l'initialisation du MainOrchestrator: {e}")
            raise
        print("BulkAnalysisWorker initialisé avec succès")
        
    def _check_system_resources(self) -> Dict[str, Any]:
        """Monitor system resources to prevent overload"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            cpu_percent = process.cpu_percent()
            
            return {
                'memory_mb': memory_mb,
                'cpu_percent': cpu_percent,
                'memory_over_limit': memory_mb > self.memory_threshold_mb,
                'cpu_over_limit': cpu_percent > self.cpu_threshold_percent
            }
        except Exception as e:
            logger.warning(f"Failed to check system resources: {e}")
            return {'memory_mb': 0, 'cpu_percent': 0, 'memory_over_limit': False, 'cpu_over_limit': False}
    
    def _handle_resource_pressure(self, stats: Dict[str, Any]):
        """Handle high resource usage"""
        if stats['memory_over_limit']:
            logger.warning(f"High memory usage: {stats['memory_mb']:.1f}MB (limit: {self.memory_threshold_mb}MB)")
            # Force garbage collection
            import gc
            gc.collect()
            
        if stats['cpu_over_limit']:
            logger.warning(f"High CPU usage: {stats['cpu_percent']:.1f}% (limit: {self.cpu_threshold_percent}%)")
            # Brief pause to reduce CPU load
            time.sleep(2)
            
    def _update_activity_timestamp(self):
        """Update last activity timestamp"""
        self.last_activity_time = time.time()
        
    def _check_worker_health(self):
        """Check if worker is healthy and responsive"""
        current_time = time.time()
        time_since_activity = current_time - self.last_activity_time
        
        if time_since_activity > self.health_check_interval:
            logger.warning(f"Worker inactive for {time_since_activity:.1f} seconds")
            # Force activity update
            self._update_activity_timestamp()
            
        return time_since_activity < self.health_check_interval * 2  # Allow 2x interval before considering unhealthy
        
    async def start(self):
        """Démarre le worker en mode polling"""
        logger.info("Démarrage du worker d'analyse en bulk")
        self.running = True
        logger.info("✅ Running flag défini à True")
        
        try:
            logger.info("🔄 Entrée dans la boucle principale du worker")
            while self.running:
                try:
                    logger.debug("📊 Début d'une nouvelle itération de polling")
                    
                    # Periodic resource monitoring
                    logger.debug("🔍 Vérification des ressources système...")
                    resource_stats = self._check_system_resources()
                    if resource_stats['memory_over_limit'] or resource_stats['cpu_over_limit']:
                        logger.warning(f"Resource pressure detected: Memory {resource_stats['memory_mb']:.1f}MB, CPU {resource_stats['cpu_percent']:.1f}%")
                        self._handle_resource_pressure(resource_stats)
                    
                    # Health check
                    logger.debug("🏥 Vérification de la santé du worker...")
                    if not self._check_worker_health():
                        logger.error("Worker health check failed - restarting...")
                        break
                    
                    # Update activity timestamp
                    logger.debug("⏰ Mise à jour du timestamp d'activité...")
                    self._update_activity_timestamp()
                    
                    # Essayer d'abord de récupérer un job en bulk (priorité plus élevée)
                    logger.debug("🔍 Recherche de jobs en bulk...")
                    try:
                        job = await asyncio.wait_for(self.api_client.get_next_bulk_job(), timeout=30.0)
                    except asyncio.TimeoutError:
                        logger.warning("⏰ Timeout lors de la recherche de jobs bulk (30s)")
                        job = None
                    except Exception as e:
                        logger.error(f"❌ Erreur lors de la recherche de jobs bulk: {e}")
                        job = None
                    
                    if not job:
                        logger.debug("🔍 Aucun job bulk trouvé, recherche de jobs récurrents...")
                        # Si pas de job en bulk, essayer un job récurrent
                        try:
                            job = await asyncio.wait_for(self.api_client.get_next_recurring_job(), timeout=30.0)
                        except asyncio.TimeoutError:
                            logger.warning("⏰ Timeout lors de la recherche de jobs récurrents (30s)")
                            job = None
                        except Exception as e:
                            logger.error(f"❌ Erreur lors de la recherche de jobs récurrents: {e}")
                            job = None
                    
                    if job:
                        logger.info(f"Job récupéré: {job.get('jobId', 'N/A')} pour le compte {job['accountHandle']} (type: {job.get('analysisType', 'unknown')})")
                        await self._process_job(job)
                    else:
                        # Aucun job disponible, attendre avant le prochain polling
                        logger.debug(f"😴 Aucun job disponible, attente de {self.polling_interval}s...")
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
        
        # Debug: Log the first 3 followers before validation
        if followers:
            logger.info(f"[DEBUG] First 3 followers sample: {followers[:3]}")
        else:
            logger.warning("[DEBUG] Followers list is empty in job!")
        
        # Retrieve Bluesky credentials from job data
        bluesky_handle = account_handle  # Le handle Bluesky est le même que accountHandle
        bluesky_password = job.get('accountAppPassword')  # Le mot de passe est fourni dans le job
        
        if bluesky_handle and bluesky_password:
            logger.info(f"Using Bluesky credentials from job for account {account_handle}")
        else:
            logger.warning(f"Missing Bluesky credentials in job for account {account_handle}")
            logger.warning(f"Available job keys: {list(job.keys())}")
        
        try:
            logger.info(f"Début du traitement du job {job_id} pour {account_handle} (type: {analysis_type})")
            # Check system resources before starting intensive work
            resource_stats = self._check_system_resources()
            logger.info(f"Resource usage: Memory {resource_stats['memory_mb']:.1f}MB, CPU {resource_stats['cpu_percent']:.1f}%")
            # Handle resource pressure
            self._handle_resource_pressure(resource_stats)
            # Appeler la fonction analyze_audience avec gestion d'erreur robuste
            try:
                # Monitor resources before intensive processing
                pre_processing_stats = self._check_system_resources()
                logger.info(f"Pre-processing: Memory {pre_processing_stats['memory_mb']:.1f}MB, CPU {pre_processing_stats['cpu_percent']:.1f}%")
                # Set up timeout protection for the analysis
                def analysis_timeout_handler(signum, frame):
                    raise TimeoutError("Analysis processing timed out")
                # Set 30-minute timeout for the entire analysis
                signal.signal(signal.SIGALRM, analysis_timeout_handler)
                signal.alarm(1800)  # 30 minutes
                # Utiliser l'orchestrateur singleton du worker
                results = await self.orchestrator.analyze_audience(
                    account_handle, 
                    followers, 
                    bluesky_handle=bluesky_handle, 
                    bluesky_password=bluesky_password
                )
                # Clear timeout
                signal.alarm(0)
                # Monitor resources after processing
                post_processing_stats = self._check_system_resources()
                logger.info(f"Post-processing: Memory {post_processing_stats['memory_mb']:.1f}MB, CPU {post_processing_stats['cpu_percent']:.1f}%")
            except TimeoutError:
                logger.error("Analysis timed out after 30 minutes")
                results = []
            except KeyboardInterrupt:
                logger.info("Interruption clavier détectée pendant le traitement")
                raise
            except SystemExit:
                logger.error("SystemExit détecté pendant le traitement")
                raise
            except MemoryError:
                logger.error("Mémoire insuffisante pour le traitement")
                # Force garbage collection and retry with smaller dataset
                import gc
                gc.collect()
                logger.info(f"Tentative de récupération avec un échantillon réduit ({min(100, len(followers))} followers)")
                try:
                    # On peut choisir de ré-instancier l'orchestrateur ici si vraiment nécessaire, mais par défaut on réutilise le même
                    results = await self.orchestrator.analyze_audience(
                        account_handle, 
                        followers=followers,
                        bluesky_handle=bluesky_handle, 
                        bluesky_password=bluesky_password
                    )
                    logger.info("Récupération réussie avec échantillon réduit")
                except Exception as recovery_error:
                    logger.error(f"Échec de la récupération: {recovery_error}")
                    results = []
            except Exception as tag_error:
                logger.error(f"Erreur dans analyze_audience: {tag_error}", exc_info=True)
                # Retourner une liste vide plutôt que de faire échouer tout le job
                results = []
            # Mettre à jour le statut du job dans l'API Adonis
            if analysis_type == 'bulk':
                # Calculer des statistiques supplémentaires des résultats
                total_clusters = len(results)
                total_profiles_clustered = sum(cluster.get('size', 0) for cluster in results)
                noise_clusters = [c for c in results if c.get('cluster_type') == 'noise']
                semantic_clusters = [c for c in results if c.get('cluster_type') != 'noise']
                
                # Calculer les tags les plus fréquents
                tags_frequency = {}
                for cluster in semantic_clusters:
                    tag = cluster.get('tag', 'Unknown')
                    tags_frequency[tag] = tags_frequency.get(tag, 0) + cluster.get('size', 0)
                
                # Calculer la cohésion moyenne
                cohesions = [c.get('cohesion', 0) for c in semantic_clusters if c.get('cohesion') is not None]
                avg_cohesion = sum(cohesions) / len(cohesions) if cohesions else 0
                
                # Préparer le payload complet avec toutes les données d'analyze_audience
                complete_payload = {
                    # Données principales des clusters (format complet d'analyze_audience)
                    'clustersData': results,
                    
                    # Métadonnées de traitement
                    'totalAnalyzed': len(followers),
                    'accountHandle': account_handle,
                    'processedAt': time.time(),
                    
                    # Statistiques détaillées des clusters
                    'clusterStats': {
                        'totalClusters': total_clusters,
                        'semanticClusters': len(semantic_clusters),
                        'noiseClusters': len(noise_clusters),
                        'totalProfilesClustered': total_profiles_clustered,
                        'averageCohesion': avg_cohesion,
                        'tagsFrequency': tags_frequency
                    },
                    
                    # Détails de chaque cluster avec toutes les propriétés
                    'clusterDetails': [
                        {
                            'index': idx,
                            'tag': cluster.get('tag', 'Unknown'),
                            'size': cluster.get('size', 0),
                            'cohesion': cluster.get('cohesion', 0),
                            'persistence': cluster.get('persistence'),
                            'cluster_type': cluster.get('cluster_type', 'normal'),
                            'validation_status': cluster.get('validation_status', 'unknown'),
                            'processing_status': cluster.get('processing_status', 'normal'),
                            'keywords': cluster.get('keywords', []),
                            'handles_count': len(cluster.get('handles', [])),
                            'has_embedding': bool(cluster.get('embedding')),
                            'robustness_tag': cluster.get('robustness_tag'),
                            'skip_tagging': cluster.get('skip_tagging', False)
                        }
                        for idx, cluster in enumerate(results)
                    ],
                    
                    # Informations sur la qualité de l'analyse
                    'analysisQuality': {
                        'profilesWithBio': sum(1 for c in semantic_clusters for _ in range(c.get('size', 0))),
                        'profilesWithoutBio': sum(c.get('size', 0) for c in noise_clusters),
                        'bioQualityRatio': (sum(c.get('size', 0) for c in semantic_clusters) / len(followers)) if followers else 0,
                        'clusteringEfficiency': len(semantic_clusters) / total_clusters if total_clusters > 0 else 0
                    }
                }
                
                # Marquer le job comme terminé avec succès pour les analyses en bulk
                await self.api_client.complete_analysis_job(
                    job_id, 
                    str(analysis_id) if analysis_id else None, 
                    complete_payload
                )
                logger.info(f"Job {job_id} completed with comprehensive data: {total_clusters} clusters, {total_profiles_clustered} profiles clustered")
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
    print("Démarrage de la fonction main()...")
    print("Création de l'instance BulkAnalysisWorker...")
    
    # Set up signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        print(f"Signal {signum} reçu - arrêt gracieux en cours...")
        logger.info(f"Signal {signum} reçu - arrêt gracieux en cours...")
        if 'worker' in locals() and hasattr(worker, 'running'):
            worker.running = False
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        worker = BulkAnalysisWorker()
        print("Worker créé avec succès")
        
        print("Démarrage du worker...")
        await worker.start()
    except KeyboardInterrupt:
        print("Arrêt du worker via signal d'interruption")
        logger.info("Arrêt du worker via signal d'interruption")
    except Exception as e:
        print(f"Erreur fatale dans le worker: {e}")
        logger.error(f"Erreur fatale dans le worker: {e}", exc_info=True)
        raise
    finally:
        print("Nettoyage final...")
        if 'worker' in locals():
            await worker.stop()
        print("Nettoyage terminé")


if __name__ == "__main__":
    print("Lancement du worker d'analyse...")
    print("Configuration de l'environnement async...")
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Erreur fatale lors du lancement: {e}")
        raise
