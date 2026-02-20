import { Keyboard, X } from 'lucide-react'

interface KeyBindingsOverlayProps {
  visible: boolean
  onClose: () => void
  navMode: 'orbit' | 'fly'
}

const BINDINGS = [
  { key: 'F1', action: 'Toggle this help' },
  { key: 'V', action: 'Switch orbit ↔ fly mode' },
  { key: 'Space', action: 'Pause / resume physics' },
  { key: '—', action: '' },
  { key: 'Click canvas', action: 'Enable mouse look (fly mode)' },
  { key: 'W A S D', action: 'Fly forward/left/back/right' },
  { key: 'Space / Shift', action: 'Fly up / down' },
  { key: 'Mouse drag', action: 'Orbit around scene (orbit mode)' },
  { key: 'Scroll wheel', action: 'Zoom (orbit) / speed (fly)' },
  { key: 'Escape', action: 'Release mouse look' },
]

export function KeyBindingsOverlay({ visible, onClose, navMode }: KeyBindingsOverlayProps) {
  if (!visible) return null

  return (
    <div className="keybind-overlay">
      <div className="keybind-header">
        <div className="keybind-title">
          <Keyboard size={16} />
          Key Bindings
        </div>
        <button className="icon-btn" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="keybind-mode">
        Mode: <strong>{navMode === 'fly' ? '🚀 Fly' : '🌐 Orbit'}</strong>
      </div>
      <ul className="keybind-list">
        {BINDINGS.map((b, i) =>
          b.key === '—' ? (
            <li key={i} className="keybind-divider" />
          ) : (
            <li key={i} className="keybind-item">
              <kbd className="keybind-key">{b.key}</kbd>
              <span className="keybind-action">{b.action}</span>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
