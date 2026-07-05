# LavaPad — Game Design Document

## 1. Executive Summary

LavaPad is a 3D survival platformer where players navigate a network of floating platforms suspended above an ever-rising sea of lava. The design is built around a single, uncompromising principle: **every jump is a decision**. There are no extraneous mechanics, no progression systems, and no luck-based outcomes. Success is determined entirely by a player's ability to assess their environment, plan a route, and execute with precision under pressure.

Matches are intentionally short—approximately two to five minutes—to sustain high tension and encourage rapid replay. The experience is designed to be easy to learn and difficult to master.

## 2. Design Pillars

- **Easy to Learn, Difficult to Master:** The rules are simple: don't touch the lava. Mastery comes from understanding spatial relationships, platform behavior, and lava timing.
- **Meaningful Decisions:** Every jump should feel consequential. There is no randomness in platform generation or lava speed; players always have the information they need to make a choice.
- **Environmental Pressure:** The rising lava is the sole source of difficulty. It is predictable, visible, and inescapable. This creates a fair but relentless challenge.
- **Clarity Above All:** Every visual, audio, and UI element exists to provide the player with the information they need to make the next decision. Nothing is decorative if it competes with gameplay readability.

## 3. Core Gameplay

### 3.1 The Gameplay Loop

1. **Spawn:** The player begins on a safe platform.
2. **Observe:** The player scans the surrounding platforms, assessing routes, lava level, and hazards.
3. **Plan:** The player identifies the next safe destination. This may involve a simple hop or a complex sequence of moves.
4. **Execute:** The player commits to the jump.
5. **React:** The lava rises, altering the available safe space.
6. **Repeat:** The cycle continues until only one player remains.

### 3.2 Strategic Movement

Platforms are not randomly scattered; they are part of an interconnected network. This is a critical design choice. It transforms the game from a reaction-based platformer into a spatial puzzle. Players are not jumping blindly; they are choosing paths. A "safe" large platform might be a dead end. A risky small platform might lead to a superior escape route. This creates a constant risk-vs.-reward evaluation.

## 4. Platform Design

Platforms are the core verbs of LavaPad. Each type exists to create a specific decision point for the player.

| Platform | Gameplay Purpose |
| :--- | :--- |
| **Spawn** | Provides a moment of safety and orientation at the start of a match. |
| **Large** | Offers a forgiving landing area but is often a strategic trap, featuring fewer exits and encouraging overconfidence. |
| **Small** | Demands precision. Landing here is harder, but these platforms often serve as critical connectors on the only viable route. |
| **Moving** | Tests timing and patience. Forces the player to commit to a moving target, often under lava pressure. |
| **Cracked** | Collapses after a set duration. Rewards players who quickly assess and move through; punishes hesitation. |
| **Shrinking** | Forces continuous motion. Players cannot rest, creating a mini-crisis of decision-making. |

## 5. Difficulty & Pressure

The lava is the game's heartbeat. Its behavior is governed by strict, transparent rules:

- **Predictable:** The lava rises at a steady, known rate. There are no surprise accelerations.
- **Inevitable:** It cannot be stopped, slowed, or interacted with.
- **Escalating:** As the lava climbs, the number of viable platforms decreases. Late-game decisions are made under extreme spatial and temporal pressure.

This design avoids artificial difficulty. A player's failure is always a result of their own miscalculation, not an unfair mechanic.

## 6. Camera, UI, and Visuals

### 6.1 Camera
The camera is a tool for clarity. It must:
- Keep the player character and immediate surroundings in frame.
- Provide a clear sense of depth and spatial relationships.
- Move smoothly to prevent motion sickness or disorientation during intense sequences.

### 6.2 UI
The UI is minimal. It displays only:
- The current lava level.
- Remaining player count.

No clutter. No pop-ups during gameplay.

### 6.3 Visual Style
- **Platforms:** Clear, distinct silhouettes that communicate type at a glance.
- **Lava:** Threatening and visually dominant, but its boundaries are sharply defined to aid in jump calculation.
- **Atmosphere:** A stylized volcanic environment that reinforces the fantasy setting without obscuring gameplay.

### 6.4 Audio
- **Lava:** A rising, non-intrusive rumble that serves as a persistent metronome of pressure.
- **Platforms:** Subtle audio cues differentiate platform types, providing another layer of information for the player.
- **Silence:** Moments of quiet are used intentionally to heighten tension before a critical jump.

## 7. Performance

LavaPad targets a stable 60 FPS on modern hardware. This is non-negotiable for a platformer where frame precision affects jump outcomes.

Key targets:
- **Rendering:** Efficient instanced mesh rendering for platforms to keep draw calls low.
- **Multiplayer:** Optimized networking to ensure smooth gameplay even with a high player count.
- **Loading:** Near-instant match start times.

## 8. Player Psychology

The emotional arc of a LavaPad match is designed to create a specific psychological state:

- **Tension:** The visible, inescapable lava creates a constant low-level stress that peaks during difficult jumps.
- **Agency:** Because the game is deterministic, players feel that their wins and losses are earned. This fosters a strong desire to improve.
- **Flow:** The 2-5 minute duration prevents the rise of frustration. The player is always "in" the experience.
- **The "One More Match" Effect:** The brevity of a match, combined with the clear cause of death, makes it easy for a player to immediately start again, convinced that their next plan will be better.

## 9. Scope & Future

The development priority is to perfect the core experience. The scope is intentionally narrow to ensure the highest possible level of polish.

Future content will be limited to:
- **New Arena Layouts:** Different platform arrangements that create novel strategic puzzles using the existing mechanics.
- **Environmental Variations:** Subtle changes to lighting or atmosphere that alter the feel of a match without introducing new gameplay systems.

No features that would dilute the core loop (e.g., progression systems, cosmetics, or meta-games) will be considered.