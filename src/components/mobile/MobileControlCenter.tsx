import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../store/settings'
import { Toggle, Slider, Seg, Section } from '../settings/controls'
import { WebCustomizationContent } from '../settings/WebCustomization'
import { MIN_BRIGHTNESS, MAX_BRIGHTNESS } from '../../store/settings'
import { useIsMobileOrTablet } from '../../hooks/useDevice'
import './MobileControlCenter.css'

type Tab = 'look' | 'performance' | 'audio' | 'camera'

const QUALITY_OPTS: [string, string][] = [
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
]

/**
 * Global mobile/tablet Control Center.
 *
 * A persistent right-edge handle (only shown on phones/tablets) opens a slide-in
 * drawer that exposes the SAME settings store the desktop uses — theme & web
 * customization, graphics/performance, audio and camera — so every control from
 * across the app is reachable from any screen on a touch device. Desktop is
 * untouched: this component returns null there.
 */
export function MobileControlCenter() {
  const isMobile = useIsMobileOrTablet()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('look')
  const { t } = useTranslation()

  if (!isMobile) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          className="mcc-handle"
          onClick={() => setOpen(true)}
          aria-label="Open controls"
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
          </svg>
          <span className="mcc-handle-label">Controls</span>
        </button>
      )}

      {open && (
        <div className="mcc-scrim" onClick={() => setOpen(false)}>
          <aside
            className="mcc-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Control Center"
          >
            <header className="mcc-head">
              <h2>{t('common.settings') || 'Controls'}</h2>
              <button className="mcc-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>

            <nav className="mcc-tabs">
              {([
                ['look', 'Look'],
                ['performance', 'Performance'],
                ['audio', 'Audio'],
                ['camera', 'Camera'],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  className={`mcc-tab ${tab === id ? 'on' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="mcc-scroll">
              {tab === 'look' && (
                <div className="mcc-look">
                  <BrightnessRow />
                  <WebCustomizationContent />
                </div>
              )}
              {tab === 'performance' && <PerformanceTab />}
              {tab === 'audio' && <AudioTab />}
              {tab === 'camera' && <CameraTab />}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function BrightnessRow() {
  const brightness = useSettings((s) => s.brightness)
  const set = useSettings((s) => s.set)
  return (
    <Section title="Brightness">
      <Slider
        label="Screen brightness"
        value={brightness}
        min={MIN_BRIGHTNESS}
        max={MAX_BRIGHTNESS}
        step={0.02}
        display={`${Math.round(brightness * 100)}%`}
        onChange={(v) => set('brightness', v)}
      />
    </Section>
  )
}

function PerformanceTab() {
  const quality = useSettings((s) => s.quality)
  const applyQualityPreset = useSettings((s) => s.applyQualityPreset)
  const autoQuality = useSettings((s) => s.autoQuality)
  const set = useSettings((s) => s.set)
  const reduceMotion = useSettings((s) => s.reduceMotion)
  const animations = useSettings((s) => s.animations)
  const highContrast = useSettings((s) => s.highContrast)
  const fps = useSettings((s) => s.fps)

  return (
    <>
      <Section title="Graphics quality">
        <Seg
          label="Overall quality"
          value={quality === 'custom' ? 'high' : quality}
          options={QUALITY_OPTS}
          onChange={(v) => applyQualityPreset(v as 'low' | 'medium' | 'high')}
        />
        <Toggle label="Auto quality (steps up after load)" value={autoQuality} onChange={(v) => set('autoQuality', v)} />
        <Toggle label="Show FPS counter" value={fps} onChange={(v) => set('fps', v)} />
      </Section>
      <Section title="Motion & accessibility">
        <Toggle label="Reduce motion" value={reduceMotion} onChange={(v) => set('reduceMotion', v)} />
        <Toggle label="UI animations" value={animations} onChange={(v) => set('animations', v)} />
        <Toggle label="High contrast" value={highContrast} onChange={(v) => set('highContrast', v)} />
      </Section>
    </>
  )
}

function AudioTab() {
  const master = useSettings((s) => s.master)
  const ambientVol = useSettings((s) => s.ambientVol)
  const rainVol = useSettings((s) => s.rainVol)
  const ambientOn = useSettings((s) => s.ambientOn)
  const rainOn = useSettings((s) => s.rainOn)
  const set = useSettings((s) => s.set)

  return (
    <>
      <Section title="Volume">
        <Slider label="Master volume" value={master} min={0} max={1} step={0.01} display={`${Math.round(master * 100)}%`} onChange={(v) => set('master', v)} />
        <Slider label="Ambient volume" value={ambientVol} min={0} max={1} step={0.01} display={`${Math.round(ambientVol * 100)}%`} onChange={(v) => set('ambientVol', v)} />
        <Slider label="Rain volume" value={rainVol} min={0} max={1} step={0.01} display={`${Math.round(rainVol * 100)}%`} onChange={(v) => set('rainVol', v)} />
      </Section>
      <Section title="Soundscape">
        <Toggle label="Ambient music" value={ambientOn} onChange={(v) => set('ambientOn', v)} />
        <Toggle label="Rain sounds" value={rainOn} onChange={(v) => set('rainOn', v)} />
      </Section>
    </>
  )
}

function CameraTab() {
  const cameraMode = useSettings((s) => s.cameraMode)
  const set = useSettings((s) => s.set)
  const sensitivity = useSettings((s) => s.sensitivity)
  const invertY = useSettings((s) => s.invertY)
  const cinematicTour = useSettings((s) => s.cinematicTour)

  return (
    <Section title="Camera">
      <Seg
        label="View"
        value={cameraMode}
        options={[
          ['third', '3rd person'],
          ['first', '1st person'],
        ]}
        onChange={(v) => set('cameraMode', v as 'first' | 'third')}
      />
      <Slider label="Look sensitivity" value={sensitivity} min={0.2} max={2} step={0.05} display={`${sensitivity.toFixed(2)}×`} onChange={(v) => set('sensitivity', v)} />
      <Toggle label="Invert vertical look" value={invertY} onChange={(v) => set('invertY', v)} />
      <Toggle label="Cinematic Tour available" value={cinematicTour} onChange={(v) => set('cinematicTour', v)} />
    </Section>
  )
}
