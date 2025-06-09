"""
Client HTTP sécurisé pour communiquer avec l'API AdonisJS.
Gère l'authentification par clé API et les requêtes HTTP vers le service principal.
"""

import httpx
import os
import logging
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AdonisApiClient:
    """Client HTTP sécurisé pour communiquer avec l'API AdonisJS"""
    
    def __init__(self):
        print("🌐 Initialisation d'AdonisApiClient...")
        
        # Détection automatique du mode Docker vs développement local
        self.base_url = os.getenv('ADONISJS_API_URL')
        self.api_key = os.getenv('INTERNAL_API_KEY')
        print(f"🔧 Base URL: {self.base_url}")
        print(f"🔑 API Key présente: {'Oui' if self.api_key else 'Non'}")
        
        # Fallback intelligent en fonction de l'environnement
        if not self.base_url:
            # Si on est en Docker, on utilise le nom du service, sinon localhost
            if os.path.exists('/.dockerenv'):
                self.base_url = 'http://adonis-app:8081'
                logger.info("Environnement Docker détecté, utilisation de l'URL: http://adonis-app:8081")
                print("🐳 Environnement Docker détecté")
            else:
                self.base_url = 'http://localhost:8081'
                print("💻 Environnement local détecté")
                logger.info("Environnement local détecté, utilisation de l'URL: http://localhost:8081")
        
        print("🔑 Validation de la clé API...")
        if not self.api_key:
            print("❌ Clé API manquante!")
            raise ValueError("INTERNAL_API_KEY environment variable is required")
        print("✅ Clé API validée")
        
        print("📋 Configuration des headers...")
        self.headers = {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json',
            'User-Agent': 'Python-AI-Service/1.0'
        }
        print("✅ Headers configurés")
        
        print("🌐 Création du client HTTP...")
        # Configuration du client HTTP avec timeout et retry (sans headers globaux)
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
        print("✅ Client HTTP créé")
        
        logger.info(f"AdonisApiClient initialized with base URL: {self.base_url}")
        print(f"✅ AdonisApiClient initialisé avec succès ({self.base_url})")
    
    async def get_next_bulk_job(self) -> Optional[Dict[str, Any]]:
        """Récupère le prochain job d'analyse en bulk depuis AdonisJS"""
        try:
            response = await self.client.get('/internal/python/next-bulk-job', headers=self.headers)
            response.raise_for_status()
            
            # Gérer les réponses 204 (No Content) qui n'ont pas de body JSON
            if response.status_code == 204:
                logger.debug("Aucun job en bulk disponible")
                return None
                
            data = response.json()
            # Vérifier la structure de réponse AdonisJS: { status: 'success', data: {...} }
            if data.get('status') == 'success' and data.get('data'):
                job_data = data.get('data')
                logger.info(f"Job en bulk récupéré: {job_data.get('jobId', 'N/A')}")
                return job_data
            
            # Gérer les cas d'erreur avec status != 'success'
            if data.get('status') == 'error':
                logger.error(f"Erreur retournée par l'API: {data.get('message', 'Erreur inconnue')}")
                return None
            
            return None
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting bulk job: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting bulk job: {e}")
            raise
    
    async def get_next_recurring_job(self) -> Optional[Dict[str, Any]]:
        """Récupère le prochain job d'analyse récurrente depuis AdonisJS"""
        try:
            response = await self.client.get('/internal/python/next-recurring-job', headers=self.headers)
            response.raise_for_status()
            
            # Gérer les réponses 204 (No Content) qui n'ont pas de body JSON
            if response.status_code == 204:
                logger.debug("Aucun job récurrent disponible")
                return None
                
            data = response.json()
            # Vérifier la structure de réponse AdonisJS: { status: 'success', data: {...} }
            if data.get('status') == 'success' and data.get('data'):
                job_data = data.get('data')
                logger.info(f"Job récurrent récupéré: {job_data.get('jobId', 'N/A')}")
                return job_data
            
            # Gérer les cas d'erreur avec status != 'success'
            if data.get('status') == 'error':
                logger.error(f"Erreur retournée par l'API: {data.get('message', 'Erreur inconnue')}")
                return None
            
            return None
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting recurring job: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting recurring job: {e}")
            raise
    
    async def update_analysis_progress(self, analysis_id: str, progress: int, status: str, message: str = "") -> bool:
        """Met à jour le progrès d'une analyse"""
        try:
            payload = {
                'analysisId': analysis_id,
                'analyzed': progress,
                'total': 100,
                'percentage': progress
            }
            
            response = await self.client.post('/internal/python/update-progress', json=payload, headers=self.headers)
            response.raise_for_status()
            
            logger.info(f"Updated progress for analysis {analysis_id}: {progress}% - {status}")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error updating progress: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Error updating progress: {e}")
            return False
    
    async def complete_analysis_job(self, job_id: str, analysis_id: Optional[str], results: Dict[str, Any]) -> bool:
        """Marque un job d'analyse comme terminé et envoie les résultats"""
        try:
            payload = {
                'jobId': job_id,
                'success': True,
                'results': results
            }
            
            # Ajouter analysisId seulement si fourni (analyses en bulk)
            if analysis_id is not None:
                payload['analysisId'] = analysis_id
            
            response = await self.client.post('/internal/python/complete-job', json=payload, headers=self.headers)
            response.raise_for_status()
            
            logger.info(f"Completed job {job_id} successfully")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error completing job: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Error completing job: {e}")
            return False
    
    async def report_job_error(self, job_id: str, analysis_id: Optional[str], error_message: str) -> bool:
        """Signale une erreur pour un job d'analyse"""
        try:
            payload = {
                'jobId': job_id,
                'success': False,
                'error': error_message
            }
            
            # Ajouter analysisId seulement si fourni (analyses en bulk)
            if analysis_id is not None:
                payload['analysisId'] = analysis_id
            
            response = await self.client.post('/internal/python/complete-job', json=payload, headers=self.headers)
            response.raise_for_status()
            
            logger.info(f"Reported error for job {job_id}: {error_message}")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error reporting job error: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Error reporting job error: {e}")
            return False
    
    async def health_check(self) -> bool:
        """Vérifie la connectivité avec l'API AdonisJS"""
        try:
            response = await self.client.get('/internal/python/health', headers=self.headers)
            response.raise_for_status()
            logger.info("Health check successful")
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def get_account(self, account_handle: str) -> Optional[Dict[str, Any]]:
        """Récupère les données d'un compte depuis AdonisJS"""
        try:
            response = await self.client.get(f'/internal/python/accounts/{account_handle}', headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Retrieved account data for: {account_handle}")
            return data.get('account')
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Account not found: {account_handle}")
                return None
            logger.error(f"HTTP error getting account: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting account {account_handle}: {e}")
            raise

    async def close(self):
        """Ferme proprement le client HTTP"""
        await self.client.aclose()
        logger.info("AdonisApiClient closed")
