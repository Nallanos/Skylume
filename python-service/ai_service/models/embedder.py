
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-mpnet-base-v2")

def embed(texts: list[str]) -> list[list[float]]:
    return model.encode(texts, normalize_embeddings=True)