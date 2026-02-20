import { Activity, Network, Globe, Clock, Sparkles } from 'lucide-react'
import type { ViewMode } from '../lib/types'

interface ViewModeToolbarProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

const VIEW_MODES: { id: ViewMode; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'default', icon: Activity, label: 'Default', description: 'Active physics simulation' },
  { id: 'clustered', icon: Network, label: 'Clustered', description: 'Color by semantic community' },
  { id: 'orbits', icon: Globe, label: 'Orbits', description: 'Orbital visualization' },
  { id: 'timeline', icon: Clock, label: 'Timeline', description: 'Layered by creation time' },
  { id: 'nebulae', icon: Sparkles, label: 'Nebulae', description: 'Organic relaxed physics' },
]

export function ViewModeToolbar({ currentMode, onModeChange }: ViewModeToolbarProps) {
  return (
    <div className="view-toolbar">
      {VIEW_MODES.map((mode) => {
        const Icon = mode.icon
        return (
          <button
            key={mode.id}
            className={`view-btn ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => onModeChange(mode.id)}
            title={`${mode.label}: ${mode.description}`}
          >
            <Icon size={18} />
            <span className="view-btn-label">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
