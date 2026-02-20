import type { Galaxy, Node, Connection, PhysicsConfig, ModelStatus } from '../../../shared/types'

interface ElectronAPI {
  pythonInvoke: (channel: string, data?: unknown) => Promise<unknown>
  selectFiles: (filters?: unknown[]) => Promise<string[]>
  selectDirectory: () => Promise<string | null>
  openExternal: (url: string) => Promise<void>
  getDataPath: () => Promise<string>
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  onPythonEvent: (channel: string, callback: (data: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

function invoke<T>(channel: string, data?: unknown): Promise<T> {
  if (!window.electronAPI) {
    return Promise.reject(new Error('Electron API not available - running in browser mode'))
  }
  return window.electronAPI.pythonInvoke(channel, data) as Promise<T>
}

export const ipc = {
  getGalaxies: () => invoke<{ galaxies: Galaxy[] }>('getGalaxies'),
  createGalaxy: (name: string) => invoke<{ galaxy_id: number }>('createGalaxy', { name }),
  deleteGalaxy: (galaxy_id: number) => invoke<{ success: boolean }>('deleteGalaxy', { galaxy_id }),
  updateGalaxySettings: (galaxy_id: number, settings: Partial<PhysicsConfig>) =>
    invoke<{ success: boolean }>('updateGalaxySettings', { galaxy_id, settings }),

  getNodes: (galaxy_id: number) => invoke<{ nodes: Node[] }>('getNodes', { galaxy_id }),
  createTextNode: (galaxy_id: number, content: string, metadata?: Record<string, unknown>) =>
    invoke<{ node_id: number; position: [number, number, number] }>('createTextNode', {
      galaxy_id,
      content,
      metadata: metadata || {},
    }),
  deleteNode: (node_id: number) => invoke<{ success: boolean }>('deleteNode', { node_id }),
  updateNodeLabel: (node_id: number, label: string) =>
    invoke<{ success: boolean }>('updateNodeLabel', { node_id, label }),
  updateNodePosition: (node_id: number, x: number, y: number, z: number) =>
    invoke<{ success: boolean }>('updateNodePosition', { node_id, x, y, z }),

  getConnections: (galaxy_id: number) =>
    invoke<{ connections: Connection[] }>('getConnections', { galaxy_id }),
  createManualConnection: (source_id: number, target_id: number) =>
    invoke<{ connection_id: number }>('createManualConnection', { source_id, target_id }),
  deleteConnection: (connection_id: number) =>
    invoke<{ success: boolean }>('deleteConnection', { connection_id }),

  processFile: (
    galaxy_id: number,
    file_path: string,
    content_type: string
  ) =>
    invoke<{ nodes: Node[]; connections: Connection[] }>('processFile', {
      galaxy_id,
      file_path,
      content_type,
    }),

  recomputeLayout: (galaxy_id: number, params?: Record<string, unknown>) =>
    invoke<{ nodes: Node[] }>('recomputeLayout', { galaxy_id, params: params || {} }),

  detectCommunities: (galaxy_id: number) =>
    invoke<{ communities: number[][] }>('detectCommunities', { galaxy_id }),

  getModelStatus: () => invoke<ModelStatus>('getModelStatus'),
  downloadModels: () => invoke<{ success: boolean }>('downloadModels'),

  selectFiles: (filters?: unknown[]) => {
    if (!window.electronAPI) return Promise.resolve([])
    return window.electronAPI.selectFiles(filters)
  },
}
