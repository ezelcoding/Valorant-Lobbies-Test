import { useEffect, useRef, useCallback } from 'react'
import type { Node, Connection, ViewMode, PhysicsConfig } from '../lib/types'
import { PhysicsSimulation } from '../lib/physics'
import { GalaxyScene } from '../lib/scene'

interface GalaxyCanvasProps {
  nodes: Node[]
  connections: Connection[]
  communities: number[][]
  viewMode: ViewMode
  physicsConfig: PhysicsConfig
  onNodeSelect: (nodeId: number | null) => void
  onNavigationModeChange?: (mode: 'orbit' | 'fly') => void
  onPhysicsToggle?: (enabled: boolean) => void
  sceneRef?: React.MutableRefObject<GalaxyScene | null>
}

export function GalaxyCanvas({
  nodes,
  connections,
  communities,
  viewMode,
  physicsConfig,
  onNodeSelect,
  onNavigationModeChange,
  onPhysicsToggle,
  sceneRef,
}: GalaxyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneInstance = useRef<GalaxyScene | null>(null)
  const physicsRef = useRef<PhysicsSimulation | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const physics = new PhysicsSimulation(physicsConfig)
    physicsRef.current = physics

    const scene = new GalaxyScene(canvas, physics)
    sceneInstance.current = scene
    if (sceneRef) sceneRef.current = scene

    scene.onNodeClick = onNodeSelect
    scene.onNavigationModeChange = (mode) => onNavigationModeChange?.(mode)
    scene.start()

    const resizeObserver = new ResizeObserver(() => {
      if (canvas.parentElement) {
        const { clientWidth, clientHeight } = canvas.parentElement
        scene.resize(clientWidth, clientHeight)
      }
    })
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)

    return () => {
      resizeObserver.disconnect()
      scene.dispose()
      sceneInstance.current = null
      if (sceneRef) sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (sceneInstance.current && physicsRef.current) {
      physicsRef.current.config = physicsConfig
      sceneInstance.current.setBasePhysicsConfig(physicsConfig)
    }
  }, [physicsConfig])

  useEffect(() => {
    if (sceneInstance.current) {
      sceneInstance.current.setData(nodes, connections, communities)
    }
  }, [nodes, connections, communities])

  useEffect(() => {
    if (sceneInstance.current) {
      sceneInstance.current.setViewMode(viewMode)
    }
  }, [viewMode])

  useEffect(() => {
    if (sceneInstance.current) {
      sceneInstance.current.setCommunities(communities)
    }
  }, [communities])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault()
      if (onPhysicsToggle) {
        onPhysicsToggle(!physicsConfig.enabled)
      } else if (physicsRef.current) {
        physicsRef.current.setRunning(!physicsRef.current.isRunning())
      }
    }
  }, [onPhysicsToggle, physicsConfig.enabled])

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
    />
  )
}
