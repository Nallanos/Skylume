import os
import json
import logging
import numpy as np
import matplotlib.pyplot as plt
import umap
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(filename='umap_user_embeddings.log', level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

# Path to the global user embeddings data (to be replaced with actual path or data loading logic)
EMBEDDINGS_PATH = os.environ.get('USER_EMBEDDINGS_PATH', 'user_embeddings.json')


def load_embeddings(path):
    """Load user embeddings from a JSON file. Each entry should be a dict with at least 'handle' and 'embedding'."""
    with open(path, 'r') as f:
        data = json.load(f)
    return data


def save_umap_plot(embeddings, handles, out_path='umap_users.png'):
    """
    Create UMAP visualization with proper embedding validation.
    Filters out empty or invalid embeddings before processing.
    """
    # 🚀 VALIDATION: Filter out empty embeddings and corresponding handles
    valid_embeddings = []
    valid_handles = []
    
    for i, (embedding, handle) in enumerate(zip(embeddings, handles)):
        # Check if embedding is valid (not empty, not None, has proper dimensions)
        if (embedding is not None and 
            isinstance(embedding, (list, np.ndarray)) and 
            len(embedding) > 0 and
            not all(x == 0 for x in embedding)):  # Not all zeros
            valid_embeddings.append(embedding)
            valid_handles.append(handle)
        else:
            logging.warning(f"Skipping invalid embedding for handle {handle}: {type(embedding)} with length {len(embedding) if hasattr(embedding, '__len__') else 'N/A'}")
    
    if len(valid_embeddings) < 2:
        logging.error(f"Insufficient valid embeddings for UMAP: only {len(valid_embeddings)} valid out of {len(embeddings)} total")
        raise ValueError(f"UMAP requires at least 2 valid embeddings, got {len(valid_embeddings)}")
    
    # Convert to numpy array and validate shape
    embeddings_array = np.array(valid_embeddings)
    logging.info(f"Processing UMAP with {len(valid_embeddings)} valid embeddings, shape: {embeddings_array.shape}")
    
    # Adjust UMAP parameters based on data size
    n_neighbors = min(15, len(valid_embeddings) - 1)  # Can't be >= n_samples
    
    reducer = umap.UMAP(n_neighbors=n_neighbors, min_dist=0.1, metric='cosine', random_state=42)
    embedding_2d = reducer.fit_transform(embeddings_array)
    
    plt.figure(figsize=(12, 8))
    plt.scatter(embedding_2d[:, 0], embedding_2d[:, 1], s=10, alpha=0.7)
    for i, handle in enumerate(valid_handles):
        if i % max(1, len(valid_handles)//100) == 0:
            plt.text(embedding_2d[i, 0], embedding_2d[i, 1], handle, fontsize=6, alpha=0.5)
    plt.title(f'UMAP projection of user embeddings ({len(valid_embeddings)} valid profiles)')
    plt.xlabel('UMAP-1')
    plt.ylabel('UMAP-2')
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()
    logging.info(f"UMAP plot saved to {out_path} with {len(valid_embeddings)} points")


def main():
    try:
        # Load user embeddings
        data = load_embeddings(EMBEDDINGS_PATH)
        handles = [user['handle'] for user in data]
        embeddings = [user['embedding'] for user in data]  # Keep as list for validation

        # Log basic stats
        logging.info(f"Loaded {len(data)} user embeddings from {EMBEDDINGS_PATH}")
        
        # Log the global data
        with open('user_embeddings_global.log', 'w') as f:
            json.dump(data, f, indent=2)
        logging.info(f"Logged {len(data)} user embeddings to user_embeddings_global.log")

        # Validate embeddings before UMAP
        valid_count = sum(1 for emb in embeddings if emb and len(emb) > 0)
        invalid_count = len(embeddings) - valid_count
        
        logging.info(f"Embedding validation: {valid_count} valid, {invalid_count} invalid")
        
        if valid_count < 2:
            logging.error(f"Insufficient valid embeddings for UMAP: {valid_count}")
            print(f"❌ Error: Only {valid_count} valid embeddings found, need at least 2 for UMAP")
            return
        
        # UMAP visualization
        save_umap_plot(embeddings, handles)
        print(f"✅ UMAP visualization generated with {valid_count} valid embeddings")
        
    except FileNotFoundError:
        logging.error(f"Embeddings file not found: {EMBEDDINGS_PATH}")
        print(f"❌ Error: Embeddings file not found: {EMBEDDINGS_PATH}")
    except Exception as e:
        logging.error(f"Error in main: {e}")
        print(f"❌ Error generating UMAP visualization: {e}")
        raise

if __name__ == "__main__":
    main()
