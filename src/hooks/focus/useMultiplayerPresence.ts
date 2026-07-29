import { useState } from "react";
import type { ScholarPresence } from "./types";

export function useMultiplayerPresence() {
  const [scholars] = useState<ScholarPresence[]>([]);

  const activeCount = scholars.filter((s) => s.isStudying).length;

  return { scholars, activeCount, totalCount: scholars.length };
}
