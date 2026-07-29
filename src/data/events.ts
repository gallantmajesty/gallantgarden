// ============================================================
// Event Shop — Static type definitions
// ============================================================

export type ItemType = "accessory" | "bundle" | "companion" | "clock_skin" | "frame" | "title";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export interface EventItem {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: ItemRarity
  price: number
  icon: string
  effect?: string
}

export interface FocusEvent {
  id: string
  name: string
  description: string
  icon: string
  startDate?: string
  endDate?: string
  items: EventItem[]
  active: boolean
  createdAt: string
}

export interface OwnedItem {
  rewardId: string
  eventId: string
  itemId: string
  name: string
  type: ItemType
  rarity: ItemRarity
  icon: string
  earnedAt: number
  equipped: boolean
}

export interface PurchaseRecord {
  userId: string
  eventItemId: string
  purchasedAt: number
}

export const DEFAULT_EVENTS: FocusEvent[] = [
  {
    id: "spring-festival-2025",
    name: "Spring Festival",
    description: "Celebrate the season with limited cosmetics!",
    icon: "🌸",
    active: true,
    createdAt: "2025-03-01T00:00:00Z",
    items: [
      { id: "sf-1", name: "Cherry Blossom Crown", description: "Pink blossoms for your avatar", type: "accessory", rarity: "rare", price: 200, icon: "👑" },
      { id: "sf-2", name: "Spring Petals Frame", description: "Frame for your profile", type: "frame", rarity: "epic", price: 350, icon: "🖼️" },
      { id: "sf-3", name: "Sakura Watch", description: "Pink clock skin for Focus Domain", type: "clock_skin", rarity: "rare", price: 250, icon: "⌚" },
      { id: "sf-4", name: "Study Bunny", description: "Cute companion pet", type: "companion", rarity: "legendary", price: 500, icon: "🐰" },
      { id: "sf-5", name: "Spring Scholar Bundle", description: "All Spring cosmetics in one pack", type: "bundle", rarity: "legendary", price: 800, icon: "🎁" },
    ],
  },
  {
    id: "midnight-grimoire",
    name: "Midnight Grimoire",
    description: "Dark arts study theme — powerful visuals",
    icon: "🌙",
    active: false,
    createdAt: "2025-02-01T00:00:00Z",
    items: [
      { id: "mg-1", name: "Starfall Wreath", description: "Dark halo accessory", type: "accessory", rarity: "epic", price: 400, icon: "🌑" },
      { id: "mg-2", name: "Void Clock", description: "Black & gold clock theme", type: "clock_skin", rarity: "legendary", price: 600, icon: "🕰️" },
      { id: "mg-3", name: "Grimoire Title", description: '"Arcanist" title badge', type: "title", rarity: "rare", price: 150, icon: "📜" },
    ],
  },
];

export const RARITY_CONFIG: Record<ItemRarity, { color: string; bg: string; label: string }> = {
  common: { color: "#8B6D2E", bg: "rgba(139,109,46,0.1)", label: "Common" },
  rare: { color: "#4A90D9", bg: "rgba(74,144,217,0.1)", label: "Rare" },
  epic: { color: "#A855F7", bg: "rgba(168,85,247,0.1)", label: "Epic" },
  legendary: { color: "#C9A84C", bg: "rgba(201,168,76,0.2)", label: "Legendary" },
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  accessory: "Accessory",
  bundle: "Bundle",
  companion: "Companion",
  clock_skin: "Clock Skin",
  frame: "Frame",
  title: "Title",
};
