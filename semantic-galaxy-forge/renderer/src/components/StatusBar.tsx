import { Activity, Cpu, Zap } from 'lucide-react'
import type { NavigationMode } from '../lib/navigation'

interface StatusBarProps {
  nodeCount: number
  connectionCount: number
  navMode: NavigationMode
  physicsEnabled: boolean
}

export function StatusBar({ nodeCount, connectionCount, navMode, physicsEnabled }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <Cpu size={12} />
        <span>{nodeCount} nodes</span>
      </div>
      <div className="status-sep" />
      <div className="status-item">
        <Activity size={12} />
        <span>{connectionCount} connections</span>
      </div>
      <div className="status-sep" />
      <div className="status-item">
        <Zap size={12} />
        <span>
          Physics: {physicsEnabled ? (
            <span className="status-active">running</span>
          ) : (
            <span className="status-paused">paused</span>
          )}
        </span>
      </div>
      <div className="status-sep" />
      <div className="status-item">
        <span>
          Mode: <strong>{navMode === 'fly' ? '🚀 Fly' : '🌐 Orbit'}</strong>
        </span>
      </div>
    </div>
  )
}
