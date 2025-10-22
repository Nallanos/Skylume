# List Creator Documentation

## Overview

List Creator is a professional tool for discovering and scoring Bluesky profiles based on keyword relevance using AI semantic analysis. It automatically searches Bluesky and ranks profiles by how well their bio matches your specified keywords.

## Features

- Automatic profile discovery via Bluesky search API
- Simple cosine similarity scoring between bio and keywords
- Clean, professional interface
- Sort results by relevance score
- Direct links to Bluesky profiles

## Architecture

### Backend (TypeScript/AdonisJS)

**Controller:** `app/controllers/list_creator_controller.ts`
- `GET /list-creator` - Main page
- `POST /api/list-creator/search` - Search and score profiles

**AI Service:** `app/services/AI_services.ts`
- Method: `scoreProfilesBySimpleCosine(profiles, keywords)`
- Uses Transformers.js (all-MiniLM-L6-v2) for embeddings
- Calculates cosine similarity between keywords and bio

### Frontend (React/Inertia.js)

**Pages:**
- `inertia/pages/ListCreator.tsx` - Main interface
- `inertia/components/ListCreatorResults.tsx` - Results display

## Usage

### Input Format

1. Select a Bluesky account
2. Enter keywords separated by commas
3. Click "Search Profiles"

Example keywords:
```
marketing, SaaS, growth hacking
```

### API Request

```json
POST /api/list-creator/search
{
  "keywords": ["marketing", "SaaS"],
  "account_id": 123,
  "limit": 50
}
```

### API Response

```json
{
  "status": "success",
  "data": [
    {
      "username": "alice.bsky.social",
      "bio": "Growth hacker specializing in SaaS",
      "displayName": "Alice",
      "avatar": "https://...",
      "followersCount": 1234,
      "score": 0.85
    }
  ],
  "meta": {
    "total_found": 45,
    "keywords": ["marketing", "SaaS"],
    "search_query": "marketing SaaS"
  }
}
```

## Algorithm

### Step 1: Search
- Uses `agent.searchActors()` to find profiles matching keywords
- Fetches up to 100 profiles from Bluesky

### Step 2: Embed
- Generates embedding for concatenated keywords
- Generates embedding for each profile bio

### Step 3: Score
- Calculates cosine similarity between keyword embedding and bio embedding
- Score ranges from 0.0 (no match) to 1.0 (perfect match)

### Step 4: Sort
- Profiles sorted by score (descending)
- Top matches appear first

## Score Interpretation

- **70-100%**: Excellent match (green)
- **50-69%**: Good match (yellow)
- **30-49%**: Medium match (orange)
- **0-29%**: Low match (red)

## Configuration

No additional configuration needed. Uses existing:
- Bluesky account sessions
- AI Service with Transformers.js
- Standard authentication middleware

## Example Use Cases

### Find SaaS Marketers
```
Keywords: SaaS, marketing, growth
Result: Profiles with bios mentioning SaaS marketing expertise
```

### Find Developers
```
Keywords: TypeScript, React, developer
Result: Profiles describing themselves as TypeScript/React developers
```

### Find Content Creators
```
Keywords: content, writing, blogging
Result: Profiles of writers and content creators
```

## Technical Details

**Model:** sentence-transformers/all-MiniLM-L6-v2
- 384-dimensional embeddings
- Fast inference
- Good semantic understanding

**Similarity Metric:** Cosine Similarity
- Measures angle between vectors
- Range: -1 to 1 (normalized to 0-1)
- Efficient computation

**Performance:**
- Embedding cache reduces redundant calculations
- Processes 50 profiles in seconds
- Search limited to 100 profiles per query (Bluesky API limit)

## Limitations

- Only analyzes bio text (not posts or followers)
- Depends on Bluesky search quality
- Limited to 100 profiles per search
- Requires active Bluesky session

## Future Enhancements

- Analyze recent posts for deeper matching
- Support multiple keywords with weights
- Export results to CSV
- Batch follow feature
- Search history
- Advanced filters (followers, date joined, etc.)

## Navigation

Access via sidebar: **List Creator** (Target icon)

---

Version: 2.0.0
Last Updated: October 2025
