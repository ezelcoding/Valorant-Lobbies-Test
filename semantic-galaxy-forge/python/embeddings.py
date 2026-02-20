import os
import io
import base64
import logging
import numpy as np
from typing import Optional

logger = logging.getLogger(__name__)

MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "../models"))


class EmbeddingGenerator:
    def __init__(self):
        self._text_model = None
        self._clip_model = None
        self._clip_processor = None
        self._models_loaded = {"text": False, "clip": False}

    def _load_text_model(self):
        if self._text_model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            self._text_model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=MODELS_DIR)
            self._models_loaded["text"] = True
            logger.info("Text model loaded")
        except Exception as e:
            logger.error(f"Failed to load text model: {e}")
            raise

    def _load_clip_model(self):
        if self._clip_model is not None:
            return
        try:
            import clip
            self._clip_model, self._clip_processor = clip.load("ViT-B/32", download_root=MODELS_DIR)
            self._clip_model.eval()
            self._models_loaded["clip"] = True
            logger.info("CLIP model loaded")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            raise

    def check_models(self) -> dict:
        result = {"sentence_transformers": False, "clip": False, "whisper": False}
        try:
            from sentence_transformers import SentenceTransformer
            result["sentence_transformers"] = True
        except ImportError:
            pass

        try:
            import clip
            result["clip"] = True
        except ImportError:
            pass

        whisper_path = os.path.join(MODELS_DIR, "whisper", "ggml-base.bin")
        result["whisper"] = os.path.isfile(whisper_path)

        return result

    def generate_text_embedding(self, text: str) -> np.ndarray:
        self._load_text_model()
        embedding = self._text_model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return embedding.astype(np.float32)

    def generate_image_embedding(self, image_source: str) -> np.ndarray:
        self._load_clip_model()
        import torch
        from PIL import Image as PILImage

        if image_source.startswith("data:"):
            header, data = image_source.split(",", 1)
            img_bytes = base64.b64decode(data)
            image = PILImage.open(io.BytesIO(img_bytes)).convert("RGB")
        else:
            image = PILImage.open(image_source).convert("RGB")

        import clip
        image_input = self._clip_processor(image).unsqueeze(0)
        with torch.no_grad():
            features = self._clip_model.encode_image(image_input)
            features = features / features.norm(dim=-1, keepdim=True)
        return features.squeeze().cpu().numpy().astype(np.float32)

    def generate_thumbnail(self, image_source: str, size: tuple = (128, 128)) -> Optional[bytes]:
        try:
            from PIL import Image as PILImage
            if image_source.startswith("data:"):
                header, data = image_source.split(",", 1)
                img_bytes = base64.b64decode(data)
                image = PILImage.open(io.BytesIO(img_bytes))
            else:
                image = PILImage.open(image_source)
            image = image.convert("RGB")
            image.thumbnail(size, PILImage.LANCZOS)
            buf = io.BytesIO()
            image.save(buf, format="JPEG", quality=75)
            return buf.getvalue()
        except Exception as e:
            logger.warning(f"Thumbnail generation failed: {e}")
            return None

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        if a is None or b is None:
            return 0.0
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def bytes_to_array(self, data: bytes) -> Optional[np.ndarray]:
        if not data:
            return None
        return np.frombuffer(data, dtype=np.float32)
