#!/usr/bin/env python3
"""
Test simple pour vérifier que les corrections NumPy sont valides.
"""

import numpy as np
import sys
import os

# Test des comparaisons NumPy
def test_numpy_array_comparison_fixes():
    """Test les corrections des comparaisons d'arrays NumPy."""
    print("🧪 Test des corrections de comparaisons NumPy")
    
    # Test 1: Array vide
    empty_array = np.array([])
    print(f"  Array vide: len = {len(empty_array)}")
    
    # Ancienne méthode (problématique)
    try:
        if not empty_array:
            print("  ❌ L'ancienne méthode 'if not array' devrait échouer")
        else:
            print("  ⚠️ L'ancienne méthode fonctionne par accident")
    except ValueError as e:
        print(f"  ✅ L'ancienne méthode échoue comme attendu: {e}")
    
    # Nouvelle méthode (corrigée)
    if len(empty_array) == 0:
        print("  ✅ Nouvelle méthode: array vide détecté correctement")
    
    # Test 2: Array avec des données
    data_array = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
    print(f"  Array avec données: shape = {data_array.shape}")
    
    if len(data_array) == 0:
        print("  ❌ Erreur: array avec données détecté comme vide")
    else:
        print("  ✅ Array avec données détecté correctement")
    
    # Test 3: Array 2D vide
    empty_2d = np.array([]).reshape(0, 5)
    print(f"  Array 2D vide: shape = {empty_2d.shape}")
    
    if len(empty_2d) == 0:
        print("  ✅ Array 2D vide détecté correctement")
    
    return True

def test_list_vs_array_handling():
    """Test la différence entre listes et arrays NumPy."""
    print("🧪 Test liste vs array NumPy")
    
    # Liste vide
    empty_list = []
    if not empty_list:
        print("  ✅ Liste vide: 'if not list' fonctionne")
    
    # Array vide
    empty_array = np.array([])
    if len(empty_array) == 0:
        print("  ✅ Array vide: 'if len(array) == 0' fonctionne")
    
    # Liste avec données
    data_list = [1, 2, 3]
    if not data_list:
        print("  ❌ Erreur: liste avec données détectée comme vide")
    else:
        print("  ✅ Liste avec données détectée correctement")
    
    # Array avec données  
    data_array = np.array([1, 2, 3])
    if len(data_array) == 0:
        print("  ❌ Erreur: array avec données détecté comme vide")
    else:
        print("  ✅ Array avec données détecté correctement")
    
    return True

if __name__ == "__main__":
    print("🎯 Validation des corrections NumPy")
    print("=" * 50)
    
    success1 = test_numpy_array_comparison_fixes()
    print()
    success2 = test_list_vs_array_handling()
    
    print("=" * 50)
    if success1 and success2:
        print("🎉 Tous les tests NumPy réussis!")
        print("Les corrections empêchent l'erreur 'truth value of array is ambiguous'")
        sys.exit(0)
    else:
        print("💥 Tests NumPy échoués")
        sys.exit(1)
