import { useState, useCallback } from "react";
import type { LockerTask, SubTask } from "./types";

const STORAGE_KEY = "sg.focus.locker";

function loadTasks(): LockerTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: LockerTask[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage may be full
  }
}

// ---- Recursive tree helpers (subtask-in-subtask, "cherry tree") ------------

/** Append `child` under the node whose id is `parentId`, anywhere in the tree. */
function addSubToSubtasks(list: SubTask[], parentId: string, child: SubTask): SubTask[] {
  return list.map((s) =>
    s.id === parentId
      ? { ...s, children: [...(s.children ?? []), child] }
      : { ...s, children: addSubToSubtasks(s.children ?? [], parentId, child) }
  );
}

/** Toggle `completed` on the node with the given id, anywhere in the tree. */
function toggleInSubtasks(list: SubTask[], id: string): SubTask[] {
  return list.map((s) =>
    s.id === id
      ? { ...s, completed: !s.completed }
      : { ...s, children: toggleInSubtasks(s.children ?? [], id) }
  );
}

export function useLockerTask() {
  const [tasks, setTasks] = useState<LockerTask[]>(() => loadTasks());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const persistAndSet = useCallback((updater: (prev: LockerTask[]) => LockerTask[]) => {
    setTasks((prev) => {
      const next = updater(prev);
      saveTasks(next);
      return next;
    });
  }, []);

  const addTask = useCallback((title: string, description: string = "") => {
    const task: LockerTask = {
      id: crypto.randomUUID(),
      title,
      description,
      createdAt: Date.now(),
      subtasks: [],
    };
    persistAndSet((prev) => [...prev, task]);
    return task;
  }, [persistAndSet]);

  const removeTask = useCallback((id: string) => {
    persistAndSet((prev) => prev.filter((t) => t.id !== id));
    setActiveTaskId((aid) => (aid === id ? null : aid));
  }, [persistAndSet]);

  const addSubTask = useCallback((parentId: string, title: string) => {
    const child: SubTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
      children: [],
    };
    persistAndSet((prev) =>
      prev.map((t) =>
        t.id === parentId
          ? { ...t, subtasks: [...(t.subtasks ?? []), child] }
          : { ...t, subtasks: addSubToSubtasks(t.subtasks ?? [], parentId, child) }
      )
    );
  }, [persistAndSet]);

  const toggleSubTask = useCallback((subId: string) => {
    persistAndSet((prev) =>
      prev.map((t) => ({ ...t, subtasks: toggleInSubtasks(t.subtasks ?? [], subId) }))
    );
  }, [persistAndSet]);

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
