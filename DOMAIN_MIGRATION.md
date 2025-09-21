# Domain Migration: bluesky-bot.com → skylume.app

## Overview
The application has been migrated from `bluesky-bot.com` to `skylume.app` while maintaining backward compatibility during the transition period.

## Changes Made

### Frontend Updates
- Updated meta tags in `inertia/pages/home.tsx`:
  - OpenGraph URL: `https://skylume.app`
  - Canonical URL: `https://skylume.app`
  - Schema markup URLs: `https://skylume.app`
- Updated email addresses across all pages:
  - Contact page: `support@skylume.app`, `sales@skylume.app`
  - Terms page: `support@skylume.app`
  - Privacy page: `privacy@skylume.app`

### Configuration Updates
- **CORS** (`config/cors.ts`): Added support for both domains:
  - New primary: `skylume.app`, `www.skylume.app`
  - Backward compatibility: `bluesky-bot.com`, `www.bluesky-bot.com`
- **CSP** (`config/shield.ts`): Added WebSocket support for new domain
- **Sitemap** (`public/sitemap.xml`): All URLs updated to `skylume.app`
- **Robots.txt** (`public/robots.txt`): Sitemap reference updated

### Server Configuration
- **Domain Redirect Middleware** (`app/middleware/domain_redirect_middleware.ts`): 
  - Automatically redirects old domain requests to new domain in production
  - Uses 301 permanent redirects for SEO benefits
  - Preserves full URLs including query parameters
- **Kernel Configuration** (`start/kernel.ts`): Registered domain redirect middleware

### Deployment Configuration
- Updated Docker Compose files for the new domain in Traefik routing
- Production environment configured with `APP_URL=https://skylume.app`

## Backward Compatibility Features
- CORS policy accepts requests from both old and new domains
- WebSocket connections supported for both domains
- Automatic 301 redirects from old to new domain in production
- No breaking changes for existing users

## Environment Variables
For production deployment, ensure:
```bash
APP_URL=https://skylume.app
NODE_ENV=production
```

## Domain Handling Logic
```typescript
// In production:
// bluesky-bot.com -> 301 redirect to skylume.app
// www.bluesky-bot.com -> 301 redirect to skylume.app
// skylume.app -> serves normally
// www.skylume.app -> serves normally

// In development:
// All domains work without redirects for testing
```

## Email Infrastructure
All email addresses have been updated to use the new domain:
- Support: `support@skylume.app`
- Sales: `sales@skylume.app` 
- Privacy: `privacy@skylume.app`

## DNS Migration Checklist
- [ ] Point `skylume.app` DNS to the application servers
- [ ] Update SSL certificates for the new domain
- [ ] ✅ Set up 301 redirects from `bluesky-bot.com` to `skylume.app` (implemented via middleware)
- [ ] Update external integrations and APIs with new domain
- [ ] Monitor traffic and update any remaining hardcoded references
- [ ] Update email DNS records (MX records) for new domain

## Post-Migration Cleanup
After the migration is complete and stable:
1. The old domain references in CORS and CSP can be removed
2. The domain redirect middleware can be simplified
3. Monitor server logs for any remaining old domain requests

## SEO Considerations
- 301 redirects preserve SEO rankings
- All meta tags use new domain as primary
- Sitemap updated to new domain
- Canonical URLs point to new domain