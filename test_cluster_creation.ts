#!/usr/bin/env node

/**
 * Test script pour vérifier que la création de clusters fonctionne correctement
 * après les modifications apportées au processBatchProgress
 */

import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import { TestDataFactory } from '../tests/factories/test_data_factory.js'
import Account from '#models/account'
import AnalysisAudience from '#models/analysis_audience'
import SuperCluster from '#models/superCluster'
import Cluster from '#models/cluster'

test.group('Cluster Creation from Batch Results', (group) => {
  let apiClient: ApiClient

  group.setup(async () => {
    await testUtils.db().truncate()
    apiClient = new ApiClient('http://localhost:8081')
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('should create clusters when batch analysis completes', async ({ assert }) => {
    // 1. Créer des données de test
    const { accountId, analysisId } = await TestDataFactory.createCompleteTestData()

    // 2. Simuler un batch de résultats avec données de clusters
    const batchResults = {
      totalAnalyzed: 100,
      clustersData: [
        {
          tag: 'Tech Enthusiasts',
          handles: ['techuser1.bsky.social', 'techuser2.bsky.social', 'techuser3.bsky.social'],
          keywords: ['technology', 'coding', 'software', 'programming'],
          embedding: [0.8, 0.2, 0.1, 0.9, 0.3],
          size: 25,
          cohesion: 0.85
        },
        {
          tag: 'Artists & Creators',
          handles: ['artist1.bsky.social', 'creator2.bsky.social', 'designer3.bsky.social'],
          keywords: ['art', 'design', 'creative', 'visual'],
          embedding: [0.1, 0.9, 0.8, 0.2, 0.7],
          size: 18,
          cohesion: 0.78
        },
        {
          tag: 'Content Writers',
          handles: ['writer1.bsky.social', 'blogger2.bsky.social'],
          keywords: ['writing', 'content', 'blog', 'storytelling'],
          embedding: [0.4, 0.3, 0.9, 0.6, 0.8],
          size: 12,
          cohesion: 0.72
        }
      ]
    }

    // 3. Vérifier qu'aucun cluster n'existe avant le test
    const clustersBefore = await Cluster.query().where('accountHandle', 'test-user.bsky.social')
    const superClustersBefore = await SuperCluster.query().where('accountHandle', 'test-user.bsky.social')

    assert.equal(clustersBefore.length, 0, 'Aucun cluster ne devrait exister avant le test')
    assert.equal(superClustersBefore.length, 0, 'Aucun supercluster ne devrait exister avant le test')

    // 4. Simuler la fin d'analyse avec création de clusters
    const completionResponse = await apiClient
      .post('/internal/python/process-batch-progress')
      .json({
        jobId: `test-job-${Date.now()}`,
        analysisId: analysisId.toString(),
        success: true,
        results: batchResults
      })

    // 5. Vérifier la réponse
    console.log('Batch completion response:', completionResponse.response.status, completionResponse.body())

    // 6. Vérifier que les clusters ont été créés
    const clustersAfter = await Cluster.query().where('accountHandle', 'test-user.bsky.social')
    const superClustersAfter = await SuperCluster.query().where('accountHandle', 'test-user.bsky.social')

    console.log(`Clusters créés: ${clustersAfter.length}`)
    console.log(`SuperClusters créés: ${superClustersAfter.length}`)

    // Vérifications
    assert.isAbove(clustersAfter.length, 0, 'Des clusters devraient avoir été créés')
    assert.isAbove(superClustersAfter.length, 0, 'Des superclusters devraient avoir été créés')

    // Vérifier que les tags correspondent
    const clusterTags = clustersAfter.map(c => c.tag).sort()
    const expectedTags = ['Tech Enthusiasts', 'Artists & Creators', 'Content Writers'].sort()

    assert.deepEqual(clusterTags, expectedTags, 'Les tags des clusters devraient correspondre aux données de test')

    // 7. Vérifier l'état de l'analyse
    const analysis = await AnalysisAudience.findOrFail(analysisId)
    assert.equal(analysis.status, 'completed', 'L\'analyse devrait être marquée comme terminée')

    console.log('✅ Test de création de clusters réussi!')
  })

  test('should handle empty batch results gracefully', async ({ assert }) => {
    // Test avec des résultats vides
    const { analysisId } = await TestDataFactory.createCompleteTestData()

    const emptyResults = {
      totalAnalyzed: 50,
      clustersData: []
    }

    const completionResponse = await apiClient
      .post('/internal/python/process-batch-progress')
      .json({
        jobId: `test-job-empty-${Date.now()}`,
        analysisId: analysisId.toString(),
        success: true,
        results: emptyResults
      })

    // Devrait réussir même avec des résultats vides
    if (![200, 201].includes(completionResponse.response.status!)) {
      console.log('Response body:', completionResponse.body())
    }

    assert.oneOf(completionResponse.response.status!, [200, 201], 'Devrait gérer les résultats vides sans erreur')

    console.log('✅ Test de résultats vides réussi!')
  })
})
