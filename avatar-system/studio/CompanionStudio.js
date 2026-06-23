// CompanionStudio.js — the "personal study companion customization experience".
// Composes the cozy Room + the live Avatar + a Roblox-style customization panel
// (category tabs, item grids with rarity, live colour swatches, recently
// equipped), an emote bar, day/night, and quick actions. Everything updates the
// preview INSTANTLY — no save step required; Save just persists to storage.

import { Avatar } from '../core/Avatar.js'
import { Room } from '../scene/Room.js'
import { confettiBurst } from '../scene/Particles.js'
import { EMOTES } from '../animation/clips.js'
import { itemsForSlot, getItem } from '../data/catalog.js'
import { PALETTES, SKIN, HAIR, CLOTH, FEATURE, hexOf } from '../data/palettes.js'

const STORE_KEY = 'focuslily.companion'

const RARITY = {
  common: { label: 'Common', color: '#9aa0ad' },
  uncommon: { label: 'Uncommon', color: '#5ec06a' },
  rare: { label: 'Rare', color: '#4aa3e6' },
  epic: { label: 'Epic', color: '#b06de0' },
  legendary: { label: 'Legendary', color: '#f0a93a' },
  mythic: { label: 'Mythic', color: '#ff6f91' },
}

// Each tab: what items it shows, which slots it writes, and its colour palette.
const CATEGORIES = [
  { id: 'body', label: 'Body', icon: '🧍', kind: 'color', palette: SKIN },
  { id: 'hair', label: 'Hair', icon: '💇', sources: ['hairFront', 'hairBack'], write: ['hairFront', 'hairBack'], palette: HAIR, tintSlots: ['hairFront', 'hairBack'], colorLabel: 'Hair Color' },
  { id: 'eyes', label: 'Eyes', icon: '👁️', sources: ['eyes'], write: ['eyes'], palette: FEATURE, tintSlots: ['eyes'], colorLabel: 'Eye Color' },
  { id: 'face', label: 'Face', icon: '😊', sources: ['face'], write: ['face'], palette: null },
  { id: 'top', label: 'Top', icon: '👕', sources: ['torso'], write: ['torso', 'leftArm', 'rightArm'], palette: CLOTH, tintSlots: ['torso', 'leftArm', 'rightArm'], colorLabel: 'Top Color', linkSleeve: true },
  { id: 'bottom', label: 'Bottom', icon: '👖', sources: ['leftLeg'], write: ['leftLeg', 'rightLeg'], palette: CLOTH, tintSlots: ['leftLeg', 'rightLeg'], colorLabel: 'Bottom Color', mirror: { leftLeg: 'rightLeg' } },
  { id: 'shoes', label: 'Shoes', icon: '👟', sources: ['leftShoe'], write: ['leftShoe', 'rightShoe'], palette: CLOTH, tintSlots: ['leftShoe', 'rightShoe'], colorLabel: 'Shoe Color', mirror: { leftShoe: 'rightShoe' } },
  { id: 'accessories', label: 'Accessories', icon: '🎀', sources: ['accessories'], write: ['accessories'], palette: CLOTH, tintSlots: ['accessories'], colorLabel: 'Colour' },
  { id: 'back', label: 'Back', icon: '🪽', sources: ['backItem'], write: ['backItem'], palette: CLOTH, tintSlots: ['backItem'], colorLabel: 'Colour' },
]

const NAV = ['Home', 'Quests', 'Garden', 'Shop', 'Friends']
const RAIL = [['Profile', '👤'], ['Inventory', '🎒'], ['Achievements', '🏆'], ['Calendar', '📅']]

function el(tag, cls, parent, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  if (parent) parent.appendChild(n)
  return n
}

export class CompanionStudio {
  constructor(mount) {
    this.activeCat = 'hair'
    this.recent = []

    this.root = el('div', 'studio', mount)
    this._buildTopbar()
    this._buildStageColumn()
    this._buildPanel()

    // Room + Avatar
    this.room = new Room()
    this.sceneWrap.insertBefore(this.room.el, this.sceneWrap.firstChild)

    const saved = this._load()
    this.avatar = new Avatar({ parent: this.avatarStage, scale: 1.04, config: saved || undefined })
    this.avatar.start()

    this._renderTabs()
    this._renderCategory()
    this._renderRecent()
  }

  /* --------------------------------------------------------------- topbar */
  _buildTopbar() {
    const bar = el('div', 'topbar', this.root)
    const brand = el('div', 'brand', bar)
    el('span', 'brand-mark', brand, '✿')
    el('span', 'brand-name', brand, 'Focus Lily')

    const nav = el('nav', 'topnav', bar)
    NAV.forEach((n, i) => {
      const b = el('button', 'navbtn' + (i === 0 ? ' is-active' : ''), nav, n)
      b.onclick = () => { nav.querySelectorAll('.navbtn').forEach((x) => x.classList.remove('is-active')); b.classList.add('is-active') }
    })

    const wallet = el('div', 'wallet', bar)
    const coins = el('div', 'coin', wallet); el('span', 'coin-ico', coins, '🪙'); el('span', null, coins, '12,450')
    const gems = el('div', 'gem', wallet); el('span', 'coin-ico', gems, '💎'); el('span', null, gems, '320')
    el('button', 'icon-btn', bar, '⚙️')
  }

  /* ----------------------------------------------------------- stage (left) */
  _buildStageColumn() {
    const col = el('div', 'stage-col', this.root)
    const wrap = el('div', 'scene-wrap', col)
    this.sceneWrap = wrap
    this.avatarStage = el('div', 'avatar-stage', wrap)

    // left vertical rail
    const rail = el('div', 'stage-rail', wrap)
    RAIL.forEach(([name, ico]) => {
      const b = el('button', 'rail-btn', rail, '')
      el('span', 'rail-ico', b, ico)
      el('span', 'rail-label', b, name)
    })

    // day / night
    const dn = el('div', 'daynight', wrap)
    const day = el('button', 'dn-btn is-active', dn, '☀ Day')
    const night = el('button', 'dn-btn', dn, '☾ Night')
    day.onclick = () => { this.room.setTimeOfDay('day'); wrap.classList.remove('is-night'); day.classList.add('is-active'); night.classList.remove('is-active') }
    night.onclick = () => { this.room.setTimeOfDay('night'); wrap.classList.add('is-night'); night.classList.add('is-active'); day.classList.remove('is-active') }

    // emote bar
    const eb = el('div', 'emote-bar', wrap)
    el('div', 'emote-title', eb, 'Emotes')
    const row = el('div', 'emote-row', eb)
    EMOTES.forEach((e, i) => {
      const b = el('button', 'emote-btn' + (i === 0 ? ' is-active' : ''), row)
      el('span', 'emote-ico', b, e.icon)
      el('span', 'emote-name', b, e.name)
      b.onclick = () => {
        row.querySelectorAll('.emote-btn').forEach((x) => x.classList.remove('is-active'))
        b.classList.add('is-active')
        this._emote(e.id)
      }
    })
  }

  _emote(id) {
    if (id === 'idle') { this.avatar.animator.play('idle', { fade: 0.25 }); return }
    this.avatar.emote(id)
    if (id === 'celebrate') confettiBurst(this.room.fxLayer)
  }

  /* ----------------------------------------------------------- panel (right) */
  _buildPanel() {
    const col = el('div', 'panel-col', this.root)

    const head = el('div', 'panel-head', col)
    const ht = el('div', 'panel-title', head)
    el('span', null, ht, 'Customize Your Companion')
    const ha = el('div', 'panel-head-actions', head)
    el('button', 'ghost-btn', ha, '🎒 My Items')
    const saveTop = el('button', 'primary-btn sm', ha, 'Save Outfit')
    saveTop.onclick = () => this._save()

    this.tabsEl = el('div', 'cat-tabs', col)
    this.bodyEl = el('div', 'panel-body', col)

    // recently equipped
    const rec = el('div', 'recent', col)
    el('div', 'recent-title', rec, 'Recently Equipped')
    this.recentRow = el('div', 'recent-row', rec)

    // footer quick actions
    const foot = el('div', 'panel-foot', col)
    const rnd = el('button', 'ghost-btn', foot, '🎲 Randomize'); rnd.onclick = () => this._randomize()
    const rst = el('button', 'ghost-btn', foot, '↺ Reset'); rst.onclick = () => this._reset()
    const save = el('button', 'primary-btn grow', foot, '💾 Save Companion'); save.onclick = () => this._save()
  }

  _renderTabs() {
    this.tabsEl.replaceChildren()
    for (const cat of CATEGORIES) {
      const b = el('button', 'cat-tab' + (cat.id === this.activeCat ? ' is-active' : ''), this.tabsEl)
      el('span', 'cat-ico', b, cat.icon)
      el('span', 'cat-label', b, cat.label)
      b.onclick = () => { this.activeCat = cat.id; this._renderTabs(); this._renderCategory() }
    }
  }

  _cat() { return CATEGORIES.find((c) => c.id === this.activeCat) }

  _renderCategory() {
    const cat = this._cat()
    this.bodyEl.replaceChildren()

    if (cat.kind === 'color') {
      el('div', 'section-label', this.bodyEl, 'Skin Tone')
      this.bodyEl.appendChild(this._swatchRow(cat.palette, () => this.avatar.config.skin, (id) => this.avatar.setSkin(id)))
      return
    }

    // item grid
    el('div', 'section-label', this.bodyEl, cat.label)
    const grid = el('div', 'item-grid', this.bodyEl)
    grid.appendChild(this._noneTile(cat))
    const items = cat.sources.flatMap((s) => itemsForSlot(s))
    for (const item of items) grid.appendChild(this._itemTile(cat, item))

    // colour row
    if (cat.palette && cat.tintSlots) {
      el('div', 'section-label', this.bodyEl, cat.colorLabel || 'Colour')
      this.bodyEl.appendChild(this._swatchRow(
        cat.palette,
        () => this.avatar.config.tints[cat.tintSlots[0]],
        (id) => this._setColor(cat, id),
      ))
    }
  }

  _itemTile(cat, item) {
    const equipped = this.avatar.config.equipped[item.slot] === item.id
    const tile = el('button', 'item-tile' + (equipped ? ' is-on' : ''), null)
    tile.dataset.slot = item.slot
    tile.dataset.item = item.id
    const r = RARITY[item.rarity] || RARITY.common
    tile.style.setProperty('--rarity', r.color)

    const emblem = el('div', 'item-emblem', tile)
    emblem.style.background = this._itemColor(cat, item)
    if (item.glow) emblem.classList.add('glows')
    el('div', 'item-name', tile, item.name)
    const rar = el('div', 'item-rarity', tile)
    el('span', 'rarity-dot', rar)
    el('span', null, rar, r.label)
    if (item.limited) el('span', 'limited-badge', tile, 'LIMITED')

    tile.onclick = () => this._equip(cat, item)
    return tile
  }

  _noneTile(cat) {
    const isNone = cat.write.every((s) => this.avatar.config.equipped[s] === 'none')
    const tile = el('button', 'item-tile none-tile' + (isNone ? ' is-on' : ''), null)
    el('div', 'item-emblem none', tile, '∅')
    el('div', 'item-name', tile, 'None')
    tile.onclick = () => { cat.write.forEach((s) => this.avatar.equip(s, 'none')); this._afterChange() }
    return tile
  }

  _itemColor(cat, item) {
    if (item.tint) {
      const sw = this.avatar.config.tints[item.slot] || item.defaultTint
      const hex = hexOf(sw)
      return `linear-gradient(145deg, ${hex}, ${hex}aa)`
    }
    // PNG-pack items carry `layers`, not `art`; guard so the swatch still draws.
    const fill = ((item.art || []).find((a) => a.fill) || {}).fill || '#c9c3d6'
    return `linear-gradient(145deg, ${fill}, ${fill})`
  }

  /* --------------------------------------------------------------- actions */
  _equip(cat, item) {
    const slot = item.slot
    this.avatar.equip(slot, item.id)
    if (cat.mirror && cat.mirror[slot]) this.avatar.equip(cat.mirror[slot], item.id)
    if (cat.linkSleeve && item.sleeve) {
      const tint = this.avatar.config.tints.torso
      this.avatar.equip('leftArm', item.sleeve).equip('rightArm', item.sleeve)
      this.avatar.setTint('leftArm', tint).setTint('rightArm', tint)
    }
    this._pushRecent(item.id)
    this._afterChange()
  }

  _setColor(cat, swatchId) {
    for (const s of cat.tintSlots) this.avatar.setTint(s, swatchId)
    this._afterChange()
  }

  _afterChange() {
    this._renderCategory()
    this._renderRecent()
  }

  _swatchRow(palette, current, onPick) {
    const row = el('div', 'swatch-row', null)
    for (const sw of palette) {
      const b = el('button', 'swatch' + (sw.id === current() ? ' is-on' : ''), row)
      b.style.background = sw.hex
      b.title = sw.name
      b.onclick = () => { onPick(sw.id); row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on') }
    }
    el('button', 'swatch swatch-add', row, '+')
    return row
  }

  _pushRecent(id) {
    this.recent = [id, ...this.recent.filter((x) => x !== id)].slice(0, 6)
  }

  _renderRecent() {
    this.recentRow.replaceChildren()
    const ids = this.recent.length ? this.recent : this._currentlyWorn().slice(0, 6)
    for (const id of ids) {
      const item = getItem(id)
      if (!item) continue
      const r = RARITY[item.rarity] || RARITY.common
      const card = el('div', 'recent-card', this.recentRow)
      card.style.setProperty('--rarity', r.color)
      const emb = el('div', 'recent-emblem', card)
      emb.style.background = this._itemColor({}, item)
      el('div', 'recent-name', card, item.name)
      el('div', 'recent-rarity', card, r.label)
    }
  }

  _currentlyWorn() {
    const eq = this.avatar.config.equipped
    return ['hairFront', 'torso', 'leftLeg', 'face', 'backItem', 'accessories', 'eyes']
      .map((s) => eq[s]).filter((id) => id && id !== 'none')
  }

  _randomize() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    this.avatar.setSkin(pick(SKIN).id)
    for (const cat of CATEGORIES) {
      if (cat.kind === 'color') continue
      const items = cat.sources.flatMap((s) => itemsForSlot(s))
      // ~15% chance of None for optional layers
      const optional = ['face', 'accessories', 'back', 'hair'].includes(cat.id)
      if (optional && Math.random() < 0.15) { cat.write.forEach((s) => this.avatar.equip(s, 'none')); continue }
      const item = pick(items)
      if (item) this._equip(cat, item)
      if (cat.palette && cat.tintSlots) this._setColor(cat, pick(cat.palette).id)
    }
    this._afterChange()
  }

  _reset() {
    this.avatar.setConfig(undefined)         // -> default config
    this.recent = []
    this._afterChange()
  }

  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.avatar.serialize()))
      this._toast('Companion saved ✓')
    } catch { this._toast('Could not save') }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  _toast(msg) {
    const t = el('div', 'toast', this.root, msg)
    setTimeout(() => t.classList.add('show'), 10)
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 1800)
  }
}
