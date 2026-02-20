#!/usr/bin/env python3
import sys
import json
import os
import logging
import tempfile
import numpy as np

logging.basicConfig(
    filename=os.path.join(os.environ.get("DATA_DIR", tempfile.gettempdir()), "sgf-backend.log"),
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.expanduser("~"), ".semantic-galaxy-forge"))
MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "../models"))

os.makedirs(DATA_DIR, exist_ok=True)

from database import Database
from embeddings import EmbeddingGenerator
import projection as proj
import community as comm
import file_processors as fp

db = Database(os.path.join(DATA_DIR, "galaxies.db"))
embedder = EmbeddingGenerator()


def serialize_node(row: dict) -> dict:
    node = dict(row)
    node.pop("embedding", None)
    if node.get("thumbnail") and isinstance(node["thumbnail"], (bytes, bytearray)):
        import base64
        node["thumbnail"] = base64.b64encode(node["thumbnail"]).decode()
    if isinstance(node.get("metadata"), str):
        try:
            node["metadata"] = json.loads(node["metadata"])
        except Exception:
            node["metadata"] = {}
    if not node.get("label"):
        content = node.get("content", "")
        node["label"] = content[:40] if content else ""
    return node


def serialize_galaxy(row: dict) -> dict:
    g = dict(row)
    if isinstance(g.get("settings"), str):
        try:
            g["settings"] = json.loads(g["settings"])
        except Exception:
            g["settings"] = {}
    return g


def get_initial_position(galaxy_id: int, embedding: np.ndarray) -> tuple:
    existing = db.get_embeddings(galaxy_id)
    if len(existing) < 2:
        import random
        r = 8.0
        return (
            random.uniform(-r, r),
            random.uniform(-r, r),
            random.uniform(-r, r),
        )

    embeddings_list = []
    for row in existing:
        arr = embedder.bytes_to_array(row["embedding"])
        if arr is not None:
            embeddings_list.append(arr)

    if len(embeddings_list) < 2:
        import random
        r = 8.0
        return (random.uniform(-r, r), random.uniform(-r, r), random.uniform(-r, r))

    all_embeddings = np.stack(embeddings_list + [embedding])
    positions = proj.project_embeddings(all_embeddings)
    return tuple(float(v) for v in positions[-1])


def create_connections_for_node(galaxy_id: int, new_node_id: int, new_embedding: np.ndarray, threshold: float):
    all_nodes = db.get_nodes(galaxy_id)
    for node in all_nodes:
        if node["id"] == new_node_id:
            continue
        existing_emb = embedder.bytes_to_array(node.get("embedding"))
        if existing_emb is None:
            continue
        sim = embedder.cosine_similarity(new_embedding, existing_emb)
        if sim >= threshold:
            db.create_connection(new_node_id, node["id"], float(sim))


def handle_get_galaxies(_data: dict) -> dict:
    galaxies = db.get_all_galaxies()
    return {"galaxies": [serialize_galaxy(g) for g in galaxies]}


def handle_create_galaxy(data: dict) -> dict:
    name = data.get("name", "Untitled Galaxy")
    galaxy_id = db.create_galaxy(name)
    return {"galaxy_id": galaxy_id}


def handle_delete_galaxy(data: dict) -> dict:
    db.delete_galaxy(data["galaxy_id"])
    return {"success": True}


def handle_get_nodes(data: dict) -> dict:
    nodes = db.get_nodes(data["galaxy_id"])
    return {"nodes": [serialize_node(n) for n in nodes]}


def handle_get_connections(data: dict) -> dict:
    connections = db.get_connections(data["galaxy_id"])
    return {"connections": [dict(c) for c in connections]}


def handle_create_text_node(data: dict) -> dict:
    galaxy_id = data["galaxy_id"]
    content = data["content"]
    metadata = data.get("metadata", {})
    threshold = data.get("similarity_threshold", 0.5)

    try:
        embedding = embedder.generate_text_embedding(content)
        emb_bytes = embedding.tobytes()
    except Exception as e:
        logger.warning(f"Embedding failed: {e}, creating node without embedding")
        embedding = None
        emb_bytes = None

    pos = (0.0, 0.0, 0.0)
    if embedding is not None:
        try:
            pos = get_initial_position(galaxy_id, embedding)
        except Exception as e:
            logger.warning(f"Position computation failed: {e}")

    label = content[:40]
    node_id = db.create_node(
        galaxy_id=galaxy_id,
        content_type="text",
        content=content,
        label=label,
        embedding=emb_bytes,
        position_x=pos[0],
        position_y=pos[1],
        position_z=pos[2],
        metadata=metadata,
    )

    if embedding is not None:
        try:
            create_connections_for_node(galaxy_id, node_id, embedding, threshold)
        except Exception as e:
            logger.warning(f"Connection creation failed: {e}")

    return {"node_id": node_id, "position": list(pos)}


def handle_process_file(data: dict) -> dict:
    galaxy_id = data["galaxy_id"]
    file_path = data["file_path"]
    content_type = data.get("content_type") or fp.detect_content_type(file_path)
    threshold = data.get("similarity_threshold", 0.5)

    if not content_type:
        raise ValueError(f"Unknown file type: {file_path}")

    created_nodes = []
    created_connections = []

    if content_type == "text":
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
        except Exception as e:
            raise ValueError(f"Cannot read file: {e}")
        chunks = fp.split_text(text)
        fname = os.path.basename(file_path)
        for chunk in chunks:
            result = handle_create_text_node({
                "galaxy_id": galaxy_id,
                "content": chunk,
                "metadata": {"source": fname},
                "similarity_threshold": threshold,
            })
            node = db.get_node(result["node_id"])
            if node:
                created_nodes.append(serialize_node(node))

    elif content_type == "image":
        try:
            embedding = embedder.generate_image_embedding(file_path)
            thumbnail = embedder.generate_thumbnail(file_path)
            emb_bytes = embedding.tobytes()
            pos = get_initial_position(galaxy_id, embedding)
            fname = os.path.basename(file_path)
            node_id = db.create_node(
                galaxy_id=galaxy_id,
                content_type="image",
                content=file_path,
                label=fname,
                embedding=emb_bytes,
                position_x=pos[0],
                position_y=pos[1],
                position_z=pos[2],
                thumbnail=thumbnail,
                metadata={"filename": fname},
            )
            create_connections_for_node(galaxy_id, node_id, embedding, threshold)
            node = db.get_node(node_id)
            if node:
                created_nodes.append(serialize_node(node))
        except Exception as e:
            raise ValueError(f"Image processing failed: {e}")

    elif content_type == "pdf":
        text = fp.extract_text_from_pdf(file_path)
        chunks = fp.split_text(text) if text else []
        fname = os.path.basename(file_path)
        for chunk in chunks:
            result = handle_create_text_node({
                "galaxy_id": galaxy_id,
                "content": chunk,
                "metadata": {"source": fname, "type": "pdf_text"},
                "similarity_threshold": threshold,
            })
            node = db.get_node(result["node_id"])
            if node:
                created_nodes.append(serialize_node(node))

        with tempfile.TemporaryDirectory() as tmpdir:
            image_paths = fp.extract_images_from_pdf(file_path, tmpdir)
            for img_path in image_paths:
                try:
                    result = handle_process_file({
                        "galaxy_id": galaxy_id,
                        "file_path": img_path,
                        "content_type": "image",
                        "similarity_threshold": threshold,
                    })
                    created_nodes.extend(result.get("nodes", []))
                except Exception as e:
                    logger.warning(f"PDF image processing failed: {e}")

    elif content_type == "audio":
        try:
            text, duration = fp.transcribe_audio(file_path)
            fname = os.path.basename(file_path)
            result = handle_create_text_node({
                "galaxy_id": galaxy_id,
                "content": text if text else f"[Audio: {fname}]",
                "metadata": {"source": fname, "type": "audio_transcript", "duration": duration},
                "similarity_threshold": threshold,
            })
            node = db.get_node(result["node_id"])
            if node:
                created_nodes.append(serialize_node(node))
        except Exception as e:
            raise ValueError(f"Audio processing failed: {e}")

    connections = db.get_connections(galaxy_id)
    created_connections = [dict(c) for c in connections]

    return {"nodes": created_nodes, "connections": created_connections}


def handle_delete_node(data: dict) -> dict:
    db.delete_node(data["node_id"])
    return {"success": True}


def handle_update_node_label(data: dict) -> dict:
    db.update_node_label(data["node_id"], data["label"])
    return {"success": True}


def handle_update_node_position(data: dict) -> dict:
    db.update_node_position(data["node_id"], data["x"], data["y"], data["z"])
    return {"success": True}


def handle_recompute_layout(data: dict) -> dict:
    galaxy_id = data["galaxy_id"]
    params = data.get("params", {})
    emb_rows = db.get_embeddings(galaxy_id)

    if len(emb_rows) < 2:
        nodes = db.get_nodes(galaxy_id)
        return {"nodes": [serialize_node(n) for n in nodes]}

    valid_rows = []
    embeddings_list = []
    for row in emb_rows:
        arr = embedder.bytes_to_array(row["embedding"])
        if arr is not None:
            valid_rows.append(row)
            embeddings_list.append(arr)

    if len(embeddings_list) < 2:
        nodes = db.get_nodes(galaxy_id)
        return {"nodes": [serialize_node(n) for n in nodes]}

    embeddings = np.stack(embeddings_list)
    positions = proj.project_embeddings(embeddings, params)

    bulk_updates = [
        (float(positions[i][0]), float(positions[i][1]), float(positions[i][2]), valid_rows[i]["id"])
        for i in range(len(valid_rows))
    ]
    db.update_node_positions_bulk(bulk_updates)

    nodes = db.get_nodes(galaxy_id)
    return {"nodes": [serialize_node(n) for n in nodes]}


def handle_create_manual_connection(data: dict) -> dict:
    conn_id = db.create_connection(data["source_id"], data["target_id"], 0.8, "manual")
    return {"connection_id": conn_id}


def handle_delete_connection(data: dict) -> dict:
    db.delete_connection(data["connection_id"])
    return {"success": True}


def handle_detect_communities(data: dict) -> dict:
    galaxy_id = data["galaxy_id"]
    nodes = db.get_nodes(galaxy_id)
    connections = db.get_connections(galaxy_id)
    communities = comm.detect_communities(nodes, connections)
    return {"communities": communities}


def handle_get_model_status(_data: dict) -> dict:
    return embedder.check_models()


def handle_download_models(_data: dict) -> dict:
    try:
        from sentence_transformers import SentenceTransformer
        SentenceTransformer("all-MiniLM-L6-v2", cache_folder=MODELS_DIR)
    except Exception as e:
        logger.error(f"Failed to download sentence-transformers: {e}")
        raise

    try:
        import clip
        clip.load("ViT-B/32", download_root=MODELS_DIR)
    except Exception as e:
        logger.warning(f"CLIP download failed: {e}")

    return {"success": True}


HANDLERS = {
    "getGalaxies": handle_get_galaxies,
    "createGalaxy": handle_create_galaxy,
    "deleteGalaxy": handle_delete_galaxy,
    "getNodes": handle_get_nodes,
    "getConnections": handle_get_connections,
    "createTextNode": handle_create_text_node,
    "processFile": handle_process_file,
    "deleteNode": handle_delete_node,
    "updateNodeLabel": handle_update_node_label,
    "updateNodePosition": handle_update_node_position,
    "recomputeLayout": handle_recompute_layout,
    "createManualConnection": handle_create_manual_connection,
    "deleteConnection": handle_delete_connection,
    "detectCommunities": handle_detect_communities,
    "getModelStatus": handle_get_model_status,
    "downloadModels": handle_download_models,
}


def handle_request(request: dict) -> dict:
    request_id = request.get("id")
    channel = request.get("channel")
    data = request.get("data") or {}

    handler = HANDLERS.get(channel)
    if not handler:
        return {"id": request_id, "error": f"Unknown channel: {channel}"}

    try:
        result = handler(data)
        return {"id": request_id, "result": result}
    except Exception as e:
        logger.exception(f"Handler error for {channel}: {e}")
        return {"id": request_id, "error": str(e)}


def main():
    logger.info("Semantic Galaxy Forge backend starting")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError as e:
            err_response = {"id": None, "error": f"JSON parse error: {e}"}
            print(json.dumps(err_response), flush=True)
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            err_response = {"id": None, "error": str(e)}
            print(json.dumps(err_response), flush=True)


if __name__ == "__main__":
    main()
