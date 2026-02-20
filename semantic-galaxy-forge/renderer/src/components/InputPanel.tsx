import { useState, useRef } from 'react'
import { Upload, Plus, Loader2, FileText, Image, Mic, File, FolderOpen } from 'lucide-react'

interface InputPanelProps {
  galaxyId: number | null
  onAddText: (text: string) => Promise<void>
  onAddFiles: (files: string[]) => Promise<void>
  onSelectFiles: () => Promise<void>
  processing: boolean
}

export function InputPanel({
  galaxyId,
  onAddText,
  onAddFiles,
  onSelectFiles,
  processing,
}: InputPanelProps) {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleTextSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || !galaxyId) return
    await onAddText(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!galaxyId) return

    const paths: string[] = []
    for (const item of Array.from(e.dataTransfer.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && (file as unknown as { path?: string }).path) {
          paths.push((file as unknown as { path: string }).path)
        }
      }
    }
    if (paths.length > 0) {
      await onAddFiles(paths)
    }
  }

  const disabled = !galaxyId || processing

  return (
    <div
      className={`input-panel ${isDragging ? 'dragging' : ''} ${expanded ? 'expanded' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <Upload size={36} />
          <span>Drop files to add to galaxy</span>
          <div className="drop-types">
            <FileText size={16} /> Text
            <Image size={16} /> Images
            <File size={16} /> PDFs
            <Mic size={16} /> Audio
          </div>
        </div>
      )}

      <div className="input-row">
        <button
          className="expand-btn"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse input' : 'Expand input'}
        >
          <Plus size={16} style={{ transform: expanded ? 'rotate(45deg)' : 'none', transition: '0.2s' }} />
        </button>

        <textarea
          ref={inputRef}
          className={`text-input ${expanded ? 'expanded' : ''}`}
          placeholder={
            galaxyId
              ? "Type or paste text… (Ctrl+Enter to add)"
              : "Select a galaxy first to add nodes"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={expanded ? 5 : 2}
        />

        <div className="input-actions">
          <button
            className="btn-primary-sm"
            onClick={handleTextSubmit}
            disabled={disabled || !text.trim()}
            title="Add text node (Ctrl+Enter)"
          >
            {processing ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            Add Text
          </button>

          <button
            className="btn-ghost-sm"
            onClick={onSelectFiles}
            disabled={disabled}
            title="Browse and select files"
          >
            <FolderOpen size={14} />
            Browse Files
          </button>
        </div>
      </div>

      {!galaxyId && (
        <p className="input-hint">
          <Upload size={13} /> Create or select a galaxy from the sidebar to start adding knowledge nodes
        </p>
      )}
    </div>
  )
}
