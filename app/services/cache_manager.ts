import Redis from '@adonisjs/redis/services/main'

/**
 * Service de gestion de cache utilisant Redis
 * Permet de mettre en cache des données pour accélérer les requêtes fréquentes
 */
export class CacheManager {
    /**
     * Récupère une valeur depuis le cache
     * @param key Clé de la donnée dans le cache
     * @returns La donnée si elle existe, null sinon
     */
    public async get(key: string): Promise<any | null> {
        try {
            const cachedData = await Redis.get(key)
            if (!cachedData) return null

            return JSON.parse(cachedData)
        } catch (error) {
            console.error('Erreur lors de la récupération depuis le cache:', error)
            return null
        }
    }

    /**
     * Stocke une valeur dans le cache
     * @param key Clé sous laquelle stocker la donnée
     * @param value Valeur à stocker
     * @param ttlSeconds Durée de vie en secondes (par défaut: 3600s / 1h)
     */
    public async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
        try {
            const serializedValue = JSON.stringify(value)
            await Redis.set(key, serializedValue, 'EX', ttlSeconds)
            return true
        } catch (error) {
            console.error('Erreur lors de la mise en cache:', error)
            return false
        }
    }

    /**
     * Supprime une valeur du cache
     * @param key Clé de la donnée à supprimer
     */
    public async delete(key: string): Promise<boolean> {
        try {
            await Redis.del(key)
            return true
        } catch (error) {
            console.error('Erreur lors de la suppression du cache:', error)
            return false
        }
    }

    /**
     * Vide un ensemble de clés basé sur un motif
     * @param pattern Motif de clés à vider (ex: "user:*")
     */
    public async flushPattern(pattern: string): Promise<boolean> {
        try {
            const keys = await Redis.keys(pattern)
            if (keys.length === 0) return true

            await Redis.del(keys)
            return true
        } catch (error) {
            console.error('Erreur lors du vidage du cache par motif:', error)
            return false
        }
    }

    /**
     * Récupère une valeur depuis le cache ou l'ajoute si elle n'existe pas
     * @param key Clé de la donnée dans le cache
     * @param callback Fonction appelée pour générer la valeur si elle n'existe pas en cache
     * @param ttlSeconds Durée de vie en secondes
     * @returns La valeur en cache ou générée par le callback
     */
    public async remember(key: string, callback: () => Promise<any>, ttlSeconds: number = 3600): Promise<any> {
        const cachedValue = await this.get(key)
        if (cachedValue !== null) return cachedValue

        const freshValue = await callback()
        await this.set(key, freshValue, ttlSeconds)
        return freshValue
    }
}
