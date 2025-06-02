import type { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs.js'
import Account from '#models/account'
import SuperCluster from '#models/superCluster'
import Cluster from '#models/cluster'
import AccountManager from './account_manager.js';
import { inject } from '@adonisjs/core';

@inject()
export default class FollowerAnalysisService {

    constructor(protected account_manager: AccountManager) { }

    public async startAnalysisLoop(account: Account) {
        const loop = async () => {
            const freshAccount = await Account.findOrFail(account.id)
            const account_service = await this.account_manager.getOrCreateAccountService(freshAccount)
            const realFollowerCount = await account_service.getFollowersCount(freshAccount)

            if (freshAccount.numbersOfFollowersAnalyzed >= realFollowerCount) return

            await this.analyzeFollowers(freshAccount)

            setTimeout(() => loop(), 2000)
        }

        await loop()
    }

    /**
     * Analyse les abonnés d'un compte et traite les clusters
     */
    public async analyzeFollowers(account: Account) {
        const clustersData = await this.processPython(account)

        console.log("Clusters data:", clustersData)
        const superClusters = await SuperCluster.query()
            .where('accountHandle', account.handle)

        for (const clusterData of clustersData) {
            let foundSimilarSuperCluster = false

            // Recherche d'un superCluster similaire existant
            for (const superClusterData of superClusters) {

                const cosineSimilarityTF = this.cosineSimilarityTF(clusterData.embedding, superClusterData.embeddings)
                console.log("Comparing:", superClusterData.tag, clusterData.tag)
                if (cosineSimilarityTF > 0.65) {

                    // Si un superCluster similaire existe, on crée un nouveau cluster qui lui est associé
                    await Cluster.create({
                        tag: clusterData.tag,
                        size: clusterData.size,
                        superClusterId: superClusterData.id,
                        handles: clusterData.handles,
                        embeddings: clusterData.embedding,
                        accountHandle: account.handle
                    })
                    foundSimilarSuperCluster = true
                    break
                }
            }

            // Si aucun superCluster similaire n'a été trouvé, on en crée un nouveau
            if (!foundSimilarSuperCluster) {
                console.log("Creating new superCluster for tag:", clusterData.tag)
                const newSuperCluster = await SuperCluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    embeddings: clusterData.embedding,
                    handles: clusterData.handles,
                    accountHandle: account.handle
                })

                // On crée également un cluster associé à ce nouveau superCluster
                await Cluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    superClusterId: newSuperCluster.id,
                    handles: clusterData.handles,
                    embeddings: clusterData.embedding,
                    accountHandle: account.handle
                })
            }
        }
    }

    /**
     * Crée des clusters et superclusters à partir de données déjà traitées
     * Cette méthode est utilisée par le système de batch pour créer les clusters
     * à partir des résultats agrégés de plusieurs batches
     */
    public async createClustersFromData(account: Account, clustersData: ClusterData[]) {
        console.log("Creating clusters from data:", clustersData.length, "clusters")
        const superClusters = await SuperCluster.query()
            .where('accountHandle', account.handle)

        for (const clusterData of clustersData) {
            let foundSimilarSuperCluster = false

            // Recherche d'un superCluster similaire existant
            for (const superClusterData of superClusters) {
                const cosineSimilarityTF = this.cosineSimilarityTF(clusterData.embedding, superClusterData.embeddings)
                console.log("Comparing:", superClusterData.tag, clusterData.tag)
                if (cosineSimilarityTF > 0.65) {

                    // Si un superCluster similaire existe, on crée un nouveau cluster qui lui est associé
                    await Cluster.create({
                        tag: clusterData.tag,
                        size: clusterData.size,
                        superClusterId: superClusterData.id,
                        handles: clusterData.handles,
                        embeddings: clusterData.embedding,
                        accountHandle: account.handle
                    })
                    foundSimilarSuperCluster = true
                    break
                }
            }

            // Si aucun superCluster similaire n'a été trouvé, on en crée un nouveau
            if (!foundSimilarSuperCluster) {
                console.log("Creating new superCluster for tag:", clusterData.tag)
                const newSuperCluster = await SuperCluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    embeddings: clusterData.embedding,
                    handles: clusterData.handles,
                    accountHandle: account.handle
                })

                // On crée également un cluster associé à ce nouveau superCluster
                await Cluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    superClusterId: newSuperCluster.id,
                    handles: clusterData.handles,
                    embeddings: clusterData.embedding,
                    accountHandle: account.handle
                })
            }
        }
    }

    /**
     * Calcule la similarité cosinus entre deux vecteurs
     * Implémentation simple et efficace sans dépendances externes
     */
    private cosineSimilarityTF(a: number[] | unknown, b: number[] | string | unknown): number {
        try {
            // Convertir et valider les entrées
            const vecA = this.normalizeVector(a);
            const vecB = this.normalizeVector(b);

            // Vérifier si les vecteurs sont valides
            if (!vecA.length || !vecB.length) {
                console.warn('Tentative de calcul de similarité avec des vecteurs vides');
                return 0;
            }

            // Utiliser la plus petite dimension commune
            const minLength = Math.min(vecA.length, vecB.length);

            // Calculer le produit scalaire
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;

            for (let i = 0; i < minLength; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }

            // Éviter la division par zéro
            if (normA === 0 || normB === 0) {
                return 0;
            }

            // Formule de similarité cosinus: cos(θ) = (A·B)/(||A||·||B||)
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        } catch (error) {
            console.error('Erreur lors du calcul de similarité cosinus:', error);
            return 0;
        }
    }

    /**
     * Normalise et convertit différents types d'entrées en vecteur numérique
     */
    private normalizeVector(input: any): number[] {
        if (!input) return [];

        // Si c'est déjà un tableau
        if (Array.isArray(input)) {
            return input.filter(val => typeof val === 'number');
        }

        // Si c'est une chaîne JSON
        if (typeof input === 'string') {
            try {
                const parsed = JSON.parse(input);
                return Array.isArray(parsed) ? parsed.filter(val => typeof val === 'number') : [];
            } catch {
                return [];
            }
        }

        return [];
    }

    /**
     * Traite les données via le service Python
     */
    private async processPython(account: Account): Promise<ClusterData[]> {
        // Utiliser le curseur stocké dans le compte s'il existe
        let cursor: string | undefined = account.followersCursor || ''
        const accountService = await this.account_manager.getOrCreateAccountService(account)

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

        try {
            const data = await pythonRes.json() as ClusterData[]

            // Validation des données reçues
            return data.map(cluster => ({
                ...cluster,
                // Assurer que embedding est bien un tableau
                embedding: Array.isArray(cluster.embedding) ? cluster.embedding : [],
                // Assurer que handles est bien un tableau
                handles: Array.isArray(cluster.handles) ? cluster.handles : [],
                // Assurer que size est bien un nombre
                size: typeof cluster.size === 'number' ? cluster.size : 0,
                // Assurer que tag est bien une chaîne
                tag: typeof cluster.tag === 'string' ? cluster.tag : 'unknown'
            }))
        } catch (error) {
            console.error('Error parsing Python service response:', error)
            return []
        }
    }

    /**
     * Lance une boucle d'analyse avancée des followers avec possibilité d'arrêt et gestion des erreurs améliorée
     * 
     * @param account Le compte dont les followers doivent être analysés
     * @param options Options de configuration pour la boucle d'analyse
     * @returns Un objet avec une méthode pour arrêter la boucle d'analyse
     */
    public startEnhancedAnalysisLoop(
        account: Account,
        options: {
            delayBetweenIterations?: number,
            maxIterations?: number,
            onProgress?: (progress: { analyzed: number, total: number, percentage: number }) => void,
            onError?: (error: Error) => void,
            onComplete?: () => void
        } = {}
    ) {
        // Paramètres par défaut
        const delay = options.delayBetweenIterations ?? 2000;
        const maxIterations = options.maxIterations ?? Infinity;

        // État de la boucle
        let isRunning = true;
        let currentIteration = 0;
        let timeoutId: NodeJS.Timeout | null = null;

        // Fonction pour arrêter la boucle
        const stopLoop = () => {
            isRunning = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            console.log('Analyse des followers arrêtée');
        };

        // Fonction principale de la boucle
        const loop = async () => {
            try {
                // Vérifier les conditions d'arrêt
                if (!isRunning || currentIteration >= maxIterations) {
                    options.onComplete?.();
                    return;
                }

                currentIteration++;

                // Récupérer les données fraîches
                const freshAccount = await Account.findOrFail(account.id);
                const accountService = await this.account_manager.getOrCreateAccountService(freshAccount);
                const realFollowerCount = await accountService.getFollowersCount(freshAccount);

                // Calculer la progression
                const analyzed = freshAccount.numbersOfFollowersAnalyzed || 0;
                const percentage = realFollowerCount > 0 ? (analyzed / realFollowerCount) * 100 : 0;

                // Notifier de la progression
                options.onProgress?.({
                    analyzed,
                    total: realFollowerCount,
                    percentage
                });

                // Vérifier si l'analyse est terminée
                if (freshAccount.numbersOfFollowersAnalyzed >= realFollowerCount) {
                    console.log(`Analyse terminée pour ${freshAccount.handle}: ${analyzed}/${realFollowerCount} followers analysés`);
                    options.onComplete?.();
                    return;
                }

                // Effectuer l'analyse
                await this.analyzeFollowers(freshAccount);

                // Programmer la prochaine itération si nous sommes toujours en cours d'exécution
                if (isRunning) {
                    timeoutId = setTimeout(() => loop(), delay);
                }
            } catch (error) {
                console.error(`Erreur lors de l'analyse des followers: ${error.message}`, error);
                options.onError?.(error as Error);

                // Réessayer après un délai plus long en cas d'erreur
                if (isRunning) {
                    timeoutId = setTimeout(() => loop(), delay * 2);
                }
            }
        };

        // Démarrer la boucle
        loop().catch(error => {
            console.error(`Erreur critique lors du démarrage de l'analyse: ${error.message}`, error);
            options.onError?.(error);
        });

        // Retourner l'objet de contrôle
        return {
            stop: stopLoop,
            isRunning: () => isRunning
        };
    }
}

export type ClusterData = {
    tag: string,
    handles: string[],
    keywords: string[],
    embedding: number[]
    size: number,
    cohesion: number,
}

export type ClusterResult = ClusterData & {
    clusterType: 'new' | 'existing',
    superClusterId: number
}

export type AnalysisResult = {
    clusters: ClusterResult[],
    clustersData: ClusterData[],
    account_insights: Array<{
        category: string,
        insights: {
            topInterests: string[],
            activeHours: string[],
            demographicTrends: string
        }
    }>,
    content_suggestions: Array<{
        title: string,
        description: string,
        type: string
    }>
}