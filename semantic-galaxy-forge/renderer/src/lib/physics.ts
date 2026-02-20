import * as THREE from 'three'
import type { PhysicsConfig } from './types'

export interface PhysicsNodeData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  force: THREE.Vector3
  pinned: boolean
  mass: number
}

export interface PhysicsConnectionData {
  sourceId: number
  targetId: number
  strength: number
}

export class PhysicsSimulation {
  nodes: Map<number, PhysicsNodeData> = new Map()
  connections: Map<string, PhysicsConnectionData> = new Map()
  config: PhysicsConfig
  private running: boolean = true

  constructor(config: PhysicsConfig) {
    this.config = config
  }

  addNode(id: number, position: THREE.Vector3, pinned = false) {
    this.nodes.set(id, {
      id,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      force: new THREE.Vector3(),
      pinned,
      mass: 1.0,
    })
  }

  removeNode(id: number) {
    this.nodes.delete(id)
    for (const key of this.connections.keys()) {
      const [s, t] = key.split('-').map(Number)
      if (s === id || t === id) {
        this.connections.delete(key)
      }
    }
  }

  addConnection(sourceId: number, targetId: number, strength: number) {
    const key = `${sourceId}-${targetId}`
    this.connections.set(key, { sourceId, targetId, strength })
  }

  removeConnection(sourceId: number, targetId: number) {
    this.connections.delete(`${sourceId}-${targetId}`)
    this.connections.delete(`${targetId}-${sourceId}`)
  }

  setRunning(val: boolean) {
    this.running = val
  }

  isRunning() {
    return this.running
  }

  pinNode(id: number, pinned: boolean) {
    const node = this.nodes.get(id)
    if (node) node.pinned = pinned
  }

  setNodePosition(id: number, position: THREE.Vector3) {
    const node = this.nodes.get(id)
    if (node) {
      node.position.copy(position)
      node.velocity.set(0, 0, 0)
    }
  }

  update(deltaTime: number) {
    if (!this.running || this.nodes.size < 2) return

    const capped = Math.min(deltaTime, 0.05)
    const nodesArray = Array.from(this.nodes.values())

    for (const node of nodesArray) {
      node.force.set(0, 0, 0)
    }

    this.applyRepulsion(nodesArray)
    this.applyAttraction()
    this.applyCenterGravity(nodesArray)
    this.integrate(nodesArray, capped)
  }

  private applyRepulsion(nodesArray: PhysicsNodeData[]) {
    const k = this.config.repulsion_strength
    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i + 1; j < nodesArray.length; j++) {
        const a = nodesArray[i]
        const b = nodesArray[j]
        const diff = new THREE.Vector3().subVectors(a.position, b.position)
        const distSq = diff.lengthSq()
        if (distSq < 0.0001) continue
        const dist = Math.sqrt(distSq)
        const mag = k / distSq
        diff.divideScalar(dist).multiplyScalar(mag)
        a.force.add(diff)
        b.force.sub(diff)
      }
    }
  }

  private applyAttraction() {
    const k = this.config.attraction_strength
    for (const conn of this.connections.values()) {
      const a = this.nodes.get(conn.sourceId)
      const b = this.nodes.get(conn.targetId)
      if (!a || !b) continue

      const diff = new THREE.Vector3().subVectors(b.position, a.position)
      const dist = diff.length()
      if (dist < 0.0001) continue

      const idealDist = 8 / (conn.strength + 0.1)
      const mag = (dist - idealDist) * k * conn.strength
      diff.divideScalar(dist).multiplyScalar(mag)

      a.force.add(diff)
      b.force.sub(diff)
    }
  }

  private applyCenterGravity(nodesArray: PhysicsNodeData[]) {
    const gravity = 0.005
    for (const node of nodesArray) {
      const toCenter = node.position.clone().negate().multiplyScalar(gravity)
      node.force.add(toCenter)
    }
  }

  private integrate(nodesArray: PhysicsNodeData[], dt: number) {
    const maxVel = this.config.max_velocity
    const damping = 1 - this.config.damping

    for (const node of nodesArray) {
      if (node.pinned) continue

      node.velocity.add(node.force.clone().multiplyScalar(dt / node.mass))
      node.velocity.multiplyScalar(damping)

      const speed = node.velocity.length()
      if (speed > maxVel) {
        node.velocity.multiplyScalar(maxVel / speed)
      }

      node.position.add(node.velocity.clone().multiplyScalar(dt))
    }
  }

  clear() {
    this.nodes.clear()
    this.connections.clear()
  }

  getKineticEnergy(): number {
    let energy = 0
    for (const node of this.nodes.values()) {
      energy += node.velocity.lengthSq()
    }
    return energy
  }
}
