import { useSyncExternalStore } from 'react'

type AvatarConfig = {
  characterId?: string
}

type Listener = () => void

const listeners = new Set<Listener>()
let config: AvatarConfig = {}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return config
}

function setConfig(patch: Partial<AvatarConfig> | ((prev: AvatarConfig) => AvatarConfig)) {
  config =
    typeof patch === 'function'
      ? (patch as (prev: AvatarConfig) => AvatarConfig)(config)
      : { ...config, ...patch }
  listeners.forEach((l) => l())
}

function resetConfig() {
  config = { characterId: 'james' }
  listeners.forEach((l) => l())
}

function saveConfig() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('avatar-config', JSON.stringify(config))
  }
}

if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem('avatar-config')
  if (stored) {
    try {
      config = JSON.parse(stored) as AvatarConfig
  } catch {
    config = { characterId: 'james' }
  }
} else {
  config = { characterId: 'james' }
}
}

export function useAvatar(selector?: (state: { config: AvatarConfig; set: (patch: Partial<AvatarConfig> | ((prev: AvatarConfig) => AvatarConfig)) => void; reset: () => void; save: () => void }) => unknown) {
  const state = {
    config,
    set: setConfig,
    reset: resetConfig,
    save: saveConfig,
  }
  return selector ? selector(state) : state
}