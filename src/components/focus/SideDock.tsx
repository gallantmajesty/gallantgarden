import type { DockTab, LockerTask } from "../../hooks/focus/types";
import { AiAssistantPanel } from "./dock/AiAssistantPanel";
import { YouTubePanel } from "./dock/YouTubePanel";
import { SpotifyPanel } from "./dock/SpotifyPanel";
import { TaskPanel } from "./dock/TaskPanel";

interface SideDockProps {
  isOpen: boolean;
  activeTab: DockTab;
  width: number;
  onTabChange: (tab: DockTab) => void;
  onClose: () => void;
  tasks: LockerTask[];
  activeTaskId: string | null;
  onAddTask: (title: string, description: string) => void;
  onRemoveTask: (id: string) => void;
  onSetActive: (id: string | null) => void;
  onAddSubTask: (taskId: string, title: string) => void;
  onToggleSubTask: (taskId: string, subId: string) => void;
  onLockIn: (taskId: string, duration: number) => void;
}

const tabs: { id: DockTab; label: string; icon: string }[] = [
  { id: "ai", label: "AI", icon: "✦" },
  { id: "youtube", label: "YouTube", icon: "▶" },
  { id: "spotify", label: "Spotify", icon: "♫" },
  { id: "tasks", label: "Tasks", icon: "☰" },
];

export function SideDock({
  isOpen,
  activeTab,
  width,
  onTabChange,
  onClose,
  tasks,
  activeTaskId,
  onAddTask,
  onRemoveTask,
  onSetActive,
  onAddSubTask,
  onToggleSubTask,
  onLockIn,
}: SideDockProps) {
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
          onClick={() => onTabChange(isOpen ? activeTab : "ai")}
          className="genshin-card"
          style={{
            padding: "1.5rem 0.5rem",
            borderRadius: "2px 0 0 2px",
            cursor: "pointer",
            borderRight: "none",
            background: "var(--color-genshin-parchment)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            fontFamily: "var(--font-serif-heading)",
            color: "var(--color-genshin-ink)",
          }}
        >
          {isOpen ? "CLOSE" : "DOCK"}
        </button>
      </div>

      {/* Side drawer */}
      <div
        className="genshin-card"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100%",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          width: `${width}px`,
          transform: isOpen ? "translateX(0)" : `translateX(${width}px)`,
          transition: "transform 0.3s ease-out",
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
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              padding: "0 0.75rem",
              fontSize: "0.75rem",
              color: "var(--color-genshin-bronze)",
              fontFamily: "var(--font-serif-heading)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "ai" && <AiAssistantPanel />}
          {activeTab === "youtube" && <YouTubePanel />}
          {activeTab === "spotify" && <SpotifyPanel />}
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
        </div>

        {/* Resize handle */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            cursor: "col-resize",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = width;
            const onMove = (ev: MouseEvent) => {
              const delta = startX - ev.clientX;
              const newW = startW + delta;
              document.documentElement.style.setProperty("--dock-width", `${newW}px`);
            };
            const onUp = () => {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
        />
      </div>
    </>
  );
}
