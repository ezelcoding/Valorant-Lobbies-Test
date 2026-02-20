import os
import logging
import tempfile
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        return "\n\n".join(pages)
    except ImportError:
        logger.warning("PyPDF2 not available")
        return ""
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""


def extract_images_from_pdf(pdf_path: str, temp_dir: str) -> List[str]:
    paths = []
    try:
        from PyPDF2 import PdfReader
        from PIL import Image
        import io

        reader = PdfReader(pdf_path)
        for page_num, page in enumerate(reader.pages):
            resources = page.get("/Resources")
            if not resources:
                continue
            xobject = resources.get("/XObject")
            if not xobject:
                continue
            xobject = xobject.get_object()
            for name, obj in xobject.items():
                obj = obj.get_object()
                if obj.get("/Subtype") == "/Image":
                    try:
                        data = obj.get_data()
                        colorspace = obj.get("/ColorSpace", "/DeviceRGB")
                        if isinstance(colorspace, list):
                            colorspace = colorspace[0]
                        mode = "RGB"
                        if str(colorspace) == "/DeviceGray":
                            mode = "L"
                        width = obj.get("/Width", 0)
                        height = obj.get("/Height", 0)
                        if width and height and len(data) > 0:
                            image = Image.frombytes(mode, (int(width), int(height)), data)
                            out_path = os.path.join(temp_dir, f"pdf_page{page_num}_{name[1:]}.jpg")
                            image.convert("RGB").save(out_path, "JPEG", quality=80)
                            paths.append(out_path)
                    except Exception as e:
                        logger.debug(f"Image extraction failed for {name}: {e}")
    except ImportError:
        logger.warning("PyPDF2/Pillow not available for image extraction")
    except Exception as e:
        logger.error(f"PDF image extraction failed: {e}")
    return paths


def transcribe_audio(audio_path: str) -> Tuple[str, float]:
    duration = 0.0
    try:
        import soundfile as sf
        info = sf.info(audio_path)
        duration = info.duration
    except Exception:
        pass

    try:
        import whisper
        model = whisper.load_model("base")
        result = model.transcribe(audio_path)
        return result.get("text", "").strip(), duration
    except ImportError:
        pass

    return f"[Audio file: {os.path.basename(audio_path)}]", duration


def split_text(text: str, max_length: int = 600, overlap: int = 50) -> List[str]:
    if len(text) <= max_length:
        return [text] if text.strip() else []

    chunks = []
    sentences = _split_sentences(text)
    current_chunk = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > max_length and current_chunk:
            chunk_text = " ".join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)
            overlap_tokens = []
            overlap_len = 0
            for s in reversed(current_chunk):
                if overlap_len + len(s) > overlap:
                    break
                overlap_tokens.insert(0, s)
                overlap_len += len(s)
            current_chunk = overlap_tokens
            current_len = overlap_len

        current_chunk.append(sentence)
        current_len += sentence_len

    if current_chunk:
        chunk_text = " ".join(current_chunk).strip()
        if chunk_text:
            chunks.append(chunk_text)

    return chunks


def _split_sentences(text: str) -> List[str]:
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    result = []
    for s in sentences:
        s = s.strip()
        if len(s) > 800:
            parts = [s[i:i+600] for i in range(0, len(s), 550)]
            result.extend(parts)
        elif s:
            result.append(s)
    return result


def detect_content_type(file_path: str) -> Optional[str]:
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        ".txt": "text",
        ".md": "text",
        ".rst": "text",
        ".csv": "text",
        ".json": "text",
        ".xml": "text",
        ".html": "text",
        ".pdf": "pdf",
        ".jpg": "image",
        ".jpeg": "image",
        ".png": "image",
        ".webp": "image",
        ".gif": "image",
        ".bmp": "image",
        ".mp3": "audio",
        ".wav": "audio",
        ".ogg": "audio",
        ".m4a": "audio",
        ".flac": "audio",
        ".aac": "audio",
    }
    return mapping.get(ext)
