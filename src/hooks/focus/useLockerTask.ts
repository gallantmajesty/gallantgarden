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

  const addSubTask = useCallback((taskId: string, title: string) => {
    persistAndSet((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const sub: SubTask = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          createdAt: Date.now(),
        };
        return { ...t, subtasks: [...t.subtasks, sub] };
      })
    );
  }, [persistAndSet]);

  const toggleSubTask = useCallback((taskId: string, subId: string) => {
    persistAndSet((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((s) =>
            s.id === subId ? { ...s, completed: !s.completed } : s
          ),
        };
      })
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
