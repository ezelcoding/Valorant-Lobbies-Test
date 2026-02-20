import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)


def random_sphere_positions(count: int, radius: float = 10.0) -> np.ndarray:
    if count == 0:
        return np.empty((0, 3), dtype=np.float32)
    if count == 1:
        return np.zeros((1, 3), dtype=np.float32)
    positions = np.random.randn(count, 3).astype(np.float32)
    norms = np.linalg.norm(positions, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    positions = positions / norms * (radius * np.random.uniform(0.3, 1.0, (count, 1)))
    return positions


def project_embeddings(embeddings: np.ndarray, params: Optional[dict] = None) -> np.ndarray:
    if embeddings.shape[0] < 2:
        return random_sphere_positions(embeddings.shape[0])

    if params is None:
        params = {}

    n_neighbors = min(params.get("n_neighbors", 15), embeddings.shape[0] - 1)
    min_dist = params.get("min_dist", 0.1)
    metric = params.get("metric", "cosine")

    if embeddings.shape[0] < 5:
        positions = random_sphere_positions(embeddings.shape[0], radius=8.0)
        return positions

    try:
        import umap

        reducer = umap.UMAP(
            n_components=3,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=42,
            verbose=False,
        )
        result = reducer.fit_transform(embeddings)
        scale = 15.0 / (np.max(np.abs(result)) + 1e-6)
        return (result * scale).astype(np.float32)
    except ImportError:
        logger.warning("UMAP not available, using PCA fallback")
        return _pca_project(embeddings)
    except Exception as e:
        logger.error(f"UMAP failed: {e}, using PCA fallback")
        return _pca_project(embeddings)


def _pca_project(embeddings: np.ndarray) -> np.ndarray:
    try:
        centered = embeddings - embeddings.mean(axis=0)
        _, _, vt = np.linalg.svd(centered, full_matrices=False)
        projected = centered @ vt[:3].T
        scale = 15.0 / (np.max(np.abs(projected)) + 1e-6)
        return (projected * scale).astype(np.float32)
    except Exception:
        return random_sphere_positions(embeddings.shape[0])
