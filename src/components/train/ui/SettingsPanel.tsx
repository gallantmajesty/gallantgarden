// In-journey settings panel — audio, camera, display and quality controls.
// Accessible while seated; does NOT pause the journey timer.

import { useSettings, QUALITY_AXES, type QualityPresetName, type ShadowQuality, type PostQuality, type TextureQuality } from '../../../store/settings'
import { useTrain } from '../../../store/train'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const line = useTrain((s) => s.line)
  const settings = useSettings()

  if (!line) return null

  return (
    <div className="train-settings water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-settings-head">
        <span className="train-settings-icon">⚙️</span>
        <strong>Settings</strong>
        <button className="train-settings-close" onClick={onClose} aria-label="Close settings">✕</button>
      </div>

      <div className="train-settings-body">
        {/* Audio */}
        <Section title="Audio">
          <Slider
            label="Master"
            value={settings.master}
            min={0} max={1} step={0.05}
            onChange={(v) => settings.set('master', v)}
          />
          <Slider
            label="Ambient"
            value={settings.ambientVol}
            min={0} max={1} step={0.05}
            onChange={(v) => settings.set('ambientVol', v)}
          />
          <Toggle
            label="Ambient sounds"
            checked={settings.ambientOn}
            onChange={(v) => settings.set('ambientOn', v)}
          />
        </Section>

        {/* Camera */}
        <Section title="Camera">
          <Select
            label="Camera mode"
            value={settings.cameraMode}
            options={[
              { value: 'first', label: 'First person' },
              { value: 'third', label: 'Third person' },
            ]}
            onChange={(v) => settings.set('cameraMode', v as 'first' | 'third')}
          />
          <Slider
            label="Sensitivity"
            value={settings.sensitivity}
            min={0.2} max={3} step={0.1}
            onChange={(v) => settings.set('sensitivity', v)}
          />
          <Toggle
            label="Invert Y"
            checked={settings.invertY}
            onChange={(v) => settings.set('invertY', v)}
          />
          <Toggle
            label="Hide avatar when looking"
            checked={settings.hideAvatarWhenMovingCamera}
            onChange={(v) => settings.set('hideAvatarWhenMovingCamera', v)}
          />
        </Section>

        {/* Display */}
        <Section title="Display">
          <Toggle
            label="Show name tags"
            checked={settings.fps}
            onChange={(v) => settings.set('fps', v)}
          />
          <Toggle
            label="Show FPS"
            checked={settings.fps}
            onChange={(v) => settings.set('fps', v)}
          />
          <Toggle
            label="Reduce motion"
            checked={settings.reduceMotion}
            onChange={(v) => settings.set('reduceMotion', v)}
          />
        </Section>

        {/* Quality */}
        <Section title="Quality">
          <QualityPresets
            current={settings.quality}
            onSelect={(preset) => settings.applyQualityPreset(preset)}
          />
          <Slider
            label="Resolution"
            value={settings.resolutionScale}
            min={0.5} max={1} step={0.05}
            displayValue={`${Math.round(settings.resolutionScale * 100)}%`}
            onChange={(v) => settings.setQualityAxis('resolutionScale', v)}
          />
          <Select
            label="Shadows"
            value={settings.shadowQuality}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'low', label: 'Low' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => settings.setQualityAxis('shadowQuality', v as ShadowQuality)}
          />
          <Select
            label="Post-processing"
            value={settings.postProcessing}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'low', label: 'Low' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => settings.setQualityAxis('postProcessing', v as PostQuality)}
          />
          <Select
            label="Textures"
            value={settings.textureQuality}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => settings.setQualityAxis('textureQuality', v as TextureQuality)}
          />
        </Section>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="train-settings-section">
      <span className="train-settings-section-title">{title}</span>
      <div className="train-settings-section-body">{children}</div>
    </div>
  )
}

function Slider({
  label, value, min, max, step, onChange, displayValue,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; displayValue?: string
}) {
  return (
    <label className="train-settings-slider">
      <span className="train-settings-slider-label">{label}</span>
      <span className="train-settings-slider-value">{displayValue ?? value.toFixed(2)}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="train-settings-toggle">
      <span className="train-settings-toggle-label">{label}</span>
      <button
        className={`train-settings-toggle-btn ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="train-settings-toggle-knob" />
      </button>
    </label>
  )
}

function Select({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="train-settings-select">
      <span className="train-settings-select-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function QualityPresets({ current, onSelect }: { current: string; onSelect: (p: QualityPresetName) => void }) {
  const presets: { id: QualityPresetName; label: string; desc: string }[] = [
    { id: 'low', label: 'Low', desc: 'Best FPS' },
    { id: 'medium', label: 'Medium', desc: 'Balanced' },
    { id: 'high', label: 'High', desc: 'Best looks' },
  ]
  return (
    <div className="train-settings-presets">
      {presets.map((p) => (
        <button
          key={p.id}
          className={`train-settings-preset ${current === p.id ? 'active' : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <strong>{p.label}</strong>
          <span>{p.desc}</span>
        </button>
      ))}
    </div>
  )
}

function accentVars(glow?: string, accent?: string): React.CSSProperties {
  if (!glow || !accent) return {}
  return { ['--train-glow' as string]: glow, ['--train-accent' as string]: accent }
}
