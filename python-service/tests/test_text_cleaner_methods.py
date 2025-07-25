#!/usr/bin/env python3
"""
Test simple pour vérifier que TextCleaner a toutes les méthodes attendues.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from ai_service.services.semantic_clustering.processors.text_cleaner import TextCleaner
    
    print("🔍 Test des méthodes TextCleaner...")
    
    # Initialiser TextCleaner
    text_cleaner = TextCleaner()
    print(f"✅ TextCleaner initialisé")
    
    # Vérifier les méthodes nouvellement ajoutées
    required_methods = [
        'compute_cosine_similarity',
        'is_text_relevant_to_bio', 
        'filter_relevant_texts',
        'is_semantically_informative'
    ]
    
    missing_methods = []
    for method in required_methods:
        if hasattr(text_cleaner, method):
            print(f"✅ Méthode {method} présente")
        else:
            print(f"❌ Méthode {method} MANQUANTE")
            missing_methods.append(method)
    
    if missing_methods:
        print(f"\n❌ {len(missing_methods)} méthode(s) manquante(s): {', '.join(missing_methods)}")
        sys.exit(1)
    else:
        print("\n✅ Toutes les méthodes requises sont présentes")
        
        # Test rapide de fonctionnement
        print("\n🧪 Test rapide de fonctionnement...")
        
        # Test compute_cosine_similarity
        similarity = text_cleaner.compute_cosine_similarity("AI research", "machine learning research")
        print(f"✅ Similarité cosinus: {similarity:.3f}")
        
        # Test filter_relevant_texts
        bio = "AI researcher"
        posts = ["Working on neural networks", "Had coffee today", "Deep learning progress"]
        relevant = text_cleaner.filter_relevant_texts(bio, posts, max_texts=2, threshold=0.3)
        print(f"✅ Textes pertinents: {len(relevant)}")
        
        print("\n🎉 TextCleaner fonctionne correctement!")
        
except ImportError as e:
    print(f"❌ Erreur d'import: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Erreur inattendue: {e}")
    sys.exit(1)
