# Semantic Galaxy Forge

A fully local, offline 3D semantic knowledge visualization desktop application. Build interconnected knowledge galaxies from text, images, PDFs, and audio files — visualized as force-directed 3D star systems.

## Features

- **Multi-modal input**: Text, images, PDFs, and audio files
- **Fully local AI**: Sentence Transformers, CLIP, and Whisper — no external APIs
- **3D force-directed physics**: Nodes attract/repel based on semantic similarity
- **Spaceship navigation**: Orbit and fly modes with WASD controls
- **5 view modes**: Default, Clustered, Orbits, Timeline, Nebulae
- **Community detection**: Louvain algorithm groups semantically similar nodes
- **Cross-platform**: Windows, macOS, Linux

## Architecture

```
semantic-galaxy-forge/
├── electron/           # Electron main + preload
├── renderer/           # React + Three.js frontend
│   └── src/
│       ├── components/ # UI components
│       ├── lib/        # Scene, physics, navigation
│       └── styles/     # Space-themed dark CSS
├── python/             # Python IPC backend
│   ├── main.py         # JSON-RPC IPC server
│   ├── database.py     # SQLite data layer
│   ├── embeddings.py   # Sentence Transformers + CLIP
│   ├── projection.py   # UMAP 3D projection
│   ├── community.py    # Louvain community detection
│   └── file_processors.py  # PDF, audio, text parsing
└── shared/             # TypeScript types
```

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git

### Install

```bash
# Root dependencies (Electron)
npm install

# Renderer dependencies
cd renderer && npm install && cd ..

# Python dependencies
cd python && pip install -r requirements.txt && cd ..
```

### Run in Development

```bash
npm run dev
```

This starts the Vite dev server and Electron together.

### Build

```bash
# All platforms
npm run build

# Platform-specific
npm run build:win    # Windows NSIS installer
npm run build:mac    # macOS DMG
npm run build:linux  # Linux AppImage + deb
```

## Navigation

| Key | Action |
|-----|--------|
| `V` | Toggle orbit ↔ fly mode |
| `F1` | Show/hide key bindings |
| `Space` | Pause/resume physics |
| `W A S D` | Fly forward/left/back/right |
| `Space / Shift` | Fly up / down |
| `Mouse drag` | Orbit (orbit mode) |
| `Click canvas` | Enable mouse look (fly mode) |
| `Scroll` | Zoom (orbit) / speed (fly) |
| `Escape` | Release mouse look |

## View Modes

| Mode | Description |
|------|-------------|
| Default | Active force-directed physics |
| Clustered | Color nodes by semantic community |
| Orbits | Orbital arrangement |
| Timeline | Layer by creation time |
| Nebulae | Relaxed organic physics |

## First-Run Model Download

On first launch, ~850 MB of AI models are downloaded:
- **Sentence Transformers** (~90 MB) — text embeddings
- **CLIP** (~600 MB) — image embeddings  
- **Whisper** (~150 MB) — audio transcription

Text nodes work without models. File processing requires them.

## Data Storage

All data is stored locally in:
- **Windows**: `%APPDATA%\semantic-galaxy-forge\data\`
- **macOS**: `~/Library/Application Support/semantic-galaxy-forge/data/`
- **Linux**: `~/.config/semantic-galaxy-forge/data/`

## License

MIT
