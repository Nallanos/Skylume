"""
Script de démonstration de l'intégration du LDAOptimizedPipeline dans ProfileClusterer.
"""

import asyncio
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('lda_integration_demo')

async def demonstrate_lda_integration():
    """Démontre l'intégration du LDAOptimizedPipeline avec ProfileClusterer."""
    
    try:
        # Import des modules nécessaires
        from ai_service.services.semantic_clustering.clustering.profile_clusterer import ProfileClusterer
        from ai_service.services.lda_core.lda_optimized_pipeline import LDAOptimizedPipeline, LDAPipelineConfig
        from ai_service.services.semantic_clustering.processors.profile_processor import ProfileProcessor
        
        # Configuration du pipeline LDA
        lda_config = LDAPipelineConfig(
            max_profiles=20,
            min_text_length=100,  # Réduit pour la démo
            bluesky_handle=None,  # Pas d'API pour la démo
            bluesky_password=None
        )
        
        # Initialisation du pipeline LDA
        lda_pipeline = LDAOptimizedPipeline(lda_config)
        
        # Profils de test
        test_profiles = [
            {
                'handle': 'tech_user1',
                'description': 'Software engineer working on machine learning and AI systems. Love coding and algorithms.',
                'bio': 'Python developer with 5 years experience',
                'did': 'did:plc:tech1'
            },
            {
                'handle': 'data_scientist1',
                'description': 'Data scientist specializing in deep learning and neural networks. Research focused on NLP.',
                'bio': 'PhD in Computer Science, ML researcher',
                'did': 'did:plc:data1'
            },
            {
                'handle': 'designer1',
                'description': 'UI/UX designer creating beautiful interfaces. Passionate about user experience and design systems.',
                'bio': 'Creative designer with focus on usability',
                'did': 'did:plc:design1'
            },
            {
                'handle': 'writer1',
                'description': 'Technical writer and content creator. Writing about technology, programming, and innovation.',
                'bio': 'Freelance writer, tech blogger',
                'did': 'did:plc:writer1'
            }
        ]
        
        # Créer des embeddings factices pour les profils
        profile_embeddings = [
            [0.1, 0.2, 0.3, 0.4, 0.5],  # tech_user1
            [0.2, 0.3, 0.4, 0.5, 0.6],  # data_scientist1
            [0.6, 0.7, 0.8, 0.9, 1.0],  # designer1
            [0.3, 0.4, 0.5, 0.6, 0.7]   # writer1
        ]
        
        logger.info("🚀 Démonstration de l'intégration LDAOptimizedPipeline")
        logger.info("=" * 60)
        
        # Test 1: Utilisation du pipeline LDA seul
        logger.info("\n📊 Test 1: Pipeline LDA seul")
        topic_matrix = await lda_pipeline.run_pipeline(test_profiles)
        
        if topic_matrix is not None:
            logger.info(f"✅ Pipeline LDA réussi: matrice {topic_matrix.shape}")
        else:
            logger.warning("❌ Pipeline LDA échoué")
        
        # Test 2: Intégration avec ProfileClusterer (simulation)
        logger.info("\n🔗 Test 2: Intégration avec ProfileClusterer")
        
        # Créer un ProfileClusterer factice
        class MockClusteringModel:
            def __init__(self):
                self.min_cluster_size = 2
                self.min_samples = 1
            
            def fit_predict(self, embeddings):
                # Clustering factice
                labels = [0, 0, 1, 1]  # 2 clusters
                return labels, self
        
        class MockMemoryManager:
            def cleanup(self):
                pass
        
        class MockProfileProcessor:
            def process_profiles(self, profiles):
                return {
                    'valid_profiles': profiles,
                    'profile_texts': [p['description'] for p in profiles],
                    'profile_embeddings': profile_embeddings
                }
        
        # Créer le clusterer
        clusterer = ProfileClusterer(
            clusterer=MockClusteringModel(),
            memory_manager=MockMemoryManager(),
            fallback_handler=None,
            embedding_model=None
        )
        
        # Injecter le pipeline LDA
        clusterer.set_lda_optimized_pipeline(lda_pipeline)
        
        # Créer un ProfileProcessor
        profile_processor = MockProfileProcessor()
        
        # Tester le clustering avec le pipeline LDA
        logger.info("🔄 Test clustering avec pipeline LDA activé")
        clusters_with_lda = clusterer.cluster_profiles_with_quality_control(
            profile_embeddings=profile_embeddings,
            profiles=test_profiles,
            profile_processor=profile_processor,
            use_lda_pipeline=True,
            cohesion_threshold=0.3,
            min_cluster_size=2
        )
        
        logger.info(f"✅ Clustering avec LDA: {len(clusters_with_lda)} clusters")
        
        # Tester le clustering sans le pipeline LDA
        logger.info("🔄 Test clustering sans pipeline LDA")
        clusters_without_lda = clusterer.cluster_profiles_with_quality_control(
            profile_embeddings=profile_embeddings,
            profiles=test_profiles,
            profile_processor=profile_processor,
            use_lda_pipeline=False,
            cohesion_threshold=0.3,
            min_cluster_size=2
        )
        
        logger.info(f"✅ Clustering sans LDA: {len(clusters_without_lda)} clusters")
        
        # Comparaison des résultats
        logger.info("\n📈 Comparaison des résultats:")
        logger.info(f"   • Avec LDA pipeline: {len(clusters_with_lda)} clusters")
        logger.info(f"   • Sans LDA pipeline: {len(clusters_without_lda)} clusters")
        
        # Afficher les détails des clusters
        for i, cluster in enumerate(clusters_with_lda):
            logger.info(f"   • Cluster {i+1}: {cluster['size']} profils, cohésion: {cluster.get('cohesion', 'N/A')}")
        
        logger.info("\n🎉 Démonstration terminée avec succès!")
        logger.info("💡 Le LDAOptimizedPipeline est maintenant intégré dans ProfileClusterer")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur dans la démonstration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(demonstrate_lda_integration())
    if result:
        print("\n✅ Intégration LDA réussie!")
    else:
        print("\n❌ Intégration LDA échouée!")
