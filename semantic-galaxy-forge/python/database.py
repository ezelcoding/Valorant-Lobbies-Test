import sqlite3
import json
import os
from typing import Optional


class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def _migrate(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS galaxies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                modified_at TEXT DEFAULT (datetime('now')),
                settings TEXT DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                galaxy_id INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                content TEXT NOT NULL,
                label TEXT DEFAULT '',
                embedding BLOB,
                position_x REAL DEFAULT 0,
                position_y REAL DEFAULT 0,
                position_z REAL DEFAULT 0,
                thumbnail BLOB,
                metadata TEXT DEFAULT '{}',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (galaxy_id) REFERENCES galaxies(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER NOT NULL,
                target_id INTEGER NOT NULL,
                strength REAL NOT NULL DEFAULT 0.5,
                connection_type TEXT DEFAULT 'semantic',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
                FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE,
                UNIQUE(source_id, target_id)
            );

            CREATE INDEX IF NOT EXISTS idx_nodes_galaxy ON nodes(galaxy_id);
            CREATE INDEX IF NOT EXISTS idx_conn_source ON connections(source_id);
            CREATE INDEX IF NOT EXISTS idx_conn_target ON connections(target_id);
        """)
        self.conn.commit()

    def create_galaxy(self, name: str) -> int:
        cur = self.conn.execute(
            "INSERT INTO galaxies (name) VALUES (?)", (name,)
        )
        self.conn.commit()
        return cur.lastrowid

    def get_all_galaxies(self) -> list:
        rows = self.conn.execute("""
            SELECT g.*, COUNT(n.id) as node_count
            FROM galaxies g
            LEFT JOIN nodes n ON n.galaxy_id = g.id
            GROUP BY g.id
            ORDER BY g.modified_at DESC
        """).fetchall()
        return [dict(r) for r in rows]

    def delete_galaxy(self, galaxy_id: int):
        self.conn.execute("DELETE FROM galaxies WHERE id = ?", (galaxy_id,))
        self.conn.commit()

    def create_node(
        self,
        galaxy_id: int,
        content_type: str,
        content: str,
        label: str = "",
        embedding: Optional[bytes] = None,
        position_x: float = 0,
        position_y: float = 0,
        position_z: float = 0,
        thumbnail: Optional[bytes] = None,
        metadata: dict = None,
    ) -> int:
        if metadata is None:
            metadata = {}
        cur = self.conn.execute(
            """INSERT INTO nodes
               (galaxy_id, content_type, content, label, embedding,
                position_x, position_y, position_z, thumbnail, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                galaxy_id, content_type, content, label, embedding,
                position_x, position_y, position_z, thumbnail,
                json.dumps(metadata),
            ),
        )
        self.conn.execute(
            "UPDATE galaxies SET modified_at = datetime('now') WHERE id = ?",
            (galaxy_id,),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_nodes(self, galaxy_id: int) -> list:
        rows = self.conn.execute(
            "SELECT * FROM nodes WHERE galaxy_id = ? ORDER BY created_at ASC",
            (galaxy_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def get_node(self, node_id: int) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM nodes WHERE id = ?", (node_id,)
        ).fetchone()
        return dict(row) if row else None

    def delete_node(self, node_id: int):
        row = self.conn.execute("SELECT galaxy_id FROM nodes WHERE id = ?", (node_id,)).fetchone()
        self.conn.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
        if row:
            self.conn.execute(
                "UPDATE galaxies SET modified_at = datetime('now') WHERE id = ?",
                (row["galaxy_id"],),
            )
        self.conn.commit()

    def update_node_label(self, node_id: int, label: str):
        self.conn.execute(
            "UPDATE nodes SET label = ? WHERE id = ?", (label, node_id)
        )
        self.conn.commit()

    def update_node_position(self, node_id: int, x: float, y: float, z: float):
        self.conn.execute(
            "UPDATE nodes SET position_x = ?, position_y = ?, position_z = ? WHERE id = ?",
            (x, y, z, node_id),
        )
        self.conn.commit()

    def update_node_positions_bulk(self, positions: list):
        self.conn.executemany(
            "UPDATE nodes SET position_x = ?, position_y = ?, position_z = ? WHERE id = ?",
            positions,
        )
        self.conn.commit()

    def create_connection(
        self, source_id: int, target_id: int, strength: float, connection_type: str = "semantic"
    ) -> Optional[int]:
        try:
            cur = self.conn.execute(
                """INSERT OR IGNORE INTO connections (source_id, target_id, strength, connection_type)
                   VALUES (?, ?, ?, ?)""",
                (source_id, target_id, strength, connection_type),
            )
            self.conn.commit()
            return cur.lastrowid if cur.lastrowid else None
        except sqlite3.IntegrityError:
            return None

    def get_connections(self, galaxy_id: int) -> list:
        rows = self.conn.execute(
            """SELECT c.* FROM connections c
               JOIN nodes n ON c.source_id = n.id
               WHERE n.galaxy_id = ?""",
            (galaxy_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def delete_connection(self, connection_id: int):
        self.conn.execute("DELETE FROM connections WHERE id = ?", (connection_id,))
        self.conn.commit()

    def get_embeddings(self, galaxy_id: int) -> list:
        rows = self.conn.execute(
            "SELECT id, embedding FROM nodes WHERE galaxy_id = ? AND embedding IS NOT NULL",
            (galaxy_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def close(self):
        self.conn.close()
