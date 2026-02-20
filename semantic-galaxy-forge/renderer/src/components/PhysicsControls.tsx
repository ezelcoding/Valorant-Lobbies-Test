import { useState } from 'react'
import { Sliders, Play, Pause, RotateCcw, ChevronDown } from 'lucide-react'
import type { PhysicsConfig } from '../lib/types'

interface PhysicsControlsProps {
  config: PhysicsConfig
  onChange: (config: PhysicsConfig) => void
  onRecomputeLayout: () => void
}

export function PhysicsControls({ config, onChange, onRecomputeLayout }: PhysicsControlsProps) {
  const [open, setOpen] = useState(false)

  const update = (key: keyof PhysicsConfig, value: number | boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className={`physics-panel ${open ? 'open' : ''}`}>
      <button className="physics-toggle" onClick={() => setOpen((v) => !v)}>
        <Sliders size={15} />
        <span>Physics</span>
        <ChevronDown size={13} className={`chevron-icon ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="physics-body">
          <div className="physics-row">
            <button
              className={`physics-play-btn ${config.enabled ? 'active' : ''}`}
              onClick={() => update('enabled', !config.enabled)}
              title={config.enabled ? 'Pause simulation' : 'Resume simulation'}
            >
              {config.enabled ? <Pause size={14} /> : <Play size={14} />}
              {config.enabled ? 'Pause' : 'Resume'}
            </button>
            <button
              className="btn-ghost-sm"
              onClick={onRecomputeLayout}
              title="Recompute UMAP layout"
            >
              <RotateCcw size={14} />
              Re-layout
            </button>
          </div>

          <SliderField
            label="Attraction"
            value={config.attraction_strength}
            min={0.01}
            max={2}
            step={0.01}
            onChange={(v) => update('attraction_strength', v)}
          />
          <SliderField
            label="Repulsion"
            value={config.repulsion_strength}
            min={1}
            max={200}
            step={1}
            onChange={(v) => update('repulsion_strength', v)}
          />
          <SliderField
            label="Damping"
            value={config.damping}
            min={0.01}
            max={0.3}
            step={0.005}
            onChange={(v) => update('damping', v)}
          />
          <SliderField
            label="Max Speed"
            value={config.max_velocity}
            min={1}
            max={50}
            step={0.5}
            onChange={(v) => update('max_velocity', v)}
          />
          <SliderField
            label="Similarity Threshold"
            value={config.similarity_threshold}
            min={0.1}
            max={0.95}
            step={0.05}
            onChange={(v) => update('similarity_threshold', v)}
          />
        </div>
      )}
    </div>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function SliderField({ label, value, min, max, step, onChange }: SliderFieldProps) {
  return (
    <div className="slider-field">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
      />
    </div>
  )
}
