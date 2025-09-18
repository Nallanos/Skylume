# Domain Migration: bluesky-bot.com → skylume.app

## Overview
The application has been migrated from `bluesky-bot.com` to `skylume.app` while maintaining backward compatibility during the transition period.

## Changes Made

### Frontend Updates
- Updated meta tags in `inertia/pages/home.tsx`:
  - OpenGraph URL: `https://skylume.app`
  - Canonical URL: `https://skylume.app`
  - Schema markup URLs: `https://skylume.app`

### Configuration Updates
- **CORS** (`config/cors.ts`): Added support for both domains:
  - New primary: `skylume.app`, `www.skylume.app`
  - Backward compatibility: `bluesky-bot.com`, `www.bluesky-bot.com`
- **CSP** (`config/shield.ts`): Added WebSocket support for new domain
- **Sitemap** (`public/sitemap.xml`): All URLs updated to `skylume.app`
- **Robots.txt** (`public/robots.txt`): Sitemap reference updated

### Deployment Configuration
- Updated Docker Compose files for the new domain in Traefik routing

## Backward Compatibility
- CORS policy accepts requests from both old and new domains
- WebSocket connections supported for both domains
- No breaking changes for existing users

## Environment Variables
For production deployment, update:
```bash
APP_URL=https://skylume.app
```

## DNS Migration Checklist
- [ ] Point `skylume.app` DNS to the application servers
- [ ] Update SSL certificates for the new domain
- [ ] Set up 301 redirects from `bluesky-bot.com` to `skylume.app` (optional)
- [ ] Update external integrations and APIs with new domain
- [ ] Monitor traffic and update any remaining hardcoded references

## Post-Migration
After the migration is complete and stable, the old domain references in CORS and CSP can be removed.