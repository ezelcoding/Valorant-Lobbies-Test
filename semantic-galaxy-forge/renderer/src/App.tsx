import { useState, useEffect, useCallback, useRef } from 'react'
import { Keyboard } from 'lucide-react'
import { GalaxySidebar } from './components/GalaxySidebar'
import { GalaxyCanvas } from './components/GalaxyCanvas'
import { NodeInspector } from './components/NodeInspector'
import { ViewModeToolbar } from './components/ViewModeToolbar'
import { InputPanel } from './components/InputPanel'
import { PhysicsControls } from './components/PhysicsControls'
import { KeyBindingsOverlay } from './components/KeyBindingsOverlay'
import { StatusBar } from './components/StatusBar'
import { ModelSetupModal } from './components/ModelSetupModal'
import { ipc } from './lib/ipc'
import type { Galaxy, Node, Connection, ViewMode, PhysicsConfig } from './lib/types'
import type { ModelStatus } from '../../shared/types'
import type { GalaxyScene } from './lib/scene'
import type { NavigationMode } from './lib/navigation'

const DEFAULT_PHYSICS: PhysicsConfig = {
  attraction_strength: 0.15,
  repulsion_strength: 60,
  damping: 0.08,
  max_velocity: 15,
  similarity_threshold: 0.5,
  enabled: true,
}

export default function App() {
  const [galaxies, setGalaxies] = useState<Galaxy[]>([])
  const [currentGalaxy, setCurrentGalaxy] = useState<Galaxy | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [communities, setCommunities] = useState<number[][]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('default')
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(DEFAULT_PHYSICS)
  const [navMode, setNavMode] = useState<NavigationMode>('orbit')
  const [showKeyBindings, setShowKeyBindings] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  const [showModelSetup, setShowModelSetup] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const sceneRef = useRef<GalaxyScene | null>(null)

  useEffect(() => {
    loadGalaxies()
    checkModelStatus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'F1') {
        e.preventDefault()
        setShowKeyBindings((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const checkModelStatus = async () => {
    try {
      const status = await ipc.getModelStatus()
      setModelStatus(status)
      const allReady = status.sentence_transformers && status.clip && status.whisper
      if (!allReady) setShowModelSetup(true)
    } catch {
      setModelStatus({ sentence_transformers: false, clip: false, whisper: false })
      setShowModelSetup(true)
    }
  }

  const loadGalaxies = async () => {
    try {
      const { galaxies: list } = await ipc.getGalaxies()
      setGalaxies(list)
    } catch {
      showToast('Could not connect to backend')
    }
  }

  const handleSelectGalaxy = useCallback(async (galaxy: Galaxy) => {
    setCurrentGalaxy(galaxy)
    setSelectedNode(null)
    setNodes([])
    setConnections([])
    setCommunities([])
    try {
      const [nodesResult, connResult] = await Promise.all([
        ipc.getNodes(galaxy.id),
        ipc.getConnections(galaxy.id),
      ])
      setNodes(nodesResult.nodes)
      setConnections(connResult.connections)
    } catch {
      showToast('Failed to load galaxy data')
    }
  }, [])

  const handleCreateGalaxy = async (name: string) => {
    try {
      await ipc.createGalaxy(name)
      await loadGalaxies()
      showToast(`Galaxy "${name}" created`)
    } catch {
      showToast('Failed to create galaxy')
    }
  }

  const handleDeleteGalaxy = async (id: number) => {
    try {
      await ipc.deleteGalaxy(id)
      if (currentGalaxy?.id === id) {
        setCurrentGalaxy(null)
        setNodes([])
        setConnections([])
        setCommunities([])
      }
      await loadGalaxies()
      showToast('Galaxy deleted')
    } catch {
      showToast('Failed to delete galaxy')
    }
  }

  const handleAddText = async (text: string) => {
    if (!currentGalaxy) return
    setProcessing(true)
    try {
      const result = await ipc.createTextNode(currentGalaxy.id, text)
      await refreshGalaxyData()
      showToast(`Node added (id: ${result.node_id})`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add node')
    } finally {
      setProcessing(false)
    }
  }

  const handleAddFiles = async (filePaths: string[]) => {
    if (!currentGalaxy) return
    setProcessing(true)
    try {
      const ext = (p: string) => p.split('.').pop()?.toLowerCase() ?? ''
      const typeFor = (p: string): string => {
        const e = ext(p)
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(e)) return 'image'
        if (e === 'pdf') return 'pdf'
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(e)) return 'audio'
        return 'text'
      }
      for (const path of filePaths) {
        await ipc.processFile(currentGalaxy.id, path, typeFor(path))
      }
      await refreshGalaxyData()
      showToast(`Added ${filePaths.length} file(s)`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to process files')
    } finally {
      setProcessing(false)
    }
  }

  const handleSelectFiles = async () => {
    const paths = await ipc.selectFiles()
    if (paths.length > 0) {
      await handleAddFiles(paths)
    }
  }

  const refreshGalaxyData = async () => {
    if (!currentGalaxy) return
    const [nodesResult, connResult] = await Promise.all([
      ipc.getNodes(currentGalaxy.id),
      ipc.getConnections(currentGalaxy.id),
    ])
    setNodes(nodesResult.nodes)
    setConnections(connResult.connections)
    await loadGalaxies()
  }

  const handleDeleteNode = async (nodeId: number) => {
    try {
      await ipc.deleteNode(nodeId)
      setSelectedNode(null)
      await refreshGalaxyData()
      showToast('Node deleted')
    } catch {
      showToast('Failed to delete node')
    }
  }

  const handleUpdateNode = async (nodeId: number, label: string) => {
    try {
      await ipc.updateNodeLabel(nodeId, label)
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, label } : n))
      )
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, label } : null))
      }
      showToast('Label updated')
    } catch {
      showToast('Failed to update node')
    }
  }

  const handleFocusNode = (nodeId: number) => {
    sceneRef.current?.focusNode(nodeId)
  }

  const handleNodeSelect = useCallback(
    (nodeId: number | null) => {
      if (nodeId === null) {
        setSelectedNode(null)
        sceneRef.current?.highlightNode(null)
      } else {
        const node = nodes.find((n) => n.id === nodeId) ?? null
        setSelectedNode(node)
        sceneRef.current?.highlightNode(nodeId)
      }
    },
    [nodes]
  )

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode)
    if (mode === 'clustered' && currentGalaxy && communities.length === 0) {
      try {
        const result = await ipc.detectCommunities(currentGalaxy.id)
        setCommunities(result.communities)
      } catch {
        showToast('Community detection failed')
      }
    }
  }

  const handleRecomputeLayout = async () => {
    if (!currentGalaxy) return
    setProcessing(true)
    try {
      const result = await ipc.recomputeLayout(currentGalaxy.id)
      setNodes(result.nodes)
      showToast('Layout recomputed')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Layout failed')
    } finally {
      setProcessing(false)
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="app-root">
      {showModelSetup && (
        <ModelSetupModal
          modelStatus={modelStatus}
          onDownload={async () => {
            await ipc.downloadModels()
            await checkModelStatus()
          }}
          onDismiss={() => setShowModelSetup(false)}
        />
      )}

      <GalaxySidebar
        galaxies={galaxies}
        currentGalaxy={currentGalaxy}
        onSelect={handleSelectGalaxy}
        onCreate={handleCreateGalaxy}
        onDelete={handleDeleteGalaxy}
      />

      <div className="main-area">
        <div className="canvas-wrapper">
          <GalaxyCanvas
            nodes={nodes}
            connections={connections}
            communities={communities}
            viewMode={viewMode}
            physicsConfig={physicsConfig}
            onNodeSelect={handleNodeSelect}
            onNavigationModeChange={setNavMode}
            sceneRef={sceneRef}
          />

          {nodes.length === 0 && currentGalaxy && (
            <div className="empty-state">
              <p>🌌 Galaxy is empty</p>
              <p>Add text, images, PDFs, or audio files below</p>
            </div>
          )}

          {!currentGalaxy && (
            <div className="empty-state">
              <p>🚀 Semantic Galaxy Forge</p>
              <p>Create or select a galaxy to begin</p>
            </div>
          )}

          <ViewModeToolbar currentMode={viewMode} onModeChange={handleViewModeChange} />

          <div className="top-right-controls">
            <PhysicsControls
              config={physicsConfig}
              onChange={setPhysicsConfig}
              onRecomputeLayout={handleRecomputeLayout}
            />
            <button
              className="icon-btn keybind-btn"
              onClick={() => setShowKeyBindings((v) => !v)}
              title="Key bindings (F1)"
            >
              <Keyboard size={16} />
            </button>
          </div>

          <KeyBindingsOverlay
            visible={showKeyBindings}
            onClose={() => setShowKeyBindings(false)}
            navMode={navMode}
          />
        </div>

        <InputPanel
          galaxyId={currentGalaxy?.id ?? null}
          onAddText={handleAddText}
          onAddFiles={handleAddFiles}
          onSelectFiles={handleSelectFiles}
          processing={processing}
        />

        <StatusBar
          nodeCount={nodes.length}
          connectionCount={connections.length}
          navMode={navMode}
          physicsEnabled={physicsConfig.enabled}
        />
      </div>

      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onClose={() => {
            setSelectedNode(null)
            sceneRef.current?.highlightNode(null)
          }}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onFocus={handleFocusNode}
        />
      )}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  )
}
