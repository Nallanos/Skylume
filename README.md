# Skylume

Skylume automates Bluesky accounts: post scheduling, multi-account management, engagement analytics, growth tools, and DM campaigns. It's free and open source.

Live at **[skylume.duckdns.org](https://skylume.duckdns.org/)**.

## Backstory

I built this over about a year, expecting it to become a paid product. By the time I actually looked at what the roughly 33 users I'd gotten were telling me, the pattern was clear: Bluesky's whole appeal is that it isn't Twitter, and growth automation is one of the things people came there to get away from. So it's free now instead of a product I was still trying to sell to a market that didn't want it.

An earlier version also included a Python service for ML-based audience clustering — semantic embeddings, HDBSCAN clustering, topic modeling. It worked, technically, but was too slow for real-time use and the clusters weren't clean enough to build a feature on top of. It's archived in `python-service/` and isn't part of the running app; see that directory's own README for details.

## Self-hosting

```bash
git clone https://github.com/Nallanos/Skylume.git
cd Skylume
npm install

cp .env.example .env
# fill in PostgreSQL, Redis, and Bluesky API credentials

node ace migration:run
npm run dev          # AdonisJS backend + React frontend
node ace queue:work   # BullMQ worker, needed for scheduled posts
```

## Architecture

- **Backend**: AdonisJS (TypeScript), PostgreSQL, Redis
- **Frontend**: React via Inertia.js (SSR), Tailwind CSS, shadcn/ui
- **Queue**: BullMQ for scheduling and background jobs
- **`python-service/`**: archived clustering experiment, not used in production

## Status

Not actively developed, but online and free to use. Bug fixes and small improvements are welcome; feel free to fork it if you want to take it further.

## License

MIT.

## Contact

benameurallan06@gmail.com
