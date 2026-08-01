import type { ClockMode } from "../../hooks/focus/types";
import type { ClockProps } from "../../hooks/focus/types";
import { SandClock } from "./clocks/SandClock";
import { PendulumClock } from "./clocks/PendulumClock";
import { DigitalClock } from "./clocks/DigitalClock";

interface ClockRendererProps extends ClockProps {
  mode: ClockMode;
}

export function ClockRenderer({ mode, ...props }: ClockRendererProps) {
  switch (mode) {
    case "sand":
      return <SandClock {...props} />;
    case "pendulum":
      return <PendulumClock {...props} />;
    case "digital":
      return <DigitalClock {...props} />;
  }
}
