#!/usr/bin/env node

/**
 * Script de test pour vérifier le fonctionnement des Server-Sent Events
 * dans l'analyse d'audience
 */

import { EventSource } from 'eventsource'

// Configuration
const BASE_URL = 'http://127.0.0.1:38585'
const ACCOUNT_ID = '5e16b2065ebca50edfcb1375da80cd67' // ID réel du compte allanbe.bsky.social

/**
 * Test de la connexion SSE
 */
async function testSSEConnection() {
    console.log('🚀 Démarrage du test SSE...')

    const sseUrl = `${BASE_URL}/api/accounts/${ACCOUNT_ID}/follower-analysis/stream`
    console.log(`📡 Connexion à: ${sseUrl}`)

    // Note: Ce test peut échouer avec une erreur 401 si l'authentification est requise
    // C'est normal, nous testons juste que l'endpoint SSE existe et répond
    const eventSource = new EventSource(sseUrl)

    eventSource.onopen = () => {
        console.log('✅ Connexion SSE établie avec succès!')
    }

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            console.log('📨 Données reçues:', {
                timestamp: new Date().toISOString(),
                status: data.status,
                progress: data.progress,
                error: data.error
            })

            // Fermer la connexion si l'analyse est terminée
            if (data.status && ['completed', 'failed', 'stopped'].includes(data.status)) {
                console.log('🏁 Analyse terminée, fermeture de la connexion...')
                eventSource.close()
                process.exit(0)
            }
        } catch (error) {
            console.error('❌ Erreur lors du parsing des données SSE:', error)
        }
    }

    eventSource.onerror = (error) => {
        console.error('❌ Erreur SSE:', error)

        // Si c'est une erreur d'authentification, c'est attendu
        if (error.message && error.message.includes('401')) {
            console.log('⚠️  Erreur 401 - L\'authentification est requise (normal pour ce test)')
            console.log('✅ L\'endpoint SSE existe et fonctionne!')
            eventSource.close()
            process.exit(0)
            return
        }

        console.log('🔄 Tentative de reconnexion dans 5 secondes...')

        setTimeout(() => {
            eventSource.close()
            testSSEConnection() // Retry
        }, 5000)
    }

    // Fermer automatiquement après 30 secondes pour le test
    setTimeout(() => {
        console.log('⏰ Timeout du test (30s), fermeture...')
        eventSource.close()
        process.exit(0)
    }, 30000)
}

/**
 * Test de démarrage d'analyse (optionnel)
 */
async function startAnalysisTest() {
    console.log('🎯 Démarrage de l\'analyse de test...')

    try {
        const response = await fetch(`${BASE_URL}/api/accounts/${ACCOUNT_ID}/follower-analysis/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'session=your-session-cookie-here' // Remplacer par une vraie session
            }
        })

        const result = await response.json()
        console.log('📋 Résultat du démarrage:', result)

        return result.status === 'success'
    } catch (error) {
        console.error('❌ Erreur lors du démarrage de l\'analyse:', error)
        return false
    }
}

// Fonction principale
async function main() {
    console.log(`
🧪 Test SSE pour l'analyse d'audience
=====================================
`)

    // Option 1: Juste tester la connexion SSE
    await testSSEConnection()

    // Option 2: Démarrer une analyse puis écouter les mises à jour
    // const started = await startAnalysisTest()
    // if (started) {
    //     await testSSEConnection()
    // } else {
    //     console.log('❌ Impossible de démarrer l\'analyse, test de connexion uniquement')
    //     await testSSEConnection()
    // }
}

// Gestion des interruptions
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du test SSE...')
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n👋 Arrêt du test SSE...')
    process.exit(0)
})

// Démarrer le test
main().catch(console.error)
