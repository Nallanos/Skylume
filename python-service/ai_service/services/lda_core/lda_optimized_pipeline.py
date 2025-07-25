"""
Pipeline LDA optimisé suivant le plan détaillé de how_to_use_lda.md
Orchestration des processors pour minimiser la perplexité et maximiser la qualité des topics.
"""

import logging
import os
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

# Import new TextCleaner
from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('lda_optimized_pipeline')

@dataclass
class LDAPipelineConfig:
    """Configuration pour le pipeline LDA optimisé."""
    max_profiles: int = 50
    min_text_length: int = 200  # Minimum de mots par document utilisateur
    bluesky_handle: Optional[str] = None
    bluesky_password: Optional[str] = None
    n_topics: Optional[int] = None  # Auto-déterminé si None
    
class LDAOptimizedPipeline:
    """
    Pipeline LDA optimisé suivant les recommandations de how_to_use_lda.md
    """
    
    def __init__(self, config: LDAPipelineConfig):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Initialize new ProfileProcessor and TextCleaner
        self.text_cleaner = TextCleaner(
            remove_stopwords=True,
            lemmatize=True,
            remove_urls=True,
            remove_emails=True,
            remove_mentions=True,
            remove_hashtags=False,  # Keep hashtags for topic modeling
            normalize_whitespace=True,
            min_word_length=3,
            max_word_length=50
        )
        
        self.profile_processor = None  # Will be initialized in _initialize_processors
        self.lda_topic_modeler = None
        
        self.logger.info("🚀 LDA Optimized Pipeline initialized with enhanced text processing")
    
    def _initialize_processors(self):
        """Initialise tous les processors nécessaires."""
        try:
            from ai_service.services.lda_core.lda_topic_modeler import LDATopicModeler
            from ai_service.services.dependency_factory import DependencyFactory
            
            # Import des dépendances
            from bluesky.api import AccountService
            from atproto import Client
            
            # Setup AccountService si credentials disponibles
            client = Client()
            account_service = AccountService(client)
            
            # Initialize ProfileProcessor using DependencyFactory
            self.profile_processor = DependencyFactory.get_profile_processor(
                embedding_model=None,  # Will be set if needed
                text_cleaner=self.text_cleaner,
                memory_manager=None,  # Will be set if needed
                account_service=account_service
            )
            
            # Authenticate if credentials are provided
            if self.config.bluesky_handle and self.config.bluesky_password:
                success = self.profile_processor.authenticate(
                    self.config.bluesky_handle, 
                    self.config.bluesky_password
                )
                if success:
                    self.logger.info("✅ ProfileProcessor authenticated with Bluesky API")
                else:
                    self.logger.warning("⚠️ ProfileProcessor authentication failed")
            
            self.lda_topic_modeler = LDATopicModeler(self.logger)
            
            self.logger.info("✅ All processors initialized successfully via DependencyFactory")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error initializing processors: {e}")
            return False
    
    async def run_pipeline(self, profiles: List[Dict[str, Any]]) -> Optional[Any]:
        """
        Exécute le pipeline LDA optimisé complet.
        
        Args:
            profiles: Liste des profils à analyser
            
        Returns:
            Matrice des topics ou None si échec
        """
        if not self._initialize_processors():
            return None
        
        self.logger.info(f"🎯 Starting LDA pipeline for {len(profiles)} profiles")
        
        # Étape 1: Enrichissement des profils avec l'API
        self.logger.info("📥 Step 1: Profile enrichment with API data")
        enriched_profiles = await self._enrich_profiles_with_new_processor(profiles)
        
        # Étape 2: Validation et filtrage
        self.logger.info("🔍 Step 2: Profile validation and filtering")
        valid_profiles = self._validate_and_filter_profiles_with_new_processor(enriched_profiles)
        
        # Étape 3: Extraction et nettoyage du texte
        self.logger.info("🧹 Step 3: Text extraction and cleaning")
        texts = self._extract_and_clean_texts_with_new_processor(valid_profiles)
        
        # Étape 4: Construction du corpus
        self.logger.info("📚 Step 4: Corpus construction")
        corpus = self._build_corpus(texts)
        
        # Étape 5: Modélisation LDA
        self.logger.info("🧠 Step 5: LDA modeling")
        topic_matrix = self._run_lda_modeling(corpus)
        
        # Étape 6: Évaluation et export
        self.logger.info("📊 Step 6: Evaluation and export")
        self._evaluate_and_export(topic_matrix, corpus)
        
        self.logger.info("🎉 LDA pipeline completed successfully")
        return topic_matrix
    
    async def _enrich_profiles_with_new_processor(self, profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Étape 1: Enrichissement des profils avec le nouveau ProfileProcessor."""
        try:
            if not self.profile_processor:
                self.logger.warning("ProfileProcessor not initialized, skipping enrichment")
                return profiles
            
            # Convert dict profiles to ProfileView objects if needed
            profile_views = []
            for profile in profiles:
                if isinstance(profile, dict):
                    # Create a simple object with the required attributes
                    class SimpleProfile:
                        def __init__(self, data):
                            for key, value in data.items():
                                setattr(self, key, value)
                    profile_views.append(SimpleProfile(profile))
                else:
                    profile_views.append(profile)
            
            # Use ProfileProcessor to enrich profiles
            enriched_profiles = []
            for profile_view in profile_views:
                try:
                    enriched_data = self.profile_processor.enrich_profile(profile_view)
                    enriched_profiles.append(enriched_data)
                except Exception as e:
                    self.logger.warning(f"Failed to enrich profile {getattr(profile_view, 'handle', 'unknown')}: {e}")
                    # Fall back to original profile data
                    if isinstance(profile_view, dict):
                        enriched_profiles.append(profile_view)
                    else:
                        enriched_profiles.append(profile_view.__dict__)
            
            self.logger.info(f"✅ Enriched {len(enriched_profiles)} profiles with new ProfileProcessor")
            return enriched_profiles
            
        except Exception as e:
            self.logger.warning(f"Profile enrichment failed: {e}, proceeding with original profiles")
            return profiles
    
    def _validate_and_filter_profiles_with_new_processor(self, profiles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Étape 2: Validation et filtrage des profils avec le nouveau ProfileProcessor."""
        try:
            if not self.profile_processor:
                self.logger.warning("ProfileProcessor not initialized, skipping validation")
                return profiles
            
            valid_profiles = []
            for profile in profiles:
                try:
                    # Convert dict to simple object if needed
                    if isinstance(profile, dict):
                        class SimpleProfile:
                            def __init__(self, data):
                                for key, value in data.items():
                                    setattr(self, key, value)
                        profile_obj = SimpleProfile(profile)
                    else:
                        profile_obj = profile
                    
                    # Validate using ProfileProcessor
                    if self.profile_processor.validate_profile(profile_obj):
                        valid_profiles.append(profile)
                    else:
                        self.logger.debug(f"Profile {getattr(profile_obj, 'handle', 'unknown')} failed validation")
                        
                except Exception as e:
                    self.logger.warning(f"Error validating profile: {e}")
                    continue
            
            self.logger.info(f"✅ Filtered to {len(valid_profiles)} valid profiles (from {len(profiles)})")
            return valid_profiles
            
        except Exception as e:
            self.logger.warning(f"Profile validation failed: {e}, proceeding with all profiles")
            return profiles
    
    def _extract_and_clean_texts_with_new_processor(self, profiles: List[Dict[str, Any]]) -> List[str]:
        """Étape 3: Extraction et nettoyage du texte avec le nouveau ProfileProcessor."""
        try:
            if not self.profile_processor:
                self.logger.warning("ProfileProcessor not initialized, using fallback text extraction")
                return self._fallback_text_extraction(profiles)
            
            profile_texts = []
            for profile in profiles:
                try:
                    # Convert dict to simple object if needed
                    if isinstance(profile, dict):
                        class SimpleProfile:
                            def __init__(self, data):
                                for key, value in data.items():
                                    setattr(self, key, value)
                        profile_obj = SimpleProfile(profile)
                    else:
                        profile_obj = profile
                    
                    # Extract text using ProfileProcessor
                    bio_text, posts_text, following_bio_text = self.profile_processor.extract_profile_text(profile_obj)
                    
                    # Combine all text sources
                    combined_text = f"{bio_text} {' '.join(posts_text)} {' '.join(following_bio_text)}"
                    
                    # Additional cleaning for LDA
                    if combined_text.strip():
                        # Remove extra whitespace and normalize
                        import re
                        combined_text = re.sub(r'\s+', ' ', combined_text).strip()
                        
                        # Check minimum length for LDA
                        if len(combined_text.split()) >= 10:  # Minimum 10 words
                            profile_texts.append(combined_text)
                        else:
                            self.logger.debug(f"Profile text too short for LDA: {len(combined_text.split())} words")
                    
                except Exception as e:
                    self.logger.warning(f"Error extracting text from profile: {e}")
                    continue
            
            self.logger.info(f"✅ Extracted {len(profile_texts)} text documents for LDA")
            return profile_texts
            
        except Exception as e:
            self.logger.warning(f"Text extraction failed: {e}, using fallback")
            return self._fallback_text_extraction(profiles)
    
    def _fallback_text_extraction(self, profiles: List[Dict[str, Any]]) -> List[str]:
        """Fallback text extraction method."""
        texts = []
        for profile in profiles:
            try:
                text_parts = []
                if isinstance(profile, dict):
                    if 'description' in profile and profile['description']:
                        text_parts.append(profile['description'])
                    if 'display_name' in profile and profile['display_name']:
                        text_parts.append(profile['display_name'])
                else:
                    if hasattr(profile, 'description') and profile.description:
                        text_parts.append(profile.description)
                    if hasattr(profile, 'display_name') and profile.display_name:
                        text_parts.append(profile.display_name)
                
                if text_parts:
                    combined_text = ' '.join(text_parts)
                    if self.text_cleaner:
                        combined_text = self.text_cleaner.clean(combined_text)
                    texts.append(combined_text)
                    
            except Exception as e:
                self.logger.warning(f"Error in fallback text extraction: {e}")
                continue
        
        return texts
    
    def _build_corpus(self, profile_texts: List[str]) -> List[str]:
        """Étape 4: Construction du corpus."""
        try:
            # Filtrage final des textes vides
            corpus = [text for text in profile_texts if text and text.strip()]
            
            self.logger.info(f"✅ Corpus built with {len(corpus)} documents")
            
            # Statistiques du corpus
            total_words = sum(len(text.split()) for text in corpus)
            avg_words = total_words / len(corpus) if corpus else 0
            self.logger.info(f"📊 Corpus stats: {total_words} total words, {avg_words:.1f} avg words per document")
            
            return corpus
            
        except Exception as e:
            self.logger.error(f"Corpus construction failed: {e}")
            return []
    
    def _run_lda_modeling(self, corpus: List[str]) -> Optional[Any]:
        """Étape 5: Modélisation LDA."""
        try:
            if not corpus:
                self.logger.error("Empty corpus, cannot run LDA")
                return None
            
            # Utilisation de la classe LDATopicModeler optimisée
            topic_matrix = self.lda_topic_modeler.build_topic_matrix(
                corpus, 
                n_topics=self.config.n_topics
            )
            
            if topic_matrix is not None:
                self.logger.info(f"✅ LDA modeling completed: {topic_matrix.shape}")
            else:
                self.logger.error("❌ LDA modeling failed")
            
            return topic_matrix
            
        except Exception as e:
            self.logger.error(f"LDA modeling failed: {e}")
            return None
    
    def _evaluate_and_export(self, topic_matrix: Optional[Any], corpus: List[str]):
        """Étape 6: Évaluation et export."""
        try:
            if topic_matrix is None:
                self.logger.warning("No topic matrix to evaluate")
                return
            
            # Informations sur la matrice des topics
            self.logger.info(f"📊 Topic matrix shape: {topic_matrix.shape}")
            self.logger.info(f"📊 Corpus size: {len(corpus)} documents")
            
            # Statistiques avancées si disponibles
            if hasattr(topic_matrix, 'mean'):
                mean_topic_prob = topic_matrix.mean()
                self.logger.info(f"📊 Mean topic probability: {mean_topic_prob:.3f}")
            
            # TODO: Ajouter export des topics vers fichier si besoin
            self.logger.info("✅ Evaluation completed")
            
        except Exception as e:
            self.logger.warning(f"Evaluation failed: {e}")

# Fonction utilitaire pour tester le pipeline
async def test_lda_pipeline():
    """Teste le pipeline LDA avec des profils d'exemple."""
    
    # Configuration
    config = LDAPipelineConfig(
        max_profiles=15,
        min_text_length=50,  # Réduit pour les tests
        bluesky_handle=os.getenv('BLUESKY_HANDLE'),
        bluesky_password=os.getenv('BLUESKY_PASSWORD')
    )
    
    # Profils d'exemple (remplacer par de vrais profils)
    sample_profiles = [
        {
            'handle': 'bsky.app',
            'description': 'The official Bluesky app for social networking',
            'did': 'did:plc:example1'
        },
        {
            'handle': 'jay.bsky.team',
            'description': 'Building the future of social media',
            'did': 'did:plc:example2'
        },
        {
            'handle': 'pfrazee.com',
            'description': 'Developer working on decentralized social protocols',
            'did': 'did:plc:example3'
        }
    ]
    
    # Exécution du pipeline
    pipeline = LDAOptimizedPipeline(config)
    topic_matrix = await pipeline.run_pipeline(sample_profiles)
    
    return topic_matrix

if __name__ == "__main__":
    # Test du pipeline
    result = asyncio.run(test_lda_pipeline())
    if result is not None:
        print(f"✅ Pipeline test completed successfully! Topic matrix shape: {result.shape}")
    else:
        print("❌ Pipeline test failed")
