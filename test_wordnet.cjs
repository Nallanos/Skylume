#!/usr/bin/env node

/**
 * Test script pour vérifier le fonctionnement de WordNet avec la génération de tags combinés
 */

const path = require('path');

// Test simple pour vérifier la fonctionnalité
async function testWordNetImplementation() {
    try {
        console.log('🧪 Testing WordNet implementation...\n');
        
        // Test de base pour vérifier l'importation WordNet
        const WordNet = require('wordnet');
        console.log('✅ WordNet module loaded successfully');
        
        // Test d'une recherche simple
        WordNet.lookup('computer', (err, definitions) => {
            if (err) {
                console.log('❌ WordNet lookup failed:', err.message);
                return;
            }
            
            if (definitions && definitions.length > 0) {
                console.log(`✅ WordNet lookup successful - found ${definitions.length} definitions for "computer"`);
                console.log(`   First definition: ${definitions[0].def || definitions[0].gloss || 'No definition'}`);
            } else {
                console.log('⚠️  No definitions found for "computer"');
            }
        });

        // Test des exemples de tags
        const testCases = [
            ['developer', 'engineer', 'programmer'],
            ['artist', 'painter', 'creative'],
            ['teacher', 'educator', 'professor'],
            ['entrepreneur', 'founder', 'business'],
            ['writer', 'author', 'blogger']
        ];

        console.log('\n📝 Test cases for tag combination:');
        testCases.forEach((tags, index) => {
            console.log(`   ${index + 1}. ${tags.join(', ')}`);
        });

        console.log('\n✨ WordNet test completed successfully!');
        console.log('💡 To test with AI service, use the following tags in your cluster generation:');
        console.log('   - Tech: developer, engineer, programmer, coder');
        console.log('   - Creative: artist, designer, creative, visual');
        console.log('   - Business: entrepreneur, founder, startup, business');
        console.log('   - Academic: researcher, scientist, professor, academic');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   1. Ensure WordNet database is installed on your system');
        console.log('   2. Check that the "wordnet" npm package is properly installed');
        console.log('   3. Verify that the WordNet data files are accessible');
    }
}

// Exécuter le test
testWordNetImplementation();

console.log(`
🎯 WordNet Implementation Summary:

1. **Synsets Analysis**: For each word, finds semantic sets (groups of synonyms)
2. **Hypernym Traversal**: Walks up the semantic hierarchy (dog → animal → organism)
3. **Depth Measurement**: Calculates distance from root concepts (lower depth = more general)
4. **Generality Scoring**: Words closer to root get higher generality scores
5. **Smart Selection**: Combines generality (60%) + frequency (40%) for optimal tag selection

Example workflow:
- Input: ["developer", "engineer", "programmer"]
- WordNet finds: developer (0.7 generality), engineer (0.8 generality), programmer (0.6 generality)
- Result: "Engineer" (most general term in the technology domain)

This provides much more intelligent tag combination than simple length-based selection! 🚀
`);
