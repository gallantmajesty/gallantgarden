// TypeScript mirrors of the InsForge schema (see migrations/).

export interface Tree {
  id: string
  owner_id: string
  title: string
  world: string
  pos_x: number
  pos_y: number
  pos_z: number
  variant: number
  crystal_color: string
  created_at: string
  updated_at: string
}

// Maps a tree's `variant` to a species, GLB model file, and palette.
export interface TreeSpecies {
  key: string
  name: string
  model: string // file under /public/models/, e.g. 'maple.glb'
  crystal: string // default crystal color
  scale: number // uniform scale to bring the model to ~5 world units tall
  yOffset: number // vertical nudge so the base sits on the ground
}

// Scales tuned to each model's native bounding box (maple ~51u, palm ~16u tall).
export const TREE_SPECIES: TreeSpecies[] = [
  { key: 'maple', name: 'Maple', model: 'maple.glb', crystal: '#ff6f91', scale: 0.1, yOffset: 0 },
  { key: 'palm', name: 'Date Palm', model: 'palm.glb', crystal: '#ffba49', scale: 0.33, yOffset: 0 },
  { key: 'maple2', name: 'Red Maple', model: 'maple.glb', crystal: '#8a6cff', scale: 0.12, yOffset: 0 },
  { key: 'palm2', name: 'Oasis Palm', model: 'palm.glb', crystal: '#4fd1c5', scale: 0.28, yOffset: 0 },
]

export function speciesFor(variant: number): TreeSpecies {
  return TREE_SPECIES[variant % TREE_SPECIES.length]
}

export type BgStyle = 'solid' | 'gradient' | 'design'

export interface StickyNote {
  id: string
  tree_id: string
  owner_id: string
  content_html: string
  content_text: string
  color: string
  bg_style: BgStyle
  bg_value: string
  font_family: string
  font_size: number
  font_color: string
  width: number
  anchor_id: number
  image_url: string | null
  pos_x: number
  pos_y: number
  pos_z: number
  rotation: number
  is_flashcard: boolean
  flashcard_back: string
  created_at: string
  updated_at: string
}

export interface AvatarConfig {
  head?: string
  hair?: string
  hairColor?: string
  skin?: string
  bodySize?: 'small' | 'medium' | 'large'
  outfitColor?: string
}

export interface Profile {
  id: string
  display_name: string
  avatar: AvatarConfig
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Hard limits from the product spec.
export const MAX_TREES = 20
export const MAX_NOTES_PER_TREE = 1000
