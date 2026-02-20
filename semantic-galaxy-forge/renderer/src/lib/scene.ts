import * as THREE from 'three'
import type { Node, Connection, ViewMode } from './types'
import { PhysicsSimulation } from './physics'
import { SpaceshipControls } from './navigation'

const CONTENT_COLORS: Record<string, number> = {
  text: 0x4fc3f7,
  image: 0xce93d8,
  pdf: 0xff8a65,
  audio: 0xa5d6a7,
}

const COMMUNITY_COLORS = [
  0xef5350, 0x42a5f5, 0x66bb6a, 0xffca28,
  0xab47bc, 0x26c6da, 0xff7043, 0x8d6e63,
]

export class GalaxyScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private nodeMeshes: Map<number, THREE.Mesh> = new Map()
  private labelSprites: Map<number, THREE.Sprite> = new Map()
  private connectionLines: Map<number, THREE.Line> = new Map()
  private starField: THREE.Points | null = null
  private raycaster = new THREE.Raycaster()
  private animationId = 0
  private lastTime = 0
  private controls: SpaceshipControls
  physics: PhysicsSimulation

  onNodeClick?: (nodeId: number | null) => void
  onNodeHover?: (nodeId: number | null) => void

  private nodes: Node[] = []
  private connections: Connection[] = []
  private communities: number[][] = []
  private viewMode: ViewMode = 'default'
  private hoveredId: number | null = null

  constructor(canvas: HTMLCanvasElement, physics: PhysicsSimulation) {
    this.physics = physics

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x050510)
    this.scene.fog = new THREE.FogExp2(0x050510, 0.008)

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      2000
    )
    this.camera.position.set(0, 20, 50)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.controls = new SpaceshipControls(this.camera, canvas)
    this.setupLights()
    this.createStarField()
    this.setupMouseEvents(canvas)
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x111133, 1.0)
    this.scene.add(ambient)

    const point1 = new THREE.PointLight(0x4466ff, 2.0, 200)
    point1.position.set(20, 30, 20)
    this.scene.add(point1)

    const point2 = new THREE.PointLight(0xff4466, 1.5, 150)
    point2.position.set(-20, -10, -20)
    this.scene.add(point2)
  }

  private createStarField() {
    const count = 3000
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true })
    this.starField = new THREE.Points(geo, mat)
    this.scene.add(this.starField)
  }

  private setupMouseEvents(canvas: HTMLCanvasElement) {
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
      const meshes = Array.from(this.nodeMeshes.values())
      const hits = this.raycaster.intersectObjects(meshes)
      if (hits.length > 0) {
        const id = this.getMeshNodeId(hits[0].object as THREE.Mesh)
        this.onNodeClick?.(id)
      } else {
        this.onNodeClick?.(null)
      }
    })

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)
      const meshes = Array.from(this.nodeMeshes.values())
      const hits = this.raycaster.intersectObjects(meshes)
      const newHovered = hits.length > 0 ? this.getMeshNodeId(hits[0].object as THREE.Mesh) : null
      if (newHovered !== this.hoveredId) {
        this.hoveredId = newHovered
        this.onNodeHover?.(newHovered)
        canvas.style.cursor = newHovered !== null ? 'pointer' : 'default'
        this.updateNodeHighlights()
      }
    })
  }

  private getMeshNodeId(mesh: THREE.Mesh): number | null {
    for (const [id, m] of this.nodeMeshes) {
      if (m === mesh) return id
    }
    return null
  }

  setData(nodes: Node[], connections: Connection[], communities: number[][]) {
    this.nodes = nodes
    this.connections = connections
    this.communities = communities
    this.rebuildScene()
  }

  private rebuildScene() {
    for (const mesh of this.nodeMeshes.values()) this.scene.remove(mesh)
    for (const sprite of this.labelSprites.values()) this.scene.remove(sprite)
    for (const line of this.connectionLines.values()) this.scene.remove(line)
    this.nodeMeshes.clear()
    this.labelSprites.clear()
    this.connectionLines.clear()

    this.physics.clear()

    for (const node of this.nodes) {
      this.addNodeMesh(node)
      this.physics.addNode(
        node.id,
        new THREE.Vector3(node.position_x, node.position_y, node.position_z)
      )
    }

    for (const conn of this.connections) {
      this.addConnectionLine(conn)
      this.physics.addConnection(conn.source_id, conn.target_id, conn.strength)
    }
  }

  private addNodeMesh(node: Node) {
    const color = this.getNodeColor(node)
    const geo = new THREE.SphereGeometry(1.0, 16, 12)
    const mat = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      shininess: 80,
      transparent: true,
      opacity: 0.9,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(node.position_x, node.position_y, node.position_z)
    this.scene.add(mesh)
    this.nodeMeshes.set(node.id, mesh)

    const sprite = this.createLabel(node.label || node.content.substring(0, 30))
    sprite.position.set(node.position_x, node.position_y + 1.6, node.position_z)
    this.scene.add(sprite)
    this.labelSprites.set(node.id, sprite)
  }

  private addConnectionLine(conn: Connection) {
    const srcNode = this.nodes.find((n) => n.id === conn.source_id)
    const tgtNode = this.nodes.find((n) => n.id === conn.target_id)
    if (!srcNode || !tgtNode) return

    const points = [
      new THREE.Vector3(srcNode.position_x, srcNode.position_y, srcNode.position_z),
      new THREE.Vector3(tgtNode.position_x, tgtNode.position_y, tgtNode.position_z),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const opacity = Math.max(0.08, conn.strength * 0.6)
    const mat = new THREE.LineBasicMaterial({
      color: 0x3366cc,
      transparent: true,
      opacity,
    })
    const line = new THREE.Line(geo, mat)
    this.scene.add(line)
    this.connectionLines.set(conn.id, line)
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.roundRect(4, 4, 248, 56, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const truncated = text.length > 22 ? text.substring(0, 22) + '…' : text
    ctx.fillText(truncated, 128, 34)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(4, 1, 1)
    return sprite
  }

  private getNodeColor(node: Node): number {
    if (this.viewMode === 'clustered' && this.communities.length > 0) {
      const idx = this.communities.findIndex((c) => c.includes(node.id))
      if (idx >= 0) return COMMUNITY_COLORS[idx % COMMUNITY_COLORS.length]
    }
    return CONTENT_COLORS[node.content_type] ?? 0xaaaaaa
  }

  private updateNodeHighlights() {
    for (const [id, mesh] of this.nodeMeshes) {
      const mat = mesh.material as THREE.MeshPhongMaterial
      const isHovered = id === this.hoveredId
      mat.emissiveIntensity = isHovered ? 0.6 : 0.15
      mesh.scale.setScalar(isHovered ? 1.3 : 1.0)
    }
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode
    for (const node of this.nodes) {
      const mesh = this.nodeMeshes.get(node.id)
      if (!mesh) continue
      const mat = mesh.material as THREE.MeshPhongMaterial
      const color = new THREE.Color(this.getNodeColor(node))
      mat.color.copy(color)
      mat.emissive.copy(color)
    }
    if (mode === 'nebulae') {
      this.physics.config.repulsion_strength = this.physics.config.repulsion_strength * 0.5
      this.physics.config.attraction_strength = this.physics.config.attraction_strength * 0.5
      this.physics.config.damping = 0.15
    }
    if (mode === 'timeline') {
      this.applyTimelineLayout()
    }
  }

  private applyTimelineLayout() {
    const sorted = [...this.nodes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const step = sorted.length > 1 ? 30 / (sorted.length - 1) : 0
    sorted.forEach((node, i) => {
      const z = -15 + i * step
      const phNode = this.physics.nodes.get(node.id)
      if (phNode) {
        phNode.position.z = z
        phNode.velocity.set(0, 0, 0)
      }
    })
  }

  setCommunities(communities: number[][]) {
    this.communities = communities
    if (this.viewMode === 'clustered') {
      for (const node of this.nodes) {
        const mesh = this.nodeMeshes.get(node.id)
        if (!mesh) continue
        const mat = mesh.material as THREE.MeshPhongMaterial
        const color = new THREE.Color(this.getNodeColor(node))
        mat.color.copy(color)
        mat.emissive.copy(color)
      }
    }
  }

  highlightNode(nodeId: number | null) {
    for (const [id, mesh] of this.nodeMeshes) {
      const mat = mesh.material as THREE.MeshPhongMaterial
      if (nodeId === null) {
        mat.emissiveIntensity = 0.15
        mesh.scale.setScalar(1.0)
      } else if (id === nodeId) {
        mat.emissiveIntensity = 0.8
        mesh.scale.setScalar(1.5)
      } else {
        mat.emissiveIntensity = 0.05
        mesh.scale.setScalar(1.0)
      }
    }
  }

  focusNode(nodeId: number) {
    const ph = this.physics.nodes.get(nodeId)
    if (!ph) return
    if (this.controls.mode === 'orbit') {
      this.controls.setOrbitTarget(ph.position.clone())
    }
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  get navigationMode() {
    return this.controls.mode
  }

  set onNavigationModeChange(fn: (mode: import('./navigation').NavigationMode) => void) {
    this.controls.onModeChange = fn
  }

  toggleNavigationMode() {
    this.controls.setMode(this.controls.mode === 'orbit' ? 'fly' : 'orbit')
  }

  start() {
    this.lastTime = performance.now()
    this.loop()
  }

  private loop = () => {
    this.animationId = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now

    this.physics.update(dt)
    this.controls.update(dt)
    this.syncMeshPositions()

    if (this.starField) this.starField.rotation.y += 0.00005

    this.renderer.render(this.scene, this.camera)
  }

  private syncMeshPositions() {
    for (const [id, phNode] of this.physics.nodes) {
      const mesh = this.nodeMeshes.get(id)
      if (mesh) mesh.position.copy(phNode.position)
      const sprite = this.labelSprites.get(id)
      if (sprite) {
        sprite.position.set(phNode.position.x, phNode.position.y + 1.6, phNode.position.z)
      }
    }

    for (const [connId, line] of this.connectionLines) {
      const conn = this.connections.find((c) => c.id === connId)
      if (!conn) continue
      const src = this.physics.nodes.get(conn.source_id)
      const tgt = this.physics.nodes.get(conn.target_id)
      if (!src || !tgt) continue
      const pos = line.geometry.attributes.position as THREE.BufferAttribute
      pos.setXYZ(0, src.position.x, src.position.y, src.position.z)
      pos.setXYZ(1, tgt.position.x, tgt.position.y, tgt.position.z)
      pos.needsUpdate = true
    }
  }

  stop() {
    cancelAnimationFrame(this.animationId)
  }

  dispose() {
    this.stop()
    this.controls.dispose()
    this.renderer.dispose()
  }
}
