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
const MAX_DEPTH = 4;

/** Recursive subtree — the cherry-tree model: subtasks inside subtasks. */
function Subtree({
  parentId,
  subs,
  depth,
  inputs,
  setInputs,
  onToggle,
  onAdd,
}: {
  parentId: string;
  subs: SubTask[];
  depth: number;
  inputs: Record<string, string>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onToggle: (id: string) => void;
  onAdd: (parentId: string, title: string) => void;
}) {
  const addAt = (parentId: string) => {
    const title = inputs[parentId]?.trim();
    if (!title) return;
    onAdd(parentId, title);
    setInputs((prev) => ({ ...prev, [parentId]: "" }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {subs.map((sub) => (
        <div
          key={sub.id}
          style={{
            marginLeft: depth * 12,
            paddingLeft: depth > 0 ? 6 : 0,
            borderLeft: depth > 0 ? "1px solid rgba(201,168,76,0.18)" : "none",
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

          {(sub.children ?? []).length > 0 && (
            <Subtree
              parentId={sub.id}
              subs={sub.children}
              depth={depth + 1}
              inputs={inputs}
              setInputs={setInputs}
              onToggle={onToggle}
              onAdd={onAdd}
            />
          )}

          {depth < MAX_DEPTH && (
            <div
              style={{ display: "flex", gap: 4, marginTop: 3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                className="genshin-input"
                style={{ flex: 1, fontSize: "0.7rem", padding: "0.2rem 0.45rem" }}
                placeholder="+ sub..."
                value={inputs[sub.id] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addAt(sub.id)}
              />
              <button
                onClick={() => addAt(sub.id)}
                className="genshin-btn genshin-btn-secondary"
                style={{ padding: "0.2rem 0.45rem", fontSize: "0.6rem" }}
              >
                +
              </button>
            </div>
          )}
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

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--color-genshin-divider)" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            className="genshin-input"
            style={{ flex: 1, fontSize: "0.75rem" }}
            placeholder="New locker task..."
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
                <Subtree
                  parentId={task.id}
                  subs={task.subtasks}
                  depth={1}
                  inputs={subTaskInputs}
                  setInputs={setSubTaskInputs}
                  onToggle={onToggleSubTask}
                  onAdd={onAddSubTask}
                />
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const title = subTaskInputs[task.id]?.trim();
                    if (!title) return;
                    onAddSubTask(task.id, title);
                    setSubTaskInputs((prev) => ({ ...prev, [task.id]: "" }));
                  }
                }}
              />
              <button
                onClick={() => {
                  const title = subTaskInputs[task.id]?.trim();
                  if (!title) return;
                  onAddSubTask(task.id, title);
                  setSubTaskInputs((prev) => ({ ...prev, [task.id]: "" }));
                }}
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
            No locker tasks yet.
            <br />
            Create your first study goal above.
          </div>
        )}
      </div>
    </div>
  );
}
