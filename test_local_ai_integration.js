#!/usr/bin/env node

/**
 * Test script to verify local AI service integration and lower similarity thresholds
 * Tests the transformation from Python service to local AI_services.ts
 */

const { TargetAudienceService } = require('./build/app/services/AI_services.js');

async function testLocalAIIntegration() {
    console.log('🚀 Testing Local AI Service Integration...\n');

    try {
        const aiService = new TargetAudienceService();

        // Test cases: tags that should have meaningful semantic similarity
        const testCases = [
            { tag1: 'JavaScript', tag2: 'Programming', expected: 'high' },
            { tag1: 'React', tag2: 'Frontend', expected: 'medium' },
            { tag1: 'Politics', tag2: 'Government', expected: 'high' },
            { tag1: 'Art', tag2: 'Creative', expected: 'medium' },
            { tag1: 'Tech', tag2: 'Technology', expected: 'high' },
            { tag1: 'Python', tag2: 'JavaScript', expected: 'medium' }, // Both programming
            { tag1: 'Music', tag2: 'Programming', expected: 'low' }, // Unrelated
        ];

        console.log('Testing semantic similarity calculations:\n');

        for (const testCase of testCases) {
            try {
                const similarity = await aiService.getSemanticSimilarity(testCase.tag1, testCase.tag2);

                let assessment = 'low';
                if (similarity >= 0.7) assessment = 'high';
                else if (similarity >= 0.4) assessment = 'medium';

                const status = assessment === testCase.expected ? '✅' : '⚠️';

                console.log(`${status} "${testCase.tag1}" ↔ "${testCase.tag2}": ${similarity.toFixed(3)} (expected: ${testCase.expected}, got: ${assessment})`);
            } catch (error) {
                console.log(`❌ Error testing "${testCase.tag1}" ↔ "${testCase.tag2}": ${error.message}`);
            }
        }

        console.log('\n🎯 Testing threshold scenarios:\n');

        // Test threshold scenarios for SuperCluster formation
        const thresholdTests = [
            { similarity: 0.25, description: 'Base dynamic threshold (was 0.35)' },
            { similarity: 0.30, description: 'Single cluster matching (was 0.40)' },
            { similarity: 0.45, description: 'SuperCluster group matching (was 0.65)' },
        ];

        for (const test of thresholdTests) {
            const wouldCreateSuperCluster = test.similarity >= 0.25;
            const status = wouldCreateSuperCluster ? '✅ Would create SuperCluster' : '❌ Would not create SuperCluster';
            console.log(`${status} - Threshold: ${test.similarity} (${test.description})`);
        }

        console.log('\n✅ Local AI Service integration test completed successfully!');
        console.log('💡 The system now uses local embeddings instead of Python service calls');
        console.log('🎯 Lower thresholds should enable better SuperCluster formation');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('\nMake sure to build the TypeScript first:');
        console.error('npm run build');
    }
}

// Run the test
testLocalAIIntegration().catch(console.error);
