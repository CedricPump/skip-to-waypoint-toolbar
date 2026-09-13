# Project notes

## Current status
- The panel supports a three-option waypoint source selector: GPS, SimBrief, and Manual.
- Only GPS is functionally active right now.
- SimBrief and Manual UI entries are intentionally prepared as future targets, not active implementations.

## GPS mode
- Reads the active next waypoint from the native MSFS GPS variables.
- Refreshes periodically to keep the current waypoint, distance, and heading up to date.
- Keeps the coordinate math non-blocking so the panel still displays coordinates when distance math is unavailable.

## Planned future work
- Add SimBrief route import and route-aware waypoint selection.
- Add manual waypoint or airport resolution by text input.
- Keep the source selector and UI state in sync as each mode is implemented.

## Notes
- The panel is intentionally conservative and avoids relying on unsupported or unavailable MSFS route variables.
- The source selection is a UI scaffold only at this stage; GPS remains the one usable implementation.
