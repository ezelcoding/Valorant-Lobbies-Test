import logging
from typing import List

logger = logging.getLogger(__name__)


def detect_communities(nodes: list, connections: list) -> List[List[int]]:
    if not nodes:
        return []

    node_ids = [n["id"] for n in nodes]

    if not connections:
        return [node_ids]

    try:
        import networkx as nx
        import community as community_louvain

        G = nx.Graph()
        for node in nodes:
            G.add_node(node["id"])
        for conn in connections:
            G.add_edge(conn["source_id"], conn["target_id"], weight=conn["strength"])

        partition = community_louvain.best_partition(G)

        communities_map: dict = {}
        for node_id, comm_id in partition.items():
            communities_map.setdefault(comm_id, []).append(node_id)

        return list(communities_map.values())

    except ImportError:
        logger.warning("python-louvain not available, using basic clustering")
        return _basic_cluster(node_ids, connections)
    except Exception as e:
        logger.error(f"Community detection failed: {e}")
        return [node_ids]


def _basic_cluster(node_ids: list, connections: list) -> List[List[int]]:
    parent = {n: n for n in node_ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    strong_conns = sorted(connections, key=lambda c: -c["strength"])
    for conn in strong_conns[:len(node_ids)]:
        pa = find(conn["source_id"])
        pb = find(conn["target_id"])
        if pa != pb and conn["strength"] > 0.6:
            parent[pa] = pb

    groups: dict = {}
    for n in node_ids:
        root = find(n)
        groups.setdefault(root, []).append(n)

    return list(groups.values())
