import { useState, useEffect, useCallback } from "react";
import type { FocusEvent, EventItem, OwnedItem } from "../../data/events";
import { DEFAULT_EVENTS } from "../../data/events";

// ---- localStorage keys ----
const EVENTS_KEY = "sg.events.all";
const PURCHASES_KEY = "sg.events.purchases"; // "eventId:itemId" → true
const WALLET_KEY = "sg.wallet.balance";

// ---- helpers ----
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

// ---- active event resolver ----
export function getActiveEvent(events: FocusEvent[]): FocusEvent | null {
  const now = new Date();
  return (
    events.find((e) => {
      if (!e.active) return false;
      if (e.startDate && new Date(e.startDate) > now) return false;
      if (e.endDate && new Date(e.endDate) < now) return false;
      return true;
    }) || null
  );
}

// ============================================================
// Hook: useEventShop
// ============================================================
export function useEventShop() {
  const [events, setEvents] = useState<FocusEvent[]>(() =>
    loadJSON(EVENTS_KEY, DEFAULT_EVENTS),
  );
  const [purchases, setPurchases] = useState<Record<string, boolean>>(() =>
    loadJSON(PURCHASES_KEY, {}),
  );
  const [balance, setBalance] = useState<number>(() =>
    loadNum(WALLET_KEY),
  );

  // Persist on change
  useEffect(() => { saveJSON(EVENTS_KEY, events); }, [events]);
  useEffect(() => { saveJSON(PURCHASES_KEY, purchases); }, [purchases]);
  useEffect(() => { saveJSON(WALLET_KEY, balance); }, [balance]);

  const activeEvent = getActiveEvent(events);

  const hasPurchased = useCallback(
    (eventId: string, itemId: string) => {
      return purchases[`${eventId}:${itemId}`] === true;
    },
    [purchases],
  );

  const buyItem = useCallback(
    (event: FocusEvent, item: EventItem): { ok: boolean; error?: string } => {
      const key = `${event.id}:${item.id}`;
      if (purchases[key]) return { ok: false, error: "Already owned" };
      if (balance < item.price) return { ok: false, error: "Not enough leaves" };

      const newBalance = balance - item.price;
      setBalance(newBalance);
      saveNum(WALLET_KEY, newBalance);

      const newPurchases = { ...purchases, [key]: true };
      setPurchases(newPurchases);
      saveJSON(PURCHASES_KEY, newPurchases);

      // Add to inventory
      const inventoryKey = "sg.inventory.items";
      const inv = loadJSON<OwnedItem[]>(inventoryKey, []);
      const owned: OwnedItem = {
        rewardId: key,
        eventId: event.id,
        itemId: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        earnedAt: Date.now(),
        equipped: false,
      };
      saveJSON(inventoryKey, [...inv, owned]);

      return { ok: true };
    },
    [events, purchases, balance],
  );

  // Owner: create / update events
  const saveEvent = useCallback(
    (event: FocusEvent) => {
      setEvents((prev) => {
        const idx = prev.findIndex((e) => e.id === event.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = event;
          return next;
        }
        return [...prev, event];
      });
    },
    [],
  );

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const toggleEventActive = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, active: !e.active } : e,
      ),
    );
  }, []);

  const addLeaves = useCallback(
    (amount: number) => {
      const newBalance = balance + amount;
      setBalance(newBalance);
      saveNum(WALLET_KEY, newBalance);
    },
    [balance],
  );

  return {
    events,
    activeEvent,
    purchases,
    balance,
    hasPurchased,
    buyItem,
    saveEvent,
    deleteEvent,
    toggleEventActive,
    addLeaves,
  };
}

// ============================================================
// Hook: useInventory
// ============================================================
export function useInventory() {
  const [items, setItems] = useState<OwnedItem[]>(() =>
    loadJSON<OwnedItem[]>("sg.inventory.items", []),
  );

  useEffect(() => { saveJSON("sg.inventory.items", items); }, [items]);

  const equipped = items.filter((i) => i.equipped);
  const unequipped = items.filter((i) => !i.equipped);

  const equip = useCallback((rewardId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.rewardId === rewardId ? { ...i, equipped: true } : i)),
    );
  }, []);

  const unequip = useCallback((rewardId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.rewardId === rewardId ? { ...i, equipped: false } : i)),
    );
  }, []);

  const unequipAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, equipped: false })));
  }, []);

  return { items, equipped, unequipped, equip, unequip, unequipAll };
}
