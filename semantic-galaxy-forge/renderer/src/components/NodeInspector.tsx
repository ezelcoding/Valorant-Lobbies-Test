import { useState, useEffect } from 'react'
import { X, Save, Trash2, MapPin, FileText, Image, Mic, File } from 'lucide-react'
import type { Node } from '../lib/types'

interface NodeInspectorProps {
  node: Node
  onClose: () => void
  onUpdate: (nodeId: number, label: string) => void
  onDelete: (nodeId: number) => void
  onFocus: (nodeId: number) => void
}

const CONTENT_ICONS = {
  text: FileText,
  image: Image,
  audio: Mic,
  pdf: File,
}

export function NodeInspector({ node, onClose, onUpdate, onDelete, onFocus }: NodeInspectorProps) {
  const [label, setLabel] = useState(node.label || '')

  useEffect(() => {
    setLabel(node.label || '')
  }, [node.id, node.label])

  const handleSave = () => {
    onUpdate(node.id, label)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  const ContentIcon = CONTENT_ICONS[node.content_type] ?? FileText
  const timeAgo = getTimeAgo(node.created_at)

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="inspector-title">
          <ContentIcon size={16} />
          <span>Node Details</span>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>

      {node.thumbnail && (
        <div className="inspector-thumbnail">
          <img
            src={`data:image/jpeg;base64,${node.thumbnail}`}
            alt="Node thumbnail"
          />
        </div>
      )}

      <div className="inspector-field">
        <label>Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a label…"
          className="inspector-input"
        />
      </div>

      <div className="inspector-field">
        <label>Type</label>
        <span className={`content-badge badge-${node.content_type}`}>
          <ContentIcon size={12} />
          {node.content_type}
        </span>
      </div>

      <div className="inspector-field">
        <label>Added</label>
        <span className="inspector-meta">{timeAgo}</span>
      </div>

      <div className="inspector-field">
        <label>Position</label>
        <span className="inspector-meta position-text">
          ({node.position_x.toFixed(1)}, {node.position_y.toFixed(1)}, {node.position_z.toFixed(1)})
        </span>
      </div>

      <div className="inspector-field inspector-content">
        <label>Content</label>
        <div className="content-preview">
          {node.content_type === 'image' ? (
            <em>Image file</em>
          ) : (
            <p>{node.content.substring(0, 300)}{node.content.length > 300 ? '…' : ''}</p>
          )}
        </div>
      </div>

      {Object.keys(node.metadata || {}).length > 0 && (
        <div className="inspector-field">
          <label>Metadata</label>
          <pre className="metadata-preview">{JSON.stringify(node.metadata, null, 2)}</pre>
        </div>
      )}

      <div className="inspector-actions">
        <button className="btn-primary-sm" onClick={handleSave}>
          <Save size={14} />
          Save
        </button>
        <button
          className="btn-ghost-sm"
          onClick={() => onFocus(node.id)}
          title="Focus camera on this node"
        >
          <MapPin size={14} />
          Focus
        </button>
        <button
          className="btn-danger-sm"
          onClick={() => {
            if (confirm('Delete this node?')) onDelete(node.id)
          }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </aside>
  )
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
