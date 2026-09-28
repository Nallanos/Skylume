# Skylume 🌌

A marketing tool for Bluesky: post scheduling, multi-account management, audience
analytics and DM campaigns. Built solo, used by 33 people during its commercial phase,
now free and open source ([live version](https://skylume.app)).

## ⚙️ What's under the hood

- **AdonisJS 6 (TypeScript)** backend, PostgreSQL through the Lucid ORM, Redis.
- **BullMQ job queues** with a dedicated worker process: posts are scheduled as delayed
  jobs with automatic retries, and batch operations run in the background. Long-running
  analyses (audience analysis, list creation) stream their progress to the browser over
  Server-Sent Events.
- **Bluesky AT Protocol integration** (`@atproto/api`) with OAuth, several accounts per
  user, and DM conversations through the Bluesky chat API; optional cross-posting to X.
- **Redis-backed rate limiting**, per-plan feature limits (switched off since it went
  free), security headers middleware.
- React front end through Inertia, shipped as a Docker image.

---

## 📜 Project history

**Update: October 2024** - After a year of building growth automation tools for Bluesky, I learned that the platform's community explicitly rejects growth hacking and automation (they came to Bluesky to escape that from Twitter/X). Skylume is no longer a commercial project, but it's staying online and completely free for anyone who wants to use it.

### 🎯 What Happened

I spent a year building sophisticated marketing automation for Bluesky:
- Follower automation and growth tracking
- DM campaign systems with personalization
- ~~ML-powered audience clustering~~ (experimental, not production-ready)
- Scheduling and analytics tools

Market validation with 33 users showed that Bluesky's community actively doesn't want these features. That's not a bug—it's a feature of why Bluesky exists.

---

## ✨ Current Status

- **Completely Free**: All features unlocked, no payment required
- **Staying Online**: Will remain available as long as server costs allow
- **Open Source**: Code available for forking/self-hosting
- **No Support Guarantee**: Use as-is, community contributions welcome

---

## 🚀 Features (All Free)
- **Automated Scheduling**: Plan posts in advance
- **Multi-Account Management**: Handle multiple Bluesky accounts
- **Analytics**: Track engagement and growth
- **Follower Automation**: Follow/unfollow tools
- **DM Campaigns**: Automated outreach (use responsibly)
- ~~**Audience Clustering**: ML-powered audience analysis~~ (deprecated)

---

## � Key Lessons Learned

1. **Validate BEFORE building** - Talk to 50+ potential customers before writing code
2. **Platform culture matters** - Don't build automation for anti-automation platforms
3. **Ship early, listen always** - 33 real users taught more than months of assumptions
4. **Respect the mission** - Bluesky users left Twitter to escape growth hacking

---

## 🔧 Installation

### For Users (Hosted Version)
Just visit [skylume.app](https://skylume.app) and sign up - completely free.

### For Self-Hosting
1. **Clone the Repo**  
   ```bash
   git clone https://github.com/Nallanos/Skylume.git
   cd Skylume
   ```

2. **Install Dependencies**  
   ```bash
   npm install
   # Note: python-service is deprecated and not required
   ```

3. **Setup Configuration**  
   Copy `.env.example` to `.env` and configure:
   - PostgreSQL database
   - Redis instance
   - Bluesky API credentials

4. **Run Migrations**  
   ```bash
   node ace migration:run
   ```

5. **Start Services**  
   ```bash
   npm run dev  # AdonisJS backend + React frontend
   node ace queue:work  # BullMQ worker for scheduling
   ```

---

## 🏗️ Architecture

- **Backend**: AdonisJS (TypeScript) with PostgreSQL + Redis
- **Frontend**: React with Inertia.js SSR, TailwindCSS, shadcn/ui
- **Queue System**: BullMQ for scheduling and background jobs
- **~~AI Service~~**: ⚠️ Python service is deprecated (experimental artifact, not used in production)

See [architecture docs](.github/copilot-instructions.md) for details.

---

## 📘 Usage

The interface is self-explanatory:
1. Sign up (no payment required)
2. Connect your Bluesky account(s)
3. Access all features from the dashboard

**Note**: While all features are available, please use automation responsibly and respect Bluesky's community values.

---

## 🤝 Contributing

This project is no longer actively maintained, but:
- Bug fixes and improvements welcome
- Fork it and build your own version
- Use it as a learning resource

---

## 📄 License

MIT License - Use freely, modify as needed, no warranties.

---

## 💌 Contact

- **GitHub Issues**: For bugs or questions
- **Email**: benameurallan06@gmail.com
- **Fork/Maintain**: Reach out if you want to take over active development

---

## 🙏 Thank You

To the 33 users who tried Skylume: your feedback was invaluable. You helped me learn one of the most important lessons in product development—validate your market before you build.

---

*Built by a 17-year-old learning expensive lessons. Now building the next thing, with better validation this time.*

