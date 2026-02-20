import { useState } from 'react'
import { Download, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react'
import type { ModelStatus } from '../../../shared/types'

interface ModelSetupModalProps {
  modelStatus: ModelStatus | null
  onDownload: () => Promise<void>
  onDismiss: () => void
}

export function ModelSetupModal({ modelStatus, onDownload, onDismiss }: ModelSetupModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allReady =
    modelStatus?.sentence_transformers && modelStatus?.clip && modelStatus?.whisper

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const models = [
    {
      name: 'Sentence Transformers',
      key: 'sentence_transformers' as keyof ModelStatus,
      desc: 'Text embedding (~90 MB)',
    },
    {
      name: 'CLIP',
      key: 'clip' as keyof ModelStatus,
      desc: 'Image & text embedding (~600 MB)',
    },
    {
      name: 'Whisper',
      key: 'whisper' as keyof ModelStatus,
      desc: 'Audio transcription (~150 MB)',
    },
  ]

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-icon">
          <Zap size={32} />
        </div>
        <h2 className="modal-title">Semantic Galaxy Forge</h2>
        <p className="modal-subtitle">
          {allReady
            ? 'All AI models are ready. You can start building knowledge galaxies!'
            : 'AI models need to be downloaded before processing files. This is a one-time download (~850 MB).'}
        </p>

        <ul className="model-list">
          {models.map((m) => {
            const ready = modelStatus?.[m.key]
            return (
              <li key={m.key} className="model-item">
                {ready ? (
                  <CheckCircle size={16} className="model-ready" />
                ) : (
                  <AlertCircle size={16} className="model-missing" />
                )}
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-desc">{m.desc}</span>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="modal-note">
          You can still add text nodes without downloading models. File processing (images, PDFs, audio) requires the models.
        </p>

        {error && (
          <div className="error-banner">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="modal-actions">
          {!allReady && (
            <button
              className="btn-primary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download Models
                </>
              )}
            </button>
          )}
          <button className="btn-ghost" onClick={onDismiss}>
            {allReady ? 'Get Started' : 'Skip for Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
