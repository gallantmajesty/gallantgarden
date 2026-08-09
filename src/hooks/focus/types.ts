export type ClockMode =
  | "sand"
  | "pendulum"
  | "digital";

export type DockTab = "tasks" | "search";

export interface LockerTask {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  subtasks: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  /** Nested subtasks — the cherry-tree model: task → chapters → topics. */
  children: SubTask[];
}

export interface TimerState {
  mode: "idle" | "running" | "paused" | "completed";
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  pausedAt: number | null;
}

export interface SessionRecord {
  date: string;
  totalMinutes: number;
  focusMinutes: number;
  leavesEarned: number;
  streakDay: boolean;
  clockMode: ClockMode;
}

export interface ScholarPresence {
  id: string;
  name: string;
  rank: string;
  rankBadge: string;
  isStudying: boolean;
  focusMinutes: number;
}

export interface FocusPreferences {
  clockMode: ClockMode;
  dockOpen: boolean;
  dockTab: DockTab;
  dockWidth: number;
  hardcodeMode: boolean;
  sessionDuration: number;
  breakDuration: number;
}

export interface AstronomicalLog {
  sessions: SessionRecord[];
  totalFocusMinutes: number;
  totalLeaves: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ClockProps {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  focusMinutes: number;
  streakDays: number;
  momentumScore: number;
}
