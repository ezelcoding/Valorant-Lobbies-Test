export type { Galaxy, Node, Connection, ViewMode, PhysicsConfig, ContentType, ModelStatus } from '../../../shared/types'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface PhysicsNodeState {
  id: number
  position: Vec3
  velocity: Vec3
  force: Vec3
  pinned: boolean
}
