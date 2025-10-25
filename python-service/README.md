# Python Service - Experimental Artifact

⚠️ **This service is NOT used in the production application** ⚠️

## Status: Discontinued Experiment

This Python service was an experimental attempt at implementing social clustering and semantic analysis features for Bluesky followers. **It has been deprecated and is not integrated into the current application.**

## What Was Attempted

The service aimed to provide:
- Semantic similarity analysis of follower bios
- HDBSCAN-based clustering of user profiles
- LDA (Latent Dirichlet Allocation) topic modeling
- UMAP embeddings for dimensionality reduction
- Audience segmentation based on interests

## Why It Was Discontinued

- **Performance Issues**: The clustering algorithms were too slow for real-time analysis
- **Accuracy Concerns**: Results were inconsistent and didn't provide actionable insights
- **Integration Complexity**: Required heavy Python dependencies and complex API communication
- **Maintenance Burden**: Added significant complexity to the deployment pipeline

## Current Architecture

The main application now uses simpler, more reliable approaches:
- Direct keyword matching for follower filtering
- Basic interest level categorization
- Lightweight semantic analysis using existing TypeScript libraries

## For Developers

This directory is kept for historical reference and potential future experiments. **Do not attempt to run or deploy this service in production.**

If you're interested in social clustering features, consider:
1. Using external SaaS analytics providers
2. Implementing lightweight heuristics in TypeScript
3. Exploring modern LLM-based classification instead of traditional ML

## Structure

```
python-service/
├── ai_service/          # Core ML pipeline (unused)
├── analysis_worker.py   # Job processor (unused)
├── requirements.txt     # Python dependencies (outdated)
└── README.md           # This file
```

---

**Last Updated**: October 2025  
**Status**: Archived / Not in Use
