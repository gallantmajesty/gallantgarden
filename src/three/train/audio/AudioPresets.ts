// AudioPresets — per-route audio configuration mapped to user's actual files.
// All file paths reference files in /public/audio/ that the user provided.

import type { LineId } from '../../../lib/train/lines'

export interface AudioPreset {
  id: LineId
  label: string

  // Layer volumes (0..1)
  rumble: number
  creaks: number
  exterior: number
  music: number
  oneshot: number
  ui: number

  // Rumble filter
  rumbleLowpass: number

  // Music file
  musicFile: string

  // Exterior ambience files
  exteriorFiles: string[]

  // One-shot file overrides
  doorOpen: string
  doorClose: string
  whistle: string
  brake: string

  // Speed modulation multipliers
  speedMod: {
    stopped: number
    departing: number
    cruising: number
    arriving: number
    tunnel: number
  }
}

export const AUDIO_PRESETS: Record<LineId, AudioPreset> = {
  express: {
    id: 'express',
    label: 'Study Car',
    rumble: 0.3,
    creaks: 0.15,
    exterior: 0.2,
    music: 0.12,
    oneshot: 0.4,
    ui: 0.15,
    rumbleLowpass: 200,
    musicFile: '/audio/train-interior.mp3',
    exteriorFiles: ['/audio/birds.mp3', '/audio/wind-exterior.mp3'],
    doorOpen: '/audio/door-open.mp3',
    doorClose: '/audio/door-close.mp3',
    whistle: '/audio/train-exterior.mp3',
    brake: '/audio/train-rumble.mp3',
    speedMod: { stopped: 0, departing: 0.3, cruising: 1.0, arriving: 0.5, tunnel: 1.3 },
  },
  regional: {
    id: 'regional',
    label: 'Lounge',
    rumble: 0.25,
    creaks: 0.18,
    exterior: 0.25,
    music: 0.14,
    oneshot: 0.4,
    ui: 0.15,
    rumbleLowpass: 180,
    musicFile: '/audio/train-interior.mp3',
    exteriorFiles: ['/audio/birds.mp3', '/audio/wind-exterior.mp3'],
    doorOpen: '/audio/door-open.mp3',
    doorClose: '/audio/door-close.mp3',
    whistle: '/audio/train-exterior.mp3',
    brake: '/audio/train-rumble.mp3',
    speedMod: { stopped: 0, departing: 0.3, cruising: 1.0, arriving: 0.5, tunnel: 1.3 },
  },
  mountain: {
    id: 'mountain',
    label: 'Panoramic Car',
    rumble: 0.35,
    creaks: 0.2,
    exterior: 0.35,
    music: 0.1,
    oneshot: 0.4,
    ui: 0.15,
    rumbleLowpass: 250,
    musicFile: '/audio/train-interior.mp3',
    exteriorFiles: ['/audio/wind-exterior.mp3', '/audio/train-exterior.mp3'],
    doorOpen: '/audio/door-open.mp3',
    doorClose: '/audio/door-close.mp3',
    whistle: '/audio/train-exterior.mp3',
    brake: '/audio/train-rumble.mp3',
    speedMod: { stopped: 0, departing: 0.4, cruising: 1.0, arriving: 0.5, tunnel: 1.5 },
  },
  night: {
    id: 'night',
    label: 'Silent Sleeper',
    rumble: 0.2,
    creaks: 0.12,
    exterior: 0.15,
    music: 0.08,
    oneshot: 0.35,
    ui: 0.1,
    rumbleLowpass: 150,
    musicFile: '/audio/music-ambient.mp3',
    exteriorFiles: ['/audio/wind-exterior.mp3'],
    doorOpen: '/audio/door-open.mp3',
    doorClose: '/audio/door-close.mp3',
    whistle: '/audio/train-exterior.mp3',
    brake: '/audio/train-rumble.mp3',
    speedMod: { stopped: 0, departing: 0.25, cruising: 0.8, arriving: 0.4, tunnel: 1.2 },
  },
  grand: {
    id: 'grand',
    label: 'Library Car',
    rumble: 0.28,
    creaks: 0.16,
    exterior: 0.18,
    music: 0.15,
    oneshot: 0.4,
    ui: 0.15,
    rumbleLowpass: 190,
    musicFile: '/audio/music-ambient.mp3',
    exteriorFiles: ['/audio/birds.mp3', '/audio/wind-exterior.mp3'],
    doorOpen: '/audio/door-open.mp3',
    doorClose: '/audio/door-close.mp3',
    whistle: '/audio/train-exterior.mp3',
    brake: '/audio/train-rumble.mp3',
    speedMod: { stopped: 0, departing: 0.3, cruising: 1.0, arriving: 0.5, tunnel: 1.3 },
  },
}

export function getAudioPreset(lineId: LineId): AudioPreset {
  return AUDIO_PRESETS[lineId] ?? AUDIO_PRESETS.express
}