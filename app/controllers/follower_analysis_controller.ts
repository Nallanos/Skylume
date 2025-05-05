import type { HttpContext } from '@adonisjs/core/http'
import Account from '#models/account'
import * as tf from '@tensorflow/tfjs';
import AccountService from '#services/account_service';
import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import SuperCluster from '#models/superCluster'
import Cluster from '#models/cluster'
import account_manager from '#services/account_manager';
import { inject } from '@adonisjs/core'
import websocketService from '#services/websocket_service'

@inject()
export default class FollowerAnalysisController {
    public async AnalyzeFollowers({ request, response, auth, inertia }: HttpContext) {
        const user = auth.user

        if (!user) {
            console.error("User not authenticated")
            return response.redirect("/dashboard")
        }

        const accountId = request.params().id
        const account = await Account.findOrFail(accountId)
        const accountService = await account_manager.getOrCreateAccountService(account)
        if (!account) {
            return response.redirect("/dashboard")
        }

        await accountService.createOrResumeSession(account)
        const followersCount = await accountService.getFollowersCount(account)

        if (followersCount == account.numbersOfFollowersAnalyzed) {
            return response.redirect().back()
        }

        // Récupérer les données des clusters depuis le service Python
        const clustersData = await this.processPython(accountService, account)
        console.log('Clusters data from Python service:', clustersData)

        // Récupérer les super clusters existants pour ce compte
        const superClusters = await SuperCluster.query()
            .where("accountId", account.id)

        // Traitement des clusters et association avec les super clusters
        const clusterResults = []

        for (const cluster of clustersData) {
            let matchedSuperCluster: SuperCluster | null = null
            let maxSimilarity = 0

            // Recherche du super cluster le plus similaire
            for (const superCluster of superClusters) {
                const similarity = this.cosineSimilarityTF(cluster.embedding, superCluster.embedding)

                if (similarity > 0.6 && similarity > maxSimilarity) {
                    matchedSuperCluster = superCluster
                    maxSimilarity = similarity
                }
            }

            if (matchedSuperCluster) {
                // Ajouter ce cluster au super cluster existant
                const newCluster = await Cluster.create({
                    accountId: account.id,
                    tag: cluster.tag,
                    handles: cluster.handles,
                    embedding: cluster.embedding,
                    size: cluster.size,
                    superClusterId: matchedSuperCluster.id
                })

                // Mise à jour de l'embedding du super cluster (moyenné)
                matchedSuperCluster.embedding = this.averageEmbedding(
                    matchedSuperCluster.embedding,
                    cluster.embedding,
                    matchedSuperCluster.size,
                    cluster.size
                )
                matchedSuperCluster.size += cluster.size
                await matchedSuperCluster.save()

                // Préparer les données pour le WebSocket
                clusterResults.push({
                    ...cluster,
                    clusterType: 'existing',
                    superClusterId: matchedSuperCluster.id
                })
            } else {
                // Créer un nouveau super cluster
                const newSuperCluster = await SuperCluster.create({
                    accountId: account.id,
                    embedding: cluster.embedding,
                    size: cluster.size,
                    tag: cluster.tag // Ajouter le tag au super cluster également
                })

                const newCluster = await Cluster.create({
                    accountId: account.id,
                    tag: cluster.tag,
                    handles: cluster.handles,
                    embedding: cluster.embedding,
                    size: cluster.size,
                    superClusterId: newSuperCluster.id
                })

                // Préparer les données pour le WebSocket
                clusterResults.push({
                    ...cluster,
                    clusterType: 'new',
                    superClusterId: newSuperCluster.id
                })
            }
        }

        // Envoyer les données des clusters via WebSocket
        if (clusterResults.length > 0) {
            // Activation de la fonctionnalité WebSocket
            websocketService.emit('clusters:update', {
                accountId: account.id,
                clusters: clusterResults
            }, `account-${account.id}`)
            console.log(`${clusterResults.length} clusters générés pour ${account.handle}`);
        }

        // Rendre la page avec les données initiales des clusters
        return inertia.render("AiAnalysis", {
            account_insights: [{
                category: 'audience',
                insights: {
                    topInterests: clustersData.map(cluster => cluster.tag).slice(0, 5),
                    activeHours: ['9AM-11AM', '7PM-10PM'],
                    demographicTrends: `${account.numbersOfFollowersAnalyzed} followers analyzed across ${clustersData.length} clusters`
                }
            }],
            content_suggestions: clustersData.slice(0, 3).map(cluster => ({
                title: `Content for ${cluster.tag} audience`,
                description: `This cluster has ${cluster.size} followers. Consider creating content that appeals to this interest group.`,
                type: 'topic'
            })),
            clusters: clusterResults
        })
    }

    private cosineSimilarityTF(a: number[], b: number[]): number {
        const vecA = tf.tensor1d(a);
        const vecB = tf.tensor1d(b);

        const sim = tf.losses.cosineDistance(vecA, vecB, 0).dataSync()[0];
        return 1 - sim; // Parce que `cosineDistance` retourne 1 - cosSim
    }

    private averageEmbedding(
        emb1: number[],
        emb2: number[],
        size1: number,
        size2: number
    ): number[] {
        const totalSize = size1 + size2;
        return emb1.map((val, idx) => ((val * size1) + (emb2[idx] * size2)) / totalSize);
    }

    private async processPython(accountService: AccountService, account: Account): Promise<pythonRes[]> {
        let cursor: string | undefined = ''

        const res = await accountService.getFollowers(account, account.handle, cursor)
        cursor = res.cursor
        let followers: ProfileView[] = res.followers

        // Mise à jour du curseur pour l'account
        account.numbersOfFollowersAnalyzed += followers.length
        if (account.followersCursor != cursor && cursor) {
            account.followersCursor = cursor
            await account.save()
        }

        const pythonRes = await fetch("http://0.0.0.0:8000/tagAllAccountFollowers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                account_handle: account.handle,
                followers: followers
            }),
        });

        const data = await pythonRes.json() as pythonRes[]
        return data
    }
}

type pythonRes = {
    tag: string,
    handles: string[],
    embedding: number[]
    size: number
}
