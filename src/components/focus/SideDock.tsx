import { useRef, useState } from "react";
import type { DockTab, LockerTask } from "../../hooks/focus/types";
import { TaskPanel } from "./dock/TaskPanel";
import { SearchPanel } from "./dock/SearchPanel";

interface SideDockProps {
  isOpen: boolean;
  activeTab: DockTab;
  width: number;
  onTabChange: (tab: DockTab) => void;
  onClose: () => void;
  onResizeWidth: (width: number) => void;
  /** During hardcore the task bar is locked open — the close button switches to Tasks. */
  lockOpen?: boolean;
  tasks: LockerTask[];
  activeTaskId: string | null;
  onAddTask: (title: string, description: string) => void;
  onRemoveTask: (id: string) => void;
  onSetActive: (id: string | null) => void;
  onAddSubTask: (parentId: string, title: string) => void;
  onToggleSubTask: (subId: string) => void;
  onLockIn: (taskId: string, duration: number) => void;
}

const MIN_W = 320;
const MAX_W = 640;

function IconTasks({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}
function IconSearch({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

const tabs: { id: DockTab; label: string; icon: (s: number) => React.ReactNode }[] = [
  { id: "tasks", label: "Tasks", icon: (s) => <IconTasks size={s} /> },
  { id: "search", label: "Search", icon: (s) => <IconSearch size={s} /> },
];

export function SideDock({
  isOpen,
  activeTab,
  width,
  onTabChange,
  onClose,
  onResizeWidth,
  lockOpen = false,
  tasks,
  activeTaskId,
  onAddTask,
  onRemoveTask,
  onSetActive,
  onAddSubTask,
  onToggleSubTask,
  onLockIn,
}: SideDockProps) {
  const handleClose = lockOpen ? () => onTabChange("tasks") : onClose;
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const w = liveWidth ?? width;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = w;
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(MIN_W, Math.min(MAX_W, startW + (startX - ev.clientX)));
      setLiveWidth(newW);
      if (drawerRef.current) drawerRef.current.style.width = `${newW}px`;
    };
    const onUp = () => {
      const finalW = Math.max(MIN_W, Math.min(MAX_W, startW + (startX - (e.clientX - 0))));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setLiveWidth(null);
      onResizeWidth(finalW);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      {/* Dock trigger tab */}
      <div
        className="genshin-card"
        style={{
          position: "fixed",
          right: 0,
          top: "50%",
          zIndex: 40,
          transform: isOpen ? "translateY(-50%) translateX(0)" : "translateY(-50%)",
        }}
      >
        <button
          onClick={() => onTabChange(isOpen ? (lockOpen ? "tasks" : activeTab) : "tasks")}
          className="genshin-card"
          style={{
            padding: "1.5rem 0.5rem",
            borderRadius: "2px 0 0 2px",
            cursor: "pointer",
            borderRight: "none",
            background: lockOpen ? "rgba(180,150,60,0.18)" : "var(--color-genshin-parchment)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            fontFamily: "var(--font-serif-heading)",
            color: lockOpen ? "var(--color-genshin-gold)" : "var(--color-genshin-ink)",
          }}
        >
          {lockOpen ? (isOpen ? "TASKS" : "TASK BAR") : isOpen ? "CLOSE" : "DOCK"}
        </button>
      </div>

      {/* Side drawer */}
      <div
        ref={drawerRef}
        className="genshin-card"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          width: `${w}px`,
          transform: isOpen ? "translateX(0)" : `translateX(${w}px)`,
          transition: liveWidth ? "none" : "transform 0.3s ease-out",
          borderLeft: "1px solid var(--color-genshin-divider)",
          borderRight: "none",
          background: "var(--color-genshin-dark)",
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-genshin-divider)",
            alignItems: "stretch",
            background: "var(--color-genshin-dark)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                padding: "0.625rem 0",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
                transition: "all 0.2s",
                position: "relative",
                color:
                  activeTab === tab.id
                    ? "var(--color-genshin-gold)"
                    : "var(--color-genshin-bronze)",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid var(--color-genshin-gold)"
                    : "2px solid transparent",
                fontFamily: "var(--font-serif-heading)",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor:
                  activeTab === tab.id
                    ? "var(--color-genshin-gold)"
                    : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              {tab.icon(13)} {tab.label}
            </button>
          ))}
          <button
            onClick={handleClose}
            style={{
              padding: "0 0.75rem",
              fontSize: "0.75rem",
              color: lockOpen ? "var(--color-genshin-gold)" : "var(--color-genshin-bronze)",
              fontFamily: "var(--font-serif-heading)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            title={lockOpen ? "Task bar is locked during hardcore" : "Close"}
          >
            {lockOpen ? "☰" : "✕"}
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {activeTab === "tasks" && (
            <TaskPanel
              tasks={tasks}
              activeTaskId={activeTaskId}
              onAddTask={onAddTask}
              onRemoveTask={onRemoveTask}
              onSetActive={onSetActive}
              onAddSubTask={onAddSubTask}
              onToggleSubTask={onToggleSubTask}
              onLockIn={onLockIn}
            />
          )}
          {activeTab === "search" && <SearchPanel />}
        </div>

        {/* Resize handle */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "col-resize",
            zIndex: 5,
          }}
          onMouseDown={startResize}
        />
      </div>
    </>
  );
}
