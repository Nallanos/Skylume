#!/usr/bin/env python3
"""
Script de test pour vérifier le chargement des modèles ML
sans bloquer sur le téléchargement
"""

import os
import time
import warnings
import sys

def main():
    print("🔧 Configuration de l'environnement...")
    
    # Configuration des variables d'environnement
    cache_dir = os.path.join(os.path.dirname(__file__), '.model_cache')
    os.environ['HF_HOME'] = cache_dir
    os.environ['TRANSFORMERS_CACHE'] = cache_dir
    os.environ['HF_DATASETS_CACHE'] = cache_dir
    os.environ['TRANSFORMERS_OFFLINE'] = '0'
    
    # Créer le répertoire de cache
    os.makedirs(cache_dir, exist_ok=True)
    print(f"📁 Cache des modèles: {cache_dir}")
    
    # Suppression des avertissements de dépréciation
    warnings.filterwarnings('ignore', category=FutureWarning, message='.*TRANSFORMERS_CACHE.*')
    warnings.filterwarnings('ignore', category=FutureWarning, module='transformers.utils.hub')
    
    start_time = time.time()
    
    try:
        print("📦 Test du chargement du modèle Sentence Transformers...")
        
        from sentence_transformers import SentenceTransformer
        
        print("  ⬇️  Chargement du modèle all-MiniLM-L6-v2...")
        model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # Test simple d'embedding
        test_text = "Hello world"
        embedding = model.encode(test_text)
        
        elapsed = time.time() - start_time
        print(f"  ✅ Modèle chargé avec succès!")
        print(f"  📐 Dimensions: {len(embedding)}")
        print(f"  ⏱️  Temps de chargement: {elapsed:.1f}s")
        
        print("\n🧪 Test des autres dépendances...")
        
        import nltk
        print("  ✅ NLTK disponible")
        
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import HDBSCAN
        print("  ✅ scikit-learn disponible")
        
        print(f"\n🎉 Tous les tests réussis en {time.time() - start_time:.1f}s")
        return True
        
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"\n❌ Erreur après {elapsed:.1f}s: {e}")
        print("💡 Suggestion: Vérifiez votre connexion internet et réessayez")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
