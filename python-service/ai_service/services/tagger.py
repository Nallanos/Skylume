import asyncio
import numpy as np
from sentence_transformers import SentenceTransformer
from ai_service.database.database import Database
from bluesky.api import AccountService
from atproto_client.models.app.bsky.actor.defs import ProfileView
from atproto import Client
import math
import hdbscan
from collections import defaultdict
import logging
import umap
import matplotlib.pyplot as plt
import re
from keybert import KeyBERT
from typing import List, Dict, Any
from collections import Counter
from atproto_client.models.app.bsky.actor.defs import ProfileView
from sentence_transformers.util import cos_sim


embedder = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
kw_model = KeyBERT(model='all-MiniLM-L6-v2')
model = SentenceTransformer("all-MiniLM-L6-v2")

# --------------------------------------------------
# Embedding utilities
# --------------------------------------------------
def embed_text(text: str) -> List[float]:
    return embedder.encode(text, convert_to_numpy=True).tolist()

async def embed_texts_async(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    try:
        if not texts:
            return []
        return await asyncio.to_thread(embedder.encode, texts, batch_size=batch_size, convert_to_numpy=True)
    except Exception as e:
        logging.error(f"Error embedding texts: {e}")
        return []

# --------------------------------------------------
# Profile processing
# --------------------------------------------------
async def process_follows_and_posts(account_service: AccountService, did: str, semaphore: asyncio.Semaphore) -> tuple:
    async with semaphore:
        try:
            follows, posts = await asyncio.to_thread(account_service.get_profile_data, did)
            return follows, posts
        except Exception as e:
            logging.error(f"Error getting profile data for {did}: {e}")
            return [], []

async def process_single_follower(follower: ProfileView, account_service: AccountService, semaphore: asyncio.Semaphore) -> Dict[str, Any]:
    try:
        profile_data = {
            "handle": follower.handle,
            "bio": [],
            "posts": [],
            "following_bio": []
        }

        # Process bio
        if follower.description:
            profile_data["bio"] = await asyncio.to_thread(embed_text, follower.description)

        # Process follows and posts with rate limiting
        follows, posts = await process_follows_and_posts(account_service, follower.did, semaphore)

        # Process posts
        if posts:
            post_texts = [post.post.record.text for post in posts if hasattr(post.post.record, 'text')]
            profile_data["posts"] = await embed_texts_async(post_texts)

        # Process follows
        if follows:
            follow_texts = [f.description for f in follows if f.description]
            profile_data["following_bio"] = await embed_texts_async(follow_texts)

        return profile_data
    except Exception as e:
        logging.error(f"Error processing follower {follower.handle}: {e}")
        return profile_data

# --------------------------------------------------
# Clustering and visualization
# --------------------------------------------------
def perform_clustering(embeddings: List[List[float]]) -> np.ndarray:
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=3,
        min_samples=1,
        cluster_selection_epsilon=0,
        metric="euclidean",
        approx_min_span_tree = True
    )
    return clusterer.fit_predict(embeddings)

def generate_umap_visualization(embeddings: List[List[float]], labels: List[int], handles: List[str]) -> None:
    reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, metric='cosine')
    embedding_2d = reducer.fit_transform(embeddings)

    plt.figure(figsize=(16, 10))
    plt.scatter(embedding_2d[:, 0], embedding_2d[:, 1], c=labels, cmap='Spectral', s=20)
    plt.title("Projection UMAP des profils")
    plt.savefig("umap_projection.png", dpi=300)
    logging.info("UMAP visualization saved")

# --------------------------------------------------
# Tag generation
# --------------------------------------------------
def clean_text(text: str) -> str:
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text.lower()

def filter_keywords(keywords: List[str]) -> List[str]:
    stopwords_custom = {"just", "like", "day", "shop", "wow", "www", "com"}
    return [
        kw for kw in keywords
        if not any(stop in kw.lower() for stop in stopwords_custom)
        and not re.search(r"\d{4,}", kw)
        and len(kw.strip()) >= 3
    ]


def generate_cluster_tags(cluster_texts: List[str], top_n=2) -> tuple[List[str], List[float]]:
    try:
        if (len(cluster_texts) == 0):
            print("no cluster text received")
        cluster_texts = filter_keywords(cluster_texts)

        keywords = kw_model.extract_keywords(
            cluster_texts,
            keyphrase_ngram_range=(2, 4),
            seed_keywords= ["democrat", "entrepreneur", "art", "writers", "engineers"],
            stop_words=['english'],
            top_n=50,
            use_mmr=True,
            diversity=0.3,
            min_df=15,
            threshold=0.5
        )
        keyword_texts = [kw for sublist in keywords for kw, _ in sublist]
        print(keyword_texts)
        keywords_embeddings = embed_text(keyword_texts)

        # On garde les scores, et on applique le vote pondéré
        return ([keyword_vote_weighted(keywords,keywords_embeddings, max_output=top_n)], keywords_embeddings)

    except Exception as e:
        logging.error(f"Error generating tags: {e}")
        return []
    
def keyword_vote_weighted(
    keywords: List[List[tuple[str, float]]],
    keywords_embedding: List[float],  # vecteur cible
    max_output=1
) -> List[str]:
    results = []

    for cluster_keywords in keywords:
        if not cluster_keywords:
            results.append("")
            continue

        phrases = [kw for kw, _ in cluster_keywords]
        phrase_embeddings = [embed_text(kw) for kw in phrases]

        sims = cos_sim(phrase_embeddings, [keywords_embedding]).squeeze()  # (n,)
        top_indices = sims.argsort()[::-1][:max_output]

        top_keywords = [phrases[i] for i in top_indices]
        results.append(", ".join(top_keywords))

    return results
  
def summarize_keywords(keywords: list[str]) -> str:
    if not keywords:
        return "misc"
    embeddings = model.encode(keywords)
    centroid = np.mean(embeddings, axis=0)
    sims = np.dot(embeddings, centroid)
    return keywords[np.argmax(sims)]

# --------------------------------------------------
# Massive async api call
# --------------------------------------------------
async def fetch_api_data(follower, account_service: AccountService, semaphore):
    profile = await asyncio.to_thread(account_service.get_profile, follower["handle"])
    if not profile:
        return None

    follows, posts = await process_follows_and_posts(account_service, profile.did, semaphore)

    return {
        "profile": profile,
        "follows": follows,
        "posts": posts
    }

# --------------------------------------------------
# Massive async ai process
# --------------------------------------------------
from sentence_transformers.util import cos_sim

async def process_ai(api_result):
    profile = api_result["profile"]
    follows = api_result["follows"]
    posts = api_result["posts"]

    profile_data = {
        "handle": profile.handle,
        "bio": [],
        "posts": [],
        "following_bio": []
    }

    bio_embedding = None
    has_bio = bool(profile.description)

    if has_bio:
        print("has bio")
        bio_embedding = await asyncio.to_thread(embed_text, profile.description)
        profile_data["bio"] = bio_embedding

    # -- POSTS --
    if posts:
        post_texts = [p.post.record.text for p in posts if hasattr(p.post.record, 'text')]
        posts_embeddings = await embed_texts_async(post_texts)

        filtered_post_embeddings = []
        for emb in posts_embeddings:
            if has_bio:
                sim = cos_sim(emb, bio_embedding)[0][0].item()
                if sim >= 0.35:
                    filtered_post_embeddings.append(emb)
                else: 
                    print("not adding post")
            else:
                filtered_post_embeddings.append(emb)

        profile_data["posts"] = filtered_post_embeddings
        print("len profile data posts",len(profile_data["posts"]) )
    # -- FOLLOWING BIOS --
    if follows:
        follow_texts = [f.description for f in follows if f.description]
        follow_embeddings = await embed_texts_async(follow_texts)

        filtered_follow_embeddings = []
        for emb in follow_embeddings:
            if has_bio:
                sim = cos_sim(emb, bio_embedding)[0][0].item()
                if sim >= 0.25:  # un peu plus tolérant que les posts
                    filtered_follow_embeddings.append(emb)
                else:
                    print("didn't add following bio")
            else:
                # Pas de bio, on garde tout
                filtered_follow_embeddings.append(emb)

        profile_data["following_bio"] = filtered_follow_embeddings
        print("len following bio",len(profile_data["following_bio"]))
    return profile_data

def extract_raw_texts(api_results: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    corpus = {}

    for result in api_results:
        if not result or "profile" not in result:
            continue

        handle = result["profile"].handle
        texts = []

        # Bio
        bio = result["profile"].description or ""
        texts.append(bio)

        # Posts
        if result["posts"]:
            post_texts = [p.post.record.text for p in result["posts"] if hasattr(p.post.record, "text")]
            texts.extend(post_texts)

        cleaned = [clean_text(t) for t in texts if isinstance(t, str)]
        cleaned = cleaned[:30]
        corpus[handle] = cleaned

    return corpus

# --------------------------------------------------
# Main workflow
# --------------------------------------------------
async def generate_tags(account_handle: str, followers: List[ProfileView], database: Database, max_concurrent: int = 15) -> List[Dict[str, Any]]:
    try:
        # Setup
        semaphore = asyncio.Semaphore(max_concurrent)
        account_service = AccountService(Client())
        
        # Fetch account data
        print("fetching account data")
        account = await database.fetch("SELECT * FROM accounts WHERE handle=$1", account_handle)
        if not account:
            raise ValueError(f"Account not found: {account_handle}")
        
        await asyncio.to_thread(account_service.login, account[0]["handle"], account[0]["app_password"])
        
        api_tasks = [fetch_api_data(f, account_service, semaphore) for f in followers]
        api_results = await asyncio.gather(*api_tasks)

        user_text_corpus = extract_raw_texts(api_results)
        ai_tasks = [process_ai(res) for res in api_results if res]
        processed_profiles = await asyncio.gather(*ai_tasks)
        
        # Generate embeddings and filter empty results
        print("Generate embeddings and filter empty results")
        valid_profiles = []
        for profile in processed_profiles:
            embedding = get_global_profile_embedding(profile)
            if embedding:
                valid_profiles.append({
                    "handle": profile["handle"],
                    "embedding": embedding
                })
                # Collect texts for keyword generation
        # Clustering
        if not valid_profiles:
            print("no valid profile")
            return []
        print('Clustering')
        embeddings = [p["embedding"] for p in valid_profiles]
        labels = perform_clustering(embeddings)
        generate_umap_visualization(embeddings, labels, [p["handle"] for p in valid_profiles])

        # Generate cluster tags
        print("Generate cluster tags")
        clusters = defaultdict(list)
        for profile, label in zip(valid_profiles, labels):
            if label != -1:
                clusters[label].append(profile["handle"])

        
        cluster_tags = []

        
        for cluster_id, handles in clusters.items():
            cluster_texts = []
            for handle in handles:
                cluster_texts.extend(user_text_corpus.get(handle, []))
            
            if cluster_texts:
                print("tagging with", cluster_texts)
                tag, cluster_embedding = generate_cluster_tags(cluster_texts)
                print("Before summarizing", tag)
                tag = summarize_keywords(tag)
                print("After summarizing", tag)
                cluster_tags.append({
                    "tag": tag,
                    "handles": handles,
                    "embedding": cluster_embedding,
                    "size": len(handles)
                })
        return cluster_tags

    except Exception as e:
        logging.critical(f"Critical error in generate_tags: {e}", exc_info=True)
        return []

def flatten_texts(nested_texts):
    return [item for sublist in nested_texts for item in sublist]


# --------------------------------------------------
# Embedding aggregation
# --------------------------------------------------
def get_global_profile_embedding(profile: Dict[str, Any]) -> List[float]:
    vectors = []
    weights = []
    
    if profile["bio"]:
        vectors.append(profile["bio"])
        weights.append(1.0)
        
    if len(profile["following_bio"]) > 0:
        avg_follow = np.mean(profile["following_bio"], axis=0)
        weight = 1 / math.sqrt(len(profile["following_bio"]))
        vectors.append(avg_follow)
        weights.append(weight)

    if len(profile["posts"]) > 0:
        avg_posts = np.mean(profile["posts"], axis=0)
        weight = 1 / math.sqrt(len(profile["posts"]))
        vectors.append(avg_posts)
        weights.append(weight)

    if not vectors:
        print("No vector in get")
        return []

    weighted_avg = np.average(vectors, axis=0, weights=weights)
    norm = np.linalg.norm(weighted_avg)
    return (weighted_avg / norm).tolist() if norm > 0 else weighted_avg.tolist()

__all__ = ['generate_tags']