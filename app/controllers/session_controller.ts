import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'

@inject()
export default class SessionController {
    constructor() { }

    public async logout({ auth, response, session }: HttpContext) {
        try {
            const user = await auth.user
            
            if (user) {
                const oauthTokenKey = `oauth_tokens:${user.id}`
                await redis.del(oauthTokenKey)
                
                const oauthStateKeys = await redis.keys(`oauth_state:${user.id}:*`)
                if (oauthStateKeys.length > 0) {
                    await redis.del(...oauthStateKeys)
                }
            }
            
            session.clear()
            await auth.use('web').logout()

            return response.redirect('/')
        } catch (error) {
            console.error('Logout error:', error)
            session.clear()
            return response.redirect('/')
        }
    }

    public async deleteUser({ auth, response, session }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) throw new Error("User not found")
            
            console.log(`[DELETE USER] Starting account deletion for user: ${user.id}`)
            
            const oauthTokenKey = `oauth_tokens:${user.id}`
            await redis.del(oauthTokenKey)
            
            const oauthStateKeys = await redis.keys(`oauth_state:${user.id}:*`)
            if (oauthStateKeys.length > 0) {
                await redis.del(...oauthStateKeys)
            }
            
            session.clear()
            await user.delete()
            
            console.log(`[DELETE USER] ✅ User ${user.id} deleted successfully`)
            
            return response.redirect('/')
        } catch (error) {
            console.error('Delete user error:', error)
            return response.redirect('/')
        }
    }

    /**
     * Get current session info including OAuth status
     */
    public async status({ auth, response }: HttpContext) {
        try {
            const user = await auth.user
            
            if (!user) {
                return response.json({
                    authenticated: false,
                    user: null,
                    oauth: false
                })
            }

            // Check if user has OAuth tokens
            const oauthTokenKey = `oauth_tokens:${user.id}`
            const oauthTokens = await redis.get(oauthTokenKey)
            
            return response.json({
                    authenticated: true,
                    user: {
                        id: user.id,
                    },
                    oauth: !!oauthTokens,
                    authMethod: oauthTokens ? 'oauth' : 'app_password'
                })
        } catch (error) {
            console.error('Session status error:', error)
            return response.json({
                authenticated: false,
                user: null,
                oauth: false,
                error: 'Session check failed'
            })
        }
    }

    /**
     * Refresh OAuth tokens if needed
     */
    public async refreshOAuth({ auth, response }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) {
                return response.status(401).json({ error: 'Not authenticated' })
            }

            const oauthTokenKey = `oauth_tokens:${user.id}`
            const tokenData = await redis.get(oauthTokenKey)
            
            if (!tokenData) {
                return response.status(404).json({ error: 'No OAuth tokens found' })
            }

            const tokens = JSON.parse(tokenData)
            
            if (tokens.refresh_token && this.shouldRefreshToken(tokens)) {
                return response.json({
                    success: true,
                    message: 'Tokens refreshed'
                })
            }

            return response.json({
                success: true,
                message: 'Tokens still valid'
            })
        } catch (error) {
            console.error('OAuth refresh error:', error)
            return response.status(500).json({ error: 'Token refresh failed' })
        }
    }

    /**
     * Determine if token should be refreshed (expires within 5 minutes)
     */
    private shouldRefreshToken(tokens: any): boolean {
        if (!tokens.expires_at) return false
        
        const expiresAt = new Date(tokens.expires_at).getTime()
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        
        return (expiresAt - now) < fiveMinutes
    }
}
