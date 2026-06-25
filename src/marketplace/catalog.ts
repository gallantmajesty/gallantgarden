// Marketplace item catalog — static definitions shipped with the client.
// Item `id` values are stable foreign keys stored in user inventories.
// NEVER rename or delete an id. Deprecate by setting deprecated:true instead.

import type { CatalogItem } from './types'
import { SLOT_FOR_CATEGORY } from './types'

function item(
  id: string, name: string,
  category: CatalogItem['category'],
  rarity: CatalogItem['rarity'],
  price: number, description: string,
  visualData?: CatalogItem['visualData'],
): CatalogItem {
  return { id, name, category, slot: SLOT_FOR_CATEGORY[category], rarity, price, description,
    thumbnail: `/marketplace/thumbnails/${id}.webp`, visualData }
}

/** IDs granted free at account creation */
export const STARTER_ITEM_IDS: readonly string[] = [
  'tee_white', 'tee_grey', 'hoodie_navy', 'pants_dark', 'shorts_khaki',
  'sneakers_white', 'hair_short_brown', 'hair_twintails_black',
  'prop_pencil', 'backpack_school', 'prop_study_bag',
]

export const CATALOG: CatalogItem[] = [
  // ── Shirts ────────────────────────────────────────────────────────────────
  item('tee_white',   'White T-Shirt',  'shirt','common',  0, 'A clean white tee.',          { hex: '#f0ede8' }),
  item('tee_grey',    'Grey T-Shirt',   'shirt','common',  0, 'Soft heather grey.',           { hex: '#8c8c8c' }),
  item('tee_lavender','Lavender Tee',   'shirt','uncommon',50,'A calm purple hue.',           { hex: '#c4b5fd' }),
  item('tee_sage',    'Sage Tee',       'shirt','uncommon',50,'Nature-inspired sage green.',  { hex: '#86efac' }),
  item('tee_rose',    'Rose Tee',       'shirt','uncommon',50,'Dusty rose for a gentle aesthetic.', { hex: '#fda4af' }),
  // ── Hoodies ───────────────────────────────────────────────────────────────
  item('hoodie_navy',    'Navy Hoodie',    'hoodie','common',  0, 'The classic navy study companion.',     { hex: '#1e3a5f' }),
  item('hoodie_forest',  'Forest Hoodie',  'hoodie','uncommon',80,'Deep woodland green — cosy.',           { hex: '#2d5a27' }),
  item('hoodie_charcoal','Charcoal Hoodie','hoodie','uncommon',80,'Dark charcoal, sleek minimal look.',    { hex: '#374151' }),
  item('hoodie_scholar', 'Scholar Hoodie', 'hoodie','rare',   150,'Deep indigo with gold trim.',          { hex: '#312e81', trim: '#d97706' }),
  // ── Jackets ───────────────────────────────────────────────────────────────
  item('jacket_denim', 'Denim Jacket',  'jacket','uncommon',100,'Worn-in denim — timeless.',     { hex: '#3b6fa0' }),
  item('jacket_bomber','Bomber Jacket', 'jacket','rare',    200,'Sleek varsity bomber.',         { hex: '#111827' }),
  item('jacket_arcane','Arcane Coat',   'jacket','epic',    400,'Flowing coat with arcane sigils.',{ hex: '#1e1b4b', emissive: '#818cf8' }),
  // ── Bottoms ───────────────────────────────────────────────────────────────
  item('pants_dark',  'Dark Pants',    'pants','common',  0,'Clean dark charcoal trousers.',  { hex: '#1f2937' }),
  item('pants_jogger','Jogger Pants',  'pants','uncommon',60,'Comfortable tapered joggers.',   { hex: '#374151' }),
  item('pants_plaid', 'Plaid Trousers','pants','rare',   160,'Smart plaid in forest tones.',   { hex: '#3d5a40', pattern: 'plaid' }),
  item('shorts_khaki','Khaki Shorts',  'shorts','common', 0,'Relaxed khaki shorts.',          { hex: '#a37c5c' }),
  item('shorts_navy', 'Navy Shorts',   'shorts','uncommon',55,'Clean navy shorts.',           { hex: '#1e3a5f' }),
  item('leggings_black','Black Leggings','pants','common',  0,'Sleek full-length leggings.',  { hex: '#2b2d3a' }),
  item('leggings_plum', 'Plum Leggings', 'pants','uncommon',55,'Warm plum-toned leggings.',   { hex: '#5b3a5a' }),
  item('dress_summer','Summer Dress',  'dress','uncommon',90,'Light floral summer dress.',    { hex: '#fde68a', pattern: 'floral' }),
  item('dress_scholar','Scholar Dress','dress','epic',   380,'Elegant dark-navy academic dress.',{ hex: '#1e3a5f' }),
  // ── Shoes ─────────────────────────────────────────────────────────────────
  item('sneakers_white','White Sneakers','shoes','common',  0,'Clean white high-tops.',        { hex: '#f9fafb' }),
  item('sneakers_grey', 'Grey Sneakers', 'shoes','common',  0,'Understated grey.',             { hex: '#6b7280' }),
  item('boots_brown',   'Brown Boots',   'shoes','uncommon',90,'Classic leather in chestnut.', { hex: '#78350f' }),
  item('boots_combat',  'Combat Boots',  'shoes','rare',   160,'Sturdy black combat boots.',   { hex: '#111827' }),
  item('slippers_cozy', 'Cozy Slippers', 'shoes','common',  30,'Warm plush study slippers.',   { hex: '#fcd34d' }),
  item('socks_striped', 'Striped Socks', 'socks','common',  20,'Colourful striped knee-highs.',{ hex: '#e0e7ff', pattern: 'stripe' }),
  item('socks_cat',     'Cat Socks',     'socks','uncommon',45,'Adorable cat-face ankle socks.',{ hex: '#fef3c7' }),
  // ── Hair ──────────────────────────────────────────────────────────────────
  item('hair_short_brown', 'Short Brown Hair',   'hair_short',  'common',  0, 'Clean-cut short brown.',          { style:'short',     colorId:'brown'    }),
  item('hair_short_black', 'Short Black Hair',   'hair_short',  'common',  0, 'Classic short black.',            { style:'short',     colorId:'black'    }),
  item('hair_short_blonde','Short Blonde Hair',  'hair_short',  'common',  50,'Bright blonde short cut.',        { style:'short',     colorId:'blonde'   }),
  item('hair_long_black',  'Long Black Hair',    'hair_long',   'common',  0, 'Flowing long black hair.',        { style:'long',      colorId:'black'    }),
  item('hair_long_brown',  'Long Brown Hair',    'hair_long',   'common',  0, 'Classic long brown.',             { style:'long',      colorId:'brown'    }),
  item('hair_long_auburn', 'Long Auburn Hair',   'hair_long',   'uncommon',70,'Warm auburn flowing hair.',       { style:'long',      colorId:'auburn'   }),
  item('hair_twintails_black','Twin Tails',      'hair_ponytail','common', 0, 'Bouncy twin-tailed ponytails.',   { style:'twintails', colorId:'black'    }),
  item('hair_bun_chestnut','Top Bun',            'hair_ponytail','common', 30,'A neat chestnut top bun.',        { style:'bun',       colorId:'chestnut' }),
  item('hair_curly_auburn','Curly Auburn',       'hair_curly',  'uncommon',80,'Big, bouncy auburn curls.',       { style:'curly',     colorId:'auburn'   }),
  item('hair_curly_violet','Mystic Violet Curls','hair_curly',  'rare',   160,'Voluminous mystic violet curls.', { style:'curly',     colorId:'violet'   }),
  item('hair_fantasy_ombre','Ombre Fantasy',     'hair_fantasy','epic',   350,'Sweeping ombre indigo to teal.',  { style:'long',      gradient:'indigo-teal' }),
  item('hair_fantasy_sakura','Sakura Cascade',   'hair_fantasy','legendary',650,'Cherry pink with shimmer.',     { style:'long',      colorId:'pink', shimmer:true }),
  // ── Glasses ───────────────────────────────────────────────────────────────
  item('glasses_round',   'Round Glasses',   'glasses','common',  40,'Classic round wire-frame.',       { frame:'#c0a060' }),
  item('glasses_square',  'Square Frames',   'glasses','uncommon',70,'Smart square acetate.',           { frame:'#374151' }),
  item('glasses_cat',     'Cat-Eye Glasses', 'glasses','rare',   140,'Stylish retro cat-eye.',          { frame:'#7c3aed' }),
  item('glasses_half_rim','Half-Rim Frames', 'glasses','uncommon',60,'Minimalist half-rim.',            { frame:'#78350f' }),
  // ── Hats / Caps ───────────────────────────────────────────────────────────
  item('cap_beanie_grey','Grey Beanie',  'hat','common',  35,'Warm grey knitted beanie.',       { hex:'#6b7280' }),
  item('hat_beret',      'Beret',        'hat','uncommon',75,'Classic French-style beret.',     { hex:'#7f1d1d' }),
  item('cap_baseball',   'Baseball Cap', 'cap','common',  35,'Clean white baseball cap.',       { hex:'#f9fafb' }),
  item('cap_snapback',   'Snapback',     'cap','uncommon',70,'Black snapback with gold stitch.',{ hex:'#111827', badge:'#d97706' }),
  // ── Headphones ────────────────────────────────────────────────────────────
  item('headphones_over','Over-Ear Headphones','headphones','uncommon', 90,'Large studio headphones.',      { hex:'#111827' }),
  item('headphones_neon','Neon Headphones',    'headphones','rare',    180,'Glowing neon-trim headphones.', { hex:'#0f172a', emissive:'#22d3ee' }),
  item('headphones_cat', 'Cat-Ear Headphones', 'headphones','epic',   320,'Cat-ear headphones, pink glow.',{ hex:'#fdf2f8', emissive:'#f9a8d4' }),
  // ── Other accessories ─────────────────────────────────────────────────────
  item('mask_medical', 'Study Mask',     'mask',   'common',  25,'Simple clean white mask.',     { hex:'#f9fafb' }),
  item('mask_leaf',    'Leaf Mask',      'mask',   'rare',   140,'Delicate leaf-pattern mask.',  { hex:'#4ade80' }),
  item('scarf_plaid',  'Plaid Scarf',    'scarf',  'uncommon',65,'Warm plaid scarf.',            { hex:'#3d5a40', pattern:'plaid' }),
  item('backpack_school','School Backpack','backpack','common',  0,'Reliable school backpack.',  { hex:'#1e3a5f' }),
  item('backpack_study', 'Study Backpack','backpack','uncommon',80,'Organised multi-pocket.',    { hex:'#374151' }),
  item('backpack_arcane','Arcane Tome Bag','backpack','epic',  360,'Glowing rune-etched bag.',   { hex:'#1e1b4b', emissive:'#818cf8' }),
  // ── Special Effects ───────────────────────────────────────────────────────
  item('wings_butterfly','Butterfly Wings',     'wings',             'rare',     220,'Iridescent butterfly wings.',         { preset:'butterfly' }),
  item('wings_angelic',  'Angelic Wings',        'wings',             'epic',     420,'Pure white feathered wings.',         { preset:'angel'     }),
  item('wings_arcane',   'Arcane Wings',         'wings',             'legendary',800,'Ethereal wings of pure light.',        { preset:'arcane', emissive:'#818cf8' }),
  item('aura_focus',     'Focus Aura',           'aura',              'rare',     200,'Soft golden focus glow.',             { color:'#fde68a', radius:1.4 }),
  item('aura_cosmic',    'Cosmic Aura',          'aura',              'epic',     380,'Swirling deep-space aura.',           { color:'#818cf8', radius:1.8 }),
  item('effect_sparkles','Study Sparkles',       'floating_particles','uncommon',  90,'Floating golden sparkles.',           { color:'#fde68a', count:12 }),
  item('effect_fireflies','Fireflies',           'floating_particles','rare',     190,'Gentle glowing fireflies.',           { color:'#bef264', count:8  }),
  item('trail_stardust', 'Stardust Trail',       'magical_trail',     'rare',     210,'Shimmering stardust trail.',          { color:'#e0e7ff' }),
  item('trail_cherry',   'Cherry Blossom Trail', 'magical_trail',     'epic',     400,'Cherry blossoms drift in your wake.',{ color:'#fda4af' }),
  item('glow_warm',      'Warm Glow',            'glow_effect',       'uncommon',  75,'Soft warm body glow.',               { color:'#fef3c7', intensity:0.4 }),
  item('glow_arcane',    'Arcane Glow',          'glow_effect',       'epic',     350,'Pulsing arcane energy field.',       { color:'#818cf8', intensity:0.8 }),
  // ── Study-Themed Props ────────────────────────────────────────────────────
  item('prop_book',      'Floating Tome',       'prop_book',           'uncommon', 70,'An ancient tome that hovers near you.',  { preset:'tome'     }),
  item('prop_pencil',    'Pencil Behind Ear',   'prop_pencil',         'common',    0,'A trusty pencil behind your ear.',       { hex:'#fde68a'     }),
  item('prop_notebook',  'Floating Notebook',   'prop_notebook',       'uncommon', 60,'A small notebook that orbits you.',      { preset:'notebook' }),
  item('prop_grad_cap',  'Graduation Cap',      'prop_graduation_cap', 'rare',    180,'Wear your academic achievement.',        { hex:'#111827'     }),
  item('prop_study_bag', 'Study Bag',           'prop_study_bag',      'common',    0,'A well-worn study bag.',                 { hex:'#374151'     }),
]

const _byId = new Map<string, CatalogItem>(CATALOG.map((c) => [c.id, c]))

export function getCatalogItem(id: string): CatalogItem | undefined { return _byId.get(id) }
export function getCatalogByCategory(cat: CatalogItem['category']): CatalogItem[] { return CATALOG.filter((c) => c.category === cat) }
export function getCatalogBySlot(slot: CatalogItem['slot']): CatalogItem[] { return CATALOG.filter((c) => c.slot === slot) }
