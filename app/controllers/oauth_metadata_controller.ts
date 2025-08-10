import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

export default class OAuthMetadataController {
  /**
   * Serve OAuth client metadata document
   * This endpoint provides the OAuth client metadata required by Bluesky
   */
  async metadata({ response }: HttpContext) {
    const clientId = env.get('BLUESKY_OAUTH_CLIENT_ID')
    const redirectUri = env.get('BLUESKY_OAUTH_REDIRECT_URI')
    const appUrl = env.get('APP_URL', 'http://127.0.0.1:8081')
    
    const metadata = {
      client_id: clientId,
      client_name: 'Bluesky Copilot',
      client_uri: appUrl,
      redirect_uris: [redirectUri],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'client_secret_basic',
      application_type: 'web',
      dpop_bound_access_tokens: true,
      scope: 'atproto transition:generic',
    }

    response.header('Content-Type', 'application/json')
    response.header('Access-Control-Allow-Origin', '*')
    
    return metadata
  }
}
