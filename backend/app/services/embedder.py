"""Local embeddings with sentence-transformers (built for you).

Anthropic has no embedding API, so embeddings are computed on-device with a
small open-source model (`all-MiniLM-L6-v2`, 384 dims). Free, no API key,
manuscript text never leaves the machine for this step — the privacy story
from mvp_blueprint.md §6.

The model loads lazily on first use (it's ~100 MB), so importing this module
or running tests never pays that cost unless embeddings are actually needed.
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "sentence-transformers is not installed — run `make install`, "
                "or see requirements.txt"
            ) from exc
        logger.info("Loading embedding model %s ...", settings.embedding_model_name)
        _model = SentenceTransformer(settings.embedding_model_name)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts -> list of 384-dim float vectors (normalized,
    so cosine distance in pgvector behaves as expected)."""
    model = get_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def embed_one(text: str) -> list[float]:
    return embed_texts([text])[0]
