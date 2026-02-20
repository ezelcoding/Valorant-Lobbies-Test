import { useState } from 'react'
import { Plus, Trash2, Layers, ChevronRight } from 'lucide-react'
import type { Galaxy } from '../lib/types'

interface GalaxySidebarProps {
  galaxies: Galaxy[]
  currentGalaxy: Galaxy | null
  onSelect: (galaxy: Galaxy) => void
  onCreate: (name: string) => void
  onDelete: (id: number) => void
}

export function GalaxySidebar({
  galaxies,
  currentGalaxy,
  onSelect,
  onCreate,
  onDelete,
}: GalaxySidebarProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setNewName('')
    setShowCreate(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') {
      setShowCreate(false)
      setNewName('')
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Layers size={18} />
        <span>Galaxies</span>
      </div>

      <ul className="galaxy-list">
        {galaxies.map((galaxy) => (
          <li
            key={galaxy.id}
            className={`galaxy-item ${currentGalaxy?.id === galaxy.id ? 'active' : ''}`}
          >
            <button className="galaxy-select-btn" onClick={() => onSelect(galaxy)}>
              <ChevronRight size={14} className="chevron" />
              <span className="galaxy-name">{galaxy.name}</span>
              <span className="node-count">{galaxy.node_count}</span>
            </button>
            <button
              className="galaxy-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete galaxy "${galaxy.name}"?`)) {
                  onDelete(galaxy.id)
                }
              }}
              title="Delete galaxy"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
        {galaxies.length === 0 && (
          <li className="galaxy-empty">No galaxies yet</li>
        )}
      </ul>

      {showCreate ? (
        <div className="create-form">
          <input
            autoFocus
            placeholder="Galaxy name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="create-input"
          />
          <div className="create-actions">
            <button className="btn-primary-sm" onClick={handleCreate}>
              Create
            </button>
            <button
              className="btn-ghost-sm"
              onClick={() => {
                setShowCreate(false)
                setNewName('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="new-galaxy-btn" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Galaxy
        </button>
      )}
    </aside>
  )
}
