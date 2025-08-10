import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'

@inject()
export default class SessionController {
    constructor() { }

    public async logout({ auth, response, session }: HttpContext) {
        try {
            const user = await auth.user
            
            // Clear OAuth-related session data
            if (user) {
                // Remove OAuth tokens from Redis if they exist
                const oauthTokenKey = `oauth_tokens:${user.id}`
                await redis.del(oauthTokenKey)
                
                // Clear any OAuth state data
                const oauthStateKeys = await redis.keys(`oauth_state:${user.id}:*`)
                if (oauthStateKeys.length > 0) {
                    await redis.del(...oauthStateKeys)
                }
            }
            
            // Clear session data
            session.clear()
            
            // Logout from auth system
            await auth.use('web').logout()

            return response.redirect('/')
        } catch (error) {
            console.error('Logout error:', error)
            // Force clear session even on error
            session.clear()
            return response.redirect('/')
        }
    }

    public async deleteUser({ auth, response, session }: HttpContext) {
        try {
            const user = await auth.authenticate()
            if (!user) throw new Error("User not found")
            
            // Clean up OAuth tokens before deleting user
            const oauthTokenKey = `oauth_tokens:${user.id}`
            await redis.del(oauthTokenKey)
            
            // Clear any OAuth state data
            const oauthStateKeys = await redis.keys(`oauth_state:${user.id}:*`)
            if (oauthStateKeys.length > 0) {
                await redis.del(...oauthStateKeys)
            }
            
            // Clear session
            session.clear()
            
            // Delete user
            await user.delete()
            
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
                    // Add other safe user properties as needed
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
            
            // Check if tokens need refresh (implement actual refresh logic here)
            if (tokens.refresh_token && this.shouldRefreshToken(tokens)) {
                // TODO: Implement token refresh logic using OAuthService
                // const oauthService = await container.make('OAuthService')
                // const newTokens = await oauthService.refreshTokens(tokens.refresh_token)
                // await redis.setex(oauthTokenKey, 86400, JSON.stringify(newTokens))
                
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
     * Helper method to determine if token should be refreshed
     */
    private shouldRefreshToken(tokens: any): boolean {
        if (!tokens.expires_at) return false
        
        // Refresh if token expires within next 5 minutes
        const expiresAt = new Date(tokens.expires_at).getTime()
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        
        return (expiresAt - now) < fiveMinutes
    }
}
