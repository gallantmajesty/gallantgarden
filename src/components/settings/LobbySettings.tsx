import { useState } from 'react'
import {
  MAX_BRIGHTNESS,
  MIN_BRIGHTNESS,
  THEME_PRESETS,
  useSettings,
  type CameraMode,
  type Quality,
  type Theme,
  type ThemePreset,
} from '../../store/settings'
import { Section, Seg, Slider, Toggle } from './controls'
import { WebCustomizationContent } from './WebCustomization'
import './LobbySettings.css'

type Tab = 'visual' | 'theme' | 'performance' | 'controls'

const TABS: [Tab, string][] = [
  ['visual', 'Visual'],
  ['theme', 'Theme'],
  ['performance', 'Performance'],
  ['controls', 'Controls'],
]

/**
 * Lobby settings — a modern game-style drawer. Reads/writes the single
 * `useSettings` store (the source of truth), which persists to localStorage and
 * syncs to the signed-in user's cloud profile. Visual changes are applied
 * app-wide via applyVisualSettings() (wired in App).
 */
export function LobbySettings({ onClose }: { onClose: () => void }) {
  const s = useSettings()
  const [tab, setTab] = useState<Tab>('visual')

  return (
    <div className="settings-scrim" onPointerDown={onClose}>
      <div className="settings-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="settings-x" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="fl-set-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`fl-set-tab ${tab === id ? 'on' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === 'visual' && (
            <>
              <Section title="Appearance">
                <Seg<Theme>
                  label="Mode"
                  value={s.theme}
                  options={[
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                  ]}
                  onChange={(v) => s.set('theme', v)}
                />
                <Slider
                  label="Brightness"
                  value={s.brightness}
                  min={MIN_BRIGHTNESS}
                  max={MAX_BRIGHTNESS}
                  step={0.05}
                  onChange={(v) => s.set('brightness', v)}
                />
              </Section>

              <Section title="Theme preset">
                <Seg<ThemePreset>
                  label="Accent"
                  value={s.themePreset}
                  options={THEME_PRESETS.map((p) => [p.id, p.label])}
                  onChange={(v) => s.set('themePreset', v)}
                />
                <div className="fl-set-swatches">
                  {THEME_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className={`fl-set-swatch ${s.themePreset === p.id ? 'on' : ''}`}
                      style={{ background: `linear-gradient(180deg, ${p.accent}, ${p.accentDark})` }}
                      title={p.label}
                      aria-label={p.label}
                      onClick={() => s.set('themePreset', p.id)}
                    />
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === 'theme' && <WebCustomizationContent />}

          {tab === 'performance' && (
            <>
              <Section title="Quality">
                <Seg<Quality>
                  label="Graphics quality"
                  value={s.quality}
                  options={[
                    ['low', 'Low'],
                    ['medium', 'Medium'],
                    ['high', 'High'],
                  ]}
                  onChange={(v) => s.set('quality', v)}
                />
                <Toggle
                  label="Cinematic effects (bloom + fog)"
                  value={s.cinematic}
                  onChange={(v) => s.set('cinematic', v)}
                />
                <Toggle label="Show FPS counter" value={s.fps} onChange={(v) => s.set('fps', v)} />
              </Section>

              <Section title="Motion">
                <Toggle
                  label="UI animations"
                  value={s.animations}
                  onChange={(v) => s.set('animations', v)}
                />
                <Toggle
                  label="Reduce motion (accessibility)"
                  value={s.reduceMotion}
                  onChange={(v) => s.set('reduceMotion', v)}
                />
              </Section>
            </>
          )}

          {tab === 'controls' && (
            <>
              <Section title="Camera & input">
                <Seg<CameraMode>
                  label="Camera"
                  value={s.cameraMode}
                  options={[
                    ['first', 'First (F1)'],
                    ['third', 'Third (F2)'],
                    ['front', 'Front (F3)'],
                  ]}
                  onChange={(v) => s.set('cameraMode', v)}
                />
                <Slider
                  label="Look sensitivity"
                  value={(s.sensitivity - 0.2) / 1.8}
                  onChange={(v) => s.set('sensitivity', 0.2 + v * 1.8)}
                />
                <Toggle label="Invert mouse Y" value={s.invertY} onChange={(v) => s.set('invertY', v)} />
              </Section>

              <Section title="Keybinds">
                <div className="fl-set-keybinds">
                  <Row k="Move" v="W A S D" />
                  <Row k="Look" v="Mouse" />
                  <Row k="Interact" v="E" />
                  <Row k="Camera" v="F1 / F2 / F3" />
                </div>
                <p className="fl-set-note">Custom keybinds are coming soon.</p>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="fl-set-keybind">
      <span>{k}</span>
      <kbd>{v}</kbd>
    </div>
  )
}
