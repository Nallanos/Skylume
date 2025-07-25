#!/usr/bin/env python3
"""
Script de test pour valider les corrections du pipeline de clustering sémantique.
"""

import json
import numpy as np
import sys
import os

# Ajouter le chemin du module
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai_service'))

from ai_service.services.semantic_clustering.clustering.profile_clusterer import ProfileClusterer

def test_clustering_fixes():
    """Test principal pour vérifier que toutes les corrections fonctionnent."""
    print("🧪 Test du pipeline de clustering sémantique")
    
    # Charger les données de test
    embeddings_file = 'test_user_embeddings.json'
    
    if not os.path.exists(embeddings_file):
        print(f"❌ Fichier {embeddings_file} non trouvé")
        return False
    
    # Charger les embeddings
    with open(embeddings_file, 'r') as f:
        data = json.load(f)
    
    print(f"📊 Données chargées: {len(data)} utilisateurs")
    
    # Prendre un échantillon pour le test
    sample_size = min(50, len(data))
    sample_data = data[:sample_size]
    
    print(f"🔬 Test avec {sample_size} utilisateurs")
    
    # Créer le clusterer directement
    clusterer = ProfileClusterer()
    
    try:
        # Test du clustering
        print("🚀 Lancement du pipeline de clustering...")
        
        # Préparer les profils
        profiles = []
        profile_embeddings = []
        
        for user_data in sample_data:
            # Vérifier que l'embedding est valide
            embedding = user_data.get('embedding')
            handle = user_data.get('handle', 'unknown')
            if embedding and isinstance(embedding, list) and len(embedding) > 0:
                # Vérifier que tous les éléments sont des nombres
                if all(isinstance(x, (int, float)) and not np.isnan(x) for x in embedding):
                    profiles.append({
                        'user_id': handle,
                        'profile_data': user_data
                    })
                    profile_embeddings.append(embedding)
        
        print(f"✅ {len(profiles)} profils valides pour le clustering")
        
        if len(profiles) < 5:
            print("⚠️ Pas assez de profils valides pour le clustering")
            return False
        
        # Convertir en array numpy pour le test
        profile_embeddings = np.array(profile_embeddings)
        
        # Test du clustering avec graduated pipeline
        clusters = clusterer.cluster_profiles_with_graduated_pipeline(
            profiles=profiles,
            profile_embeddings=profile_embeddings,
            cohesion_threshold=0.7,
            persistence_threshold=0.1
        )
        
        print(f"✅ Clustering terminé avec succès!")
        print(f"📈 {len(clusters)} clusters générés")
        
        # Afficher un résumé des clusters
        for i, cluster in enumerate(clusters[:3]):  # Premier 3 clusters
            size = cluster.get('size', 0)
            method = cluster.get('method', 'unknown')
            cohesion = cluster.get('cohesion', 0)
            print(f"  Cluster {i+1}: {size} users, méthode={method}, cohésion={cohesion:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur durant le test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_clustering_fixes()
    if success:
        print("🎉 Tous les tests réussis! Le pipeline fonctionne correctement.")
        sys.exit(0)
    else:
        print("💥 Les tests ont échoué.")
        sys.exit(1)
