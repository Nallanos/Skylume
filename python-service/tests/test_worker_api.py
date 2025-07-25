#!/usr/bin/env python3
"""
Test de connectivité avec l'API AdonisJS pour le worker.
Vérifie que l'API est accessible avant de démarrer le worker.
"""
import os
import sys
import requests
import time
from requests.exceptions import RequestException, Timeout, ConnectionError


def test_api_connectivity():
    """Test la connectivité avec l'API AdonisJS."""
    api_url = os.environ.get('ADONISJS_API_URL', 'http://localhost:8081')
    internal_api_key = os.environ.get('INTERNAL_API_KEY')
    
    if not internal_api_key:
        print("❌ Erreur: Variable INTERNAL_API_KEY non définie")
        return False
    
    # Test de connectivité basique
    health_url = f"{api_url}/health"
    headers = {'Authorization': f'Bearer {internal_api_key}'}
    
    try:
        # Test simple de connectivité avec timeout court
        response = requests.get(health_url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ API accessible à {api_url}")
            return True
        elif response.status_code == 404:
            # L'endpoint /health n'existe peut-être pas, testons un autre endpoint
            worker_url = f"{api_url}/api/workers/status"
            try:
                worker_response = requests.get(worker_url, headers=headers, timeout=5)
                if worker_response.status_code in [200, 401, 403]:  # API répond même si non autorisé
                    print(f"✅ API accessible à {api_url}")
                    return True
            except:
                pass
            
            print(f"⚠️  API répond mais endpoint non trouvé ({response.status_code})")
            return True  # L'API est accessible même si l'endpoint n'existe pas
        else:
            print(f"⚠️  API répond avec code {response.status_code}")
            return True  # L'API est accessible
            
    except ConnectionError:
        print(f"❌ Impossible de se connecter à {api_url}")
        print("   Vérifiez que l'API AdonisJS est démarrée")
        return False
    except Timeout:
        print(f"❌ Timeout lors de la connexion à {api_url}")
        print("   L'API met trop de temps à répondre")
        return False
    except RequestException as e:
        print(f"❌ Erreur de requête: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False


def main():
    """Point d'entrée principal."""
    if len(sys.argv) > 1 and sys.argv[1] == "--verbose":
        print("🔍 Test de connectivité en mode verbose")
    
    success = test_api_connectivity()
    
    if not success:
        print("\n💡 Suggestions de dépannage:")
        print("   1. Vérifiez que l'API AdonisJS est démarrée")
        print("   2. Vérifiez l'URL dans ADONISJS_API_URL")
        print("   3. Vérifiez la clé API dans INTERNAL_API_KEY")
        print("   4. Utilisez --skip-check pour ignorer ce test")
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
