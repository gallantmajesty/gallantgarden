import { useState, useCallback, useEffect, useMemo } from "react";
import { useMagnet } from "../../store/magnet";
import type { LockerTask } from "./types";

/* ============================================================
 *  LOCKER TASKS — backed by the Task Magnet
 *  The Focus Domain's task dock and the Task Magnet (/magnet)
 *  now share ONE task list: adding, removing, or toggling from
 *  either side is reflected in both, and the magnet's cloud sync
 *  keeps them in step across devices. The old standalone locker
 *  storage is imported once so nobody loses existing tasks.
 * ============================================================ */

const LEGACY_STORAGE_KEY = "sg.focus.locker";
const MIGRATED_FLAG = "sg.focus.locker.migrated.v1";

interface LegacySub {
  id: string;
  title: string;
  completed: boolean;
  children?: LegacySub[];
}
interface LegacyTask {
  id: string;
  title: string;
  description: string;
  subtasks?: LegacySub[];
}

/** Flatten the old cherry-tree subtasks (nested children) into the magnet's
 *  flat one-level subtask list. */
function flattenLegacySubs(subs: LegacySub[]): { id: string; title: string; done: boolean }[] {
  const out: { id: string; title: string; done: boolean }[] = [];
  const walk = (list: LegacySub[]) => {
    for (const s of list ?? []) {
      out.push({ id: s.id, title: s.title, done: !!s.completed });
      walk(s.children ?? []);
    }
  };
  walk(subs);
  return out;
}

/** One-time import of the old standalone locker list into the Task Magnet.
 *  Guarded by a flag so it can never re-run or duplicate. Best-effort. */
function migrateLegacyLocker() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    localStorage.setItem(MIGRATED_FLAG, "1");
    const m = useMagnet.getState();
    if (!m.ready || !m.userId) return;
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    const legacy = JSON.parse(raw) as LegacyTask[];
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const existing = new Set(m.data.tasks.map((t) => `${t.title}::${t.notes}`));
    for (const t of legacy) {
      if (!t?.title?.trim()) continue;
      if (existing.has(`${t.title}::${t.description ?? ""}`)) continue;
      m.addTask({
        title: t.title.trim(),
        notes: t.description ?? "",
        subtasks: flattenLegacySubs(t.subtasks ?? []),
      });
    }
  } catch {
    /* best-effort — a failed import never blocks the dock */
  }
}

export function useLockerTask() {
  const ready = useMagnet((s) => s.ready);
  const magnetTasks = useMagnet((s) => s.data.tasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (ready) migrateLegacyLocker();
  }, [ready]);

  // Map the magnet's Task list to the dock's LockerTask shape. Only OPEN work
  // is shown — completed tasks live in the Task Magnet's list (done state).
  const tasks = useMemo<LockerTask[]>(
    () =>
      magnetTasks
        .filter((t) => !t.done)
        .sort((a, b) => b.order - a.order)
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.notes,
          createdAt: Date.parse(t.createdAt) || 0,
          subtasks: (t.subtasks ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            completed: s.done,
            createdAt: 0,
            children: [],
          })),
        })),
    [magnetTasks]
  );

  /** Resolve any id (task or subtask) to its owning task id — the magnet's
   *  subtasks are flat, so a nested reference always resolves upward. */
  const ownerOf = (id: string): string | null => {
    const { tasks: all } = useMagnet.getState().data;
    const direct = all.find((t) => t.id === id);
    if (direct) return direct.id;
    const parent = all.find((t) => (t.subtasks ?? []).some((s) => s.id === id));
    return parent?.id ?? null;
  };

  const addTask = useCallback((title: string, description: string = "") => {
    useMagnet.getState().addTask({ title, notes: description });
  }, []);

  const removeTask = useCallback((id: string) => {
    useMagnet.getState().deleteTask(id);
    setActiveTaskId((aid) => (aid === id ? null : aid));
  }, []);

  const addSubTask = useCallback((parentId: string, title: string) => {
    const owner = ownerOf(parentId);
    if (!owner) return;
    useMagnet.getState().addSubtask(owner, title);
  }, []);

  const toggleSubTask = useCallback((subId: string) => {
    const owner = ownerOf(subId);
    if (!owner) return;
    useMagnet.getState().toggleSubtask(owner, subId);
  }, []);

  const setActiveTask = useCallback((id: string | null) => {
    setActiveTaskId(id);
  }, []);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  return {
    tasks,
    activeTask,
    activeTaskId,
    addTask,
    removeTask,
    addSubTask,
    toggleSubTask,
    setActiveTask,
  };
}
