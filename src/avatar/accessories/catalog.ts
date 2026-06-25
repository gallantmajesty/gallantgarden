// The accessory catalog — PURE DATA (the de-facto JSON file). 75 cosmetics across
// 7 categories. Each row names a render kind (render.tsx) + params; adding a
// recolour or shape variant later is a one-line append here with NO code change.
// `id` values are stable foreign keys (stored in inventories/equipped) — never
// rename or delete one; deprecate instead. Palette is intentionally cute, cozy &
// library-themed: warm woods/paper, soft pastels, gold accents, gentle glows.

import {
  SLOT_FOR_ACCESSORY_CATEGORY,
  type AccessoryCategory,
  type AccessoryItem,
  type AccessoryParams,
  type Rarity,
  type RenderKind,
} from './types'

function acc(
  id: string, name: string,
  category: AccessoryCategory, rarity: Rarity, price: number,
  description: string, render: RenderKind, params: AccessoryParams,
): AccessoryItem {
  return { id, name, category, slot: SLOT_FOR_ACCESSORY_CATEGORY[category], rarity, price, description, render, params }
}

export const ACCESSORIES: AccessoryItem[] = [
  // ── Glasses (10) — clear/light lenses ──────────────────────────────────────
  acc('gl_round',  'Round Glasses',       'glasses', 'common',   60,  'Cozy round wire frames.',            'glasses', { shape: 'round',  frame: '#3a3027' }),
  acc('gl_square', 'Square Glasses',      'glasses', 'common',   60,  'Smart square frames.',               'glasses', { shape: 'square', frame: '#2b2b33' }),
  acc('gl_rect',   'Rectangle Glasses',   'glasses', 'common',   60,  'Classic reading rectangles.',        'glasses', { shape: 'rect',   frame: '#46341f' }),
  acc('gl_aviator','Aviator Glasses',     'glasses', 'uncommon', 110, 'Soft gold teardrop frames.',         'glasses', { shape: 'aviator',frame: '#caa24a' }),
  acc('gl_nerd',   'Nerd Glasses',        'glasses', 'uncommon', 100, 'Thick frames with a taped bridge.',  'glasses', { shape: 'nerd',   frame: '#1f2430', tape: true }),
  acc('gl_clear',  'Transparent Glasses', 'glasses', 'uncommon', 120, 'Barely-there crystal frames.',       'glasses', { shape: 'rect',   frame: '#dfe7ef', lensOpacity: 0.12 }),
  acc('gl_gold',   'Gold Frame Glasses',  'glasses', 'rare',     200, 'Polished gold round frames.',        'glasses', { shape: 'round',  frame: '#e8c049' }),
  acc('gl_blue',   'Blue Light Glasses',  'glasses', 'uncommon', 130, 'Late-night study companions.',       'glasses', { shape: 'rect',   frame: '#3a3a44', lensTint: '#bfe3ff', lensOpacity: 0.3 }),
  acc('gl_heart',  'Heart Glasses',       'glasses', 'rare',     220, 'Adorable heart-shaped frames.',      'glasses', { shape: 'heart',  frame: '#ff8fb3' }),
  acc('gl_star',   'Star Glasses',        'glasses', 'epic',     360, 'Twinkly star-shaped frames.',        'glasses', { shape: 'star',   frame: '#ffd36e' }),

  // ── Sunglasses (10) — tinted/opaque lenses ─────────────────────────────────
  acc('sg_black',  'Black Shades',        'sunglasses', 'common',   70,  'Sleek everyday shades.',          'glasses', { shape: 'rect',     frame: '#15151a', lensTint: '#0c0c10', lensOpacity: 0.9 }),
  acc('sg_retro',  'Retro Sunglasses',    'sunglasses', 'uncommon', 120, 'Warm vintage browline.',          'glasses', { shape: 'square',   frame: '#b5462f', lensTint: '#3a2418', lensOpacity: 0.85 }),
  acc('sg_pixel',  'Pixel Sunglasses',    'sunglasses', 'rare',     210, 'Blocky 8-bit cool.',              'glasses', { shape: 'square',   frame: '#111114', lensTint: '#00e0ff', lensOpacity: 0.9, pixel: true }),
  acc('sg_visor',  'Futuristic Visor',    'sunglasses', 'epic',     380, 'One glowing cyber lens.',         'glasses', { shape: 'visor',    frame: '#1b2030', lensTint: '#7df9ff', lensOpacity: 0.8, emissive: '#39d8ff' }),
  acc('sg_rainbow','Rainbow Shades',      'sunglasses', 'epic',     360, 'Lenses that shimmer in colour.',  'glasses', { shape: 'rect',     frame: '#222228', lensTint: '#ff5470', lensOpacity: 0.8, rainbow: true }),
  acc('sg_cateye', 'Cat Eye Sunglasses',  'sunglasses', 'uncommon', 130, 'Retro upswept cat-eye.',          'glasses', { shape: 'cat',      frame: '#2a1830', lensTint: '#1a0f22', lensOpacity: 0.85 }),
  acc('sg_sport',  'Sport Sunglasses',    'sunglasses', 'uncommon', 130, 'Wraparound athletic shades.',     'glasses', { shape: 'visor',    frame: '#16202b', lensTint: '#1c2a36', lensOpacity: 0.85, accent: '#4ad6a0' }),
  acc('sg_reflect','Reflective Shades',   'sunglasses', 'rare',     220, 'Mirror-finish lenses.',           'glasses', { shape: 'aviator',  frame: '#9aa3ad', lensTint: '#bfeaff', lensOpacity: 0.75, reflective: true }),
  acc('sg_luxury', 'Luxury Shades',       'sunglasses', 'legendary',520, 'Gem-set gold luxury.',            'glasses', { shape: 'oversized',frame: '#e8c049', lensTint: '#241a10', lensOpacity: 0.85, gem: true }),
  acc('sg_over',   'Oversized Sunglasses','sunglasses', 'rare',     200, 'Big bold statement frames.',      'glasses', { shape: 'oversized',frame: '#1a1a1a', lensTint: '#15131a', lensOpacity: 0.85 }),

  // ── Hats & Headwear (15) ───────────────────────────────────────────────────
  acc('hat_cap',    'Baseball Cap',  'headwear', 'common',    50,  'Comfy curved-brim cap.',         'hatBrim', { crown: 'cap',    color: '#3a6ea5', accent: '#dfe7ef' }),
  acc('hat_beanie', 'Beanie',        'headwear', 'common',    50,  'Warm knitted beanie.',           'hatSoft', { color: '#9a6a52', cuff: '#7d5340' }),
  acc('hat_bucket', 'Bucket Hat',    'headwear', 'uncommon',  90,  'Casual all-round brim.',         'hatBrim', { crown: 'bucket', color: '#7a8a5a' }),
  acc('hat_fedora', 'Fedora',        'headwear', 'uncommon',  120, 'Dapper felt fedora.',            'hatBrim', { crown: 'fedora', color: '#4a3526', band: '#241a12' }),
  acc('hat_straw',  'Straw Hat',     'headwear', 'uncommon',  100, 'Sunny woven straw.',             'hatBrim', { crown: 'straw',  color: '#e3c479', band: '#c9534b' }),
  acc('hat_wizard', 'Wizard Hat',    'headwear', 'rare',      230, 'Starry scholar of the arcane.',  'pointHat',{ kind: 'wizard',  color: '#5a3a8a', star: '#ffd36e' }),
  acc('hat_crown',  'Crown',         'headwear', 'epic',      420, 'A jewelled silver crown.',       'crown',   { kind: 'points',  metal: '#c9cdd2', gem: '#7aa7ff' }),
  acc('hat_gcrown', 'Golden Crown',  'headwear', 'legendary', 640, 'Regal gold and ruby.',           'crown',   { kind: 'points',  metal: '#e8c049', gem: '#ff5470' }),
  acc('hat_flower', 'Flower Crown',  'headwear', 'rare',      210, 'A ring of soft blossoms.',       'crown',   { kind: 'flowers', petal: '#ff9ec2', leaf: '#7fb98a' }),
  acc('hat_phones', 'Headphones',    'headwear', 'uncommon',  120, 'Over-ear study headphones.',     'headset', { kind: 'headphones', color: '#2b2b33', cup: '#3a3a44' }),
  acc('hat_gaming', 'Gaming Headset','headwear', 'rare',      200, 'Mic + neon glow.',               'headset', { kind: 'gaming',  color: '#15151a', emissive: '#39d8ff' }),
  acc('hat_bunny',  'Bunny Ears',    'headwear', 'uncommon',  110, 'Floppy-soft bunny ears.',        'ears',    { kind: 'bunny',   color: '#f4d9e4', inner: '#ff9ec2' }),
  acc('hat_cat',    'Cat Ears',      'headwear', 'uncommon',  110, 'Perky little cat ears.',         'ears',    { kind: 'cat',     color: '#3a3340', inner: '#ff9ec2' }),
  acc('hat_viking', 'Viking Helmet', 'headwear', 'epic',      380, 'Horned iron helm.',              'pointHat',{ kind: 'viking',  color: '#9aa3ad', horn: '#efe6d2' }),
  acc('hat_pirate', 'Pirate Hat',    'headwear', 'rare',      230, 'Captain of the study seas.',     'hatBrim', { crown: 'pirate', color: '#1a1a1f', accent: '#e8c049' }),

  // ── Face Accessories (10) ──────────────────────────────────────────────────
  acc('face_mustache','Fake Mustache','face', 'common',   40,  'A jaunty curled mustache.',     'facialHair',{ style: 'mustache',  color: '#3a2a1a' }),
  acc('face_beard_s', 'Small Beard',  'face', 'common',   50,  'Neatly trimmed scruff.',        'facialHair',{ style: 'beardShort',color: '#3a2a1a' }),
  acc('face_beard_l', 'Long Beard',   'face', 'uncommon', 90,  'A wise, flowing beard.',        'facialHair',{ style: 'beardLong', color: '#5a4636' }),
  acc('face_goatee',  'Goatee',       'face', 'uncommon', 70,  'A tidy chin goatee.',           'facialHair',{ style: 'goatee',    color: '#2a1f16' }),
  acc('face_mask',    'Face Mask',    'face', 'common',   45,  'Soft cloth face mask.',         'mask',      { style: 'cloth',     color: '#6a8fb5' }),
  acc('face_medical', 'Medical Mask', 'face', 'common',   40,  'Clean pleated medical mask.',   'mask',      { style: 'medical',   color: '#eef4f7' }),
  acc('face_bandana', 'Bandana Mask', 'face', 'uncommon', 80,  'Outlaw-style bandana.',         'mask',      { style: 'bandana',   color: '#b5462f', pattern: true }),
  acc('face_nose',    'Clown Nose',   'face', 'uncommon', 70,  'A big round red nose.',         'faceSmall', { kind: 'nose',       color: '#ff4d4d' }),
  acc('face_mark',    'Beauty Mark',  'face', 'common',   30,  'A delicate beauty mark.',       'faceSmall', { kind: 'mark',       color: '#3a2418' }),
  acc('face_patch',   'Eye Patch',    'face', 'rare',     160, 'A mysterious eye patch.',       'faceSmall', { kind: 'eyepatch',   color: '#1a1a1f' }),

  // ── Neck Accessories (10) ──────────────────────────────────────────────────
  acc('neck_scarf_red','Red Scarf',          'neck', 'common',    50,  'A snug red scarf.',           'neckwear', { style: 'scarf',    color: '#c5402f' }),
  acc('neck_scarf_win','Winter Scarf',       'neck', 'uncommon',  90,  'Chunky knit winter scarf.',   'neckwear', { style: 'scarf',    color: '#5a7da0', knit: true }),
  acc('neck_chain_g',  'Gold Chain',         'neck', 'rare',      210, 'A shiny gold chain.',         'neckwear', { style: 'chain',    color: '#e8c049' }),
  acc('neck_chain_s',  'Silver Chain',       'neck', 'uncommon',  110, 'A sleek silver chain.',       'neckwear', { style: 'chain',    color: '#cdd2d8' }),
  acc('neck_bowtie',   'Bow Tie',            'neck', 'common',    50,  'A charming little bow tie.',  'neckwear', { style: 'bowtie',   color: '#7c3aed' }),
  acc('neck_tie',      'Neck Tie',           'neck', 'common',    50,  'A smart academic tie.',       'neckwear', { style: 'tie',      color: '#324a6e' }),
  acc('neck_pearls',   'Pearl Necklace',     'neck', 'rare',      220, 'A string of soft pearls.',    'neckwear', { style: 'pearls',   color: '#f3ecdf' }),
  acc('neck_emerald',  'Emerald Necklace',   'neck', 'legendary', 560, 'A glowing emerald pendant.',  'neckwear', { style: 'gem',      color: '#e8c049', gem: '#36c98a' }),
  acc('neck_band',     'Headphone Neckband', 'neck', 'uncommon',  110, 'Headphones resting at rest.', 'neckwear', { style: 'neckband', color: '#2b2b33' }),
  acc('neck_lanyard',  'VIP Lanyard',        'neck', 'uncommon',  90,  'An all-access study pass.',   'neckwear', { style: 'lanyard',  color: '#c5402f', card: '#e8c049' }),

  // ── Back Accessories (10) ──────────────────────────────────────────────────
  acc('back_angel',   'Angel Wings',    'back', 'epic',      440, 'Soft feathered wings.',          'wings',   { preset: 'angel',     color: '#fbfbf6' }),
  acc('back_demon',   'Demon Wings',    'back', 'epic',      440, 'Leathery shadow wings.',         'wings',   { preset: 'demon',     color: '#3a1320', membrane: '#7a1e34' }),
  acc('back_fly',     'Butterfly Wings','back', 'rare',      240, 'Iridescent butterfly wings.',    'wings',   { preset: 'butterfly', color: '#8ab4ff', accent: '#ff9ec2' }),
  acc('back_cape_s',  'Small Cape',     'back', 'uncommon',  100, 'A short hero cape.',             'cape',    { color: '#5a7da0' }),
  acc('back_cape_r',  'Royal Cape',     'back', 'legendary', 600, 'Fur-trimmed royal cape.',        'cape',    { color: '#7c1d2a', trim: '#e8c049', fur: true }),
  acc('back_pack',    'Backpack',       'back', 'common',    60,  'A trusty backpack.',             'bag',     { kind: 'backpack',    color: '#3a6ea5' }),
  acc('back_school',  'School Bag',     'back', 'common',    60,  'A classic school satchel.',      'bag',     { kind: 'school',      color: '#9a6a52' }),
  acc('back_jetpack', 'Jetpack',        'back', 'epic',      400, 'Zip between study sessions.',     'backProp',{ kind: 'jetpack',     color: '#9aa3ad', flame: '#ff8a3a' }),
  acc('back_books',   'Floating Books', 'back', 'mythic',    900, 'Tomes that orbit you, gently.',  'backProp',{ kind: 'books',       color: '#6a4f8a', emissive: '#b6a8ff' }),
  acc('back_aura',    'Magic Aura',     'back', 'mythic',    950, 'A radiant ring of study magic.', 'backProp',{ kind: 'aura',        color: '#9a8cff', emissive: '#b6a8ff' }),

  // ── Handheld Items (10) — held in the right hand, in front of the body ──────
  acc('hand_book',   'Book',        'handheld', 'common',   40,  'A well-loved hardcover.',        'handheld', { kind: 'book',   color: '#6a4f8a' }),
  acc('hand_coffee', 'Coffee Cup',  'handheld', 'common',   40,  'Warm focus fuel.',               'handheld', { kind: 'coffee', color: '#e8e2d6', sleeve: '#9a6a52' }),
  acc('hand_pencil', 'Pencil',      'handheld', 'common',   30,  'A trusty yellow pencil.',        'handheld', { kind: 'pencil', color: '#e8c049' }),
  acc('hand_laptop', 'Laptop',      'handheld', 'uncommon', 110, 'Lightweight study laptop.',      'handheld', { kind: 'laptop', color: '#9aa3ad', screen: '#7df9ff' }),
  acc('hand_wand',   'Magic Wand',  'handheld', 'rare',     220, 'A star-tipped wand.',            'handheld', { kind: 'wand',   color: '#3a2a4a', star: '#ffd36e' }),
  acc('hand_lantern','Lantern',     'handheld', 'uncommon', 120, 'A warm guiding lantern.',        'handheld', { kind: 'lantern',color: '#caa24a', glow: '#ffcf6e' }),
  acc('hand_rose',   'Rose',        'handheld', 'uncommon', 90,  'A single red rose.',             'handheld', { kind: 'rose',   color: '#c5402f', stem: '#3f7d52' }),
  acc('hand_camera', 'Camera',      'handheld', 'uncommon', 120, 'Capture cozy moments.',          'handheld', { kind: 'camera', color: '#2b2b33', lens: '#7aa7ff' }),
  acc('hand_tablet', 'Tablet',      'handheld', 'uncommon', 110, 'Notes at your fingertips.',      'handheld', { kind: 'tablet', color: '#1b1b22', screen: '#bfe3ff' }),
  acc('hand_notes',  'Study Notes', 'handheld', 'common',   40,  'A flurry of revision notes.',    'handheld', { kind: 'notes',  color: '#f3ecdf', ink: '#324a6e' }),
]

const _byId = new Map<string, AccessoryItem>(ACCESSORIES.map((a) => [a.id, a]))

export function getAccessory(id: string | null | undefined): AccessoryItem | undefined {
  return id ? _byId.get(id) : undefined
}
export function hasAccessory(id: string): boolean {
  return _byId.has(id)
}
export function accessoriesByCategory(category: AccessoryCategory): AccessoryItem[] {
  return ACCESSORIES.filter((a) => a.category === category)
}
