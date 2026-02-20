export type ContentType = 'text' | 'image' | 'pdf' | 'audio'

export interface Galaxy {
  id: number
  name: string
  created_at: string
  modified_at: string
  node_count: number
  settings: GalaxySettings
}

export interface GalaxySettings {
  physics: PhysicsConfig
  view_mode: ViewMode
}

export interface Node {
  id: number
  galaxy_id: number
  content_type: ContentType
  content: string
  label: string
  position_x: number
  position_y: number
  position_z: number
  thumbnail?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Connection {
  id: number
  source_id: number
  target_id: number
  strength: number
  connection_type: 'semantic' | 'manual'
}

export type ViewMode = 'default' | 'clustered' | 'orbits' | 'timeline' | 'nebulae'

export interface PhysicsConfig {
  attraction_strength: number
  repulsion_strength: number
  damping: number
  max_velocity: number
  similarity_threshold: number
  enabled: boolean
}

export interface ProcessingProgress {
  stage: string
  progress: number
  message: string
}

export interface ModelStatus {
  sentence_transformers: boolean
  clip: boolean
  whisper: boolean
}
