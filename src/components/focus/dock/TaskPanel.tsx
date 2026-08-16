import { useState } from "react";
import type { LockerTask, SubTask } from "../../../hooks/focus/types";

interface TaskPanelProps {
  tasks: LockerTask[];
  activeTaskId: string | null;
  onAddTask: (title: string, description: string) => void;
  onRemoveTask: (id: string) => void;
  onSetActive: (id: string | null) => void;
  onAddSubTask: (parentId: string, title: string) => void;
  onToggleSubTask: (subId: string) => void;
  onLockIn: (taskId: string, duration: number) => void;
}

const DURATION_PRESETS = [15, 25, 45, 60, 90, 120];

/** Flat subtask list (matches the Task Magnet model — one level of steps). */
function Subtree({
  subs,
  onToggle,
}: {
  subs: SubTask[];
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {subs.map((sub) => (
        <div
          key={sub.id}
          style={{
            marginLeft: 10,
            paddingLeft: 6,
            borderLeft: "1px solid rgba(201,168,76,0.18)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              cursor: "pointer",
              color: sub.completed ? "var(--color-genshin-bronze)" : "var(--color-genshin-gold-light)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={sub.completed}
              onChange={() => onToggle(sub.id)}
              style={{ accentColor: "var(--color-genshin-gold)" }}
            />
            <span style={{ flex: 1, minWidth: 0, ...(sub.completed ? { textDecoration: "line-through", opacity: 0.4 } : {}) }}>
              {sub.title}
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

export function TaskPanel({
  tasks,
  activeTaskId,
  onAddTask,
  onRemoveTask,
  onSetActive,
  onAddSubTask,
  onToggleSubTask,
  onLockIn,
}: TaskPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({});

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    onAddTask(newTitle.trim(), newDesc.trim());
    setNewTitle("");
    setNewDesc("");
  };

  const addSubAt = (parentId: string) => {
    const title = subTaskInputs[parentId]?.trim();
    if (!title) return;
    onAddSubTask(parentId, title);
    setSubTaskInputs((prev) => ({ ...prev, [parentId]: "" }));
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            className="genshin-input"
            style={{ flex: 1, fontSize: "0.75rem" }}
            placeholder="New task (syncs to Task Magnet)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          />
          <button onClick={handleAddTask} className="genshin-btn" style={{ padding: "0.25rem 0.75rem", fontSize: "0.65rem" }}>
            Add
          </button>
        </div>
        <input
          className="genshin-input"
          style={{ fontSize: "0.75rem", width: "100%" }}
          placeholder="Description (optional)..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
      </div>

      <div className="genshin-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
        {activeTask && (
          <div style={{ padding: "0.75rem", margin: "0.5rem", borderRadius: 2, background: "rgba(201,168,76,0.08)", border: "1px solid var(--color-genshin-divider)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-genshin-gold)", fontFamily: "var(--font-serif-heading)" }}>
                ACTIVE: {activeTask.title}
              </span>
              <button
                onClick={() => onSetActive(null)}
                style={{ fontSize: "0.75rem", color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-serif-heading)" }}
              >
                Deselect
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: "0.5rem" }}>
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration((prev) => ({ ...prev, [activeTask.id]: d }))}
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    background: (selectedDuration[activeTask.id] ?? 25) === d ? "rgba(201,168,76,0.15)" : "transparent",
                    border: `1px solid ${(selectedDuration[activeTask.id] ?? 25) === d ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.2)"}`,
                    color: (selectedDuration[activeTask.id] ?? 25) === d ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
                    cursor: "pointer",
                    fontFamily: "var(--font-serif-heading)",
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>

            <button
              onClick={() => onLockIn(activeTask.id, (selectedDuration[activeTask.id] ?? 25) * 60)}
              className="genshin-btn"
              style={{ width: "100%", fontSize: "0.875rem" }}
            >
              Lock In & Focus
            </button>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              padding: "0.75rem",
              margin: "0 0.5rem 0.5rem 0.5rem",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s",
              background: task.id === activeTaskId ? "rgba(201,168,76,0.1)" : "rgba(26,20,16,0.2)",
              border: `1px solid ${task.id === activeTaskId ? "var(--color-genshin-gold)" : "rgba(139,109,46,0.1)"}`,
            }}
            onClick={() => onSetActive(task.id)}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-genshin-gold-light)", fontFamily: "var(--font-serif-heading)" }}>
                {task.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTask(task.id);
                }}
                style={{ fontSize: "0.75rem", opacity: 0.5, color: "var(--color-genshin-bronze)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {task.description && (
              <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.6, color: "var(--color-genshin-bronze)" }}>
                {task.description}
              </p>
            )}

            {(task.subtasks ?? []).length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <Subtree subs={task.subtasks} onToggle={onToggleSubTask} />
              </div>
            )}

            <div
              style={{ display: "flex", gap: 4, marginTop: "0.5rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                className="genshin-input"
                style={{ flex: 1, fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                placeholder="+ subtask..."
                value={subTaskInputs[task.id] ?? ""}
                onChange={(e) => setSubTaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addSubAt(task.id)}
              />
              <button
                onClick={() => addSubAt(task.id)}
                className="genshin-btn genshin-btn-secondary"
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.6rem" }}
              >
                +
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.875rem", opacity: 0.5, color: "var(--color-genshin-bronze)" }}>
            No open tasks.
            <br />
            Add one above — it appears in your Task Magnet too.
          </div>
        )}
      </div>
    </div>
  );
}
