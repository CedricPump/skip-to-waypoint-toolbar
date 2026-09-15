# Skip to Waypoint

A lightweight MSFS in-game toolbar panel for moving the aircraft directly to the active next waypoint while keeping the transition simple, stable, and consistent with the stock simulator UI.

## Introduction

This project started with a simple goal: make waypoint skipping fast and predictable without turning the tool into a heavy custom flight management system.

The current version uses a SimBrief flight plan as its route source. It displays the reconciled next fix separately from a selectable upcoming-fix control, then teleports the aircraft to the selected fix. The design avoids relying on the native GPS waypoint SimVars because many airliners do not feed the simulator GPS system.

The project is intentionally minimal and conservative. It aims to stay compatible with the default MSFS panel feel while leaving room for future upgrades such as route-aware waypoint selection or SimBrief-based flight-plan support.

## How it works

The panel fetches the latest SimBrief flight plan as JSON using a configured username or Pilot ID. The plan's `navlog.fix` entries provide waypoint identifiers and coordinates. The panel chooses a forward next fix, periodically reconciles it at a low frequency, and keeps the selected teleport target independent from the next-fix guidance display.

During teleport, the aircraft keeps its current altitude and rotates to the true bearing from the starting aircraft position toward the selected target waypoint.

This makes the reposition feel controlled rather than abrupt, while still keeping the operation fast and easy to use.

## What is implemented

The current implementation includes:

- a compact in-game panel for waypoint telemetry
- display of the reconciled next fix with latitude, longitude, distance, and bearing
- an MSFS-compatible `NewListButton` for selecting upcoming fixes
- coordinates for the selected teleport fix
- a teleport action to the selected flight-plan fix
- altitude preservation on teleport
- heading adjustment toward the selected waypoint
- a default MSFS-style panel appearance using the native panel/template approach instead of custom color overrides
- a simplified architecture that avoids unsupported native GPS route assumptions
- an editable `SimBriefConfig.js` file for the initial SimBrief username or Pilot ID

## Planned features

These are the planned improvements for later iterations of the project.

### UI refinements
- keep the panel aligned with native MSFS panel conventions
- reduce custom styling further where unnecessary
- improve spacing, hierarchy, and overall panel cleanliness without fighting the default theme

### SimBrief and route-aware waypoint support
- improve authentication/configuration handling
- preserve or restore the last selected fix when appropriate
- refine route reconciliation for flights loaded in progress

### Teleport behavior improvements
- add an optional offset so the aircraft can land just before the waypoint instead of on top of it
- calculate the offset based on the line from the current position to the target waypoint
- maintain the correct aircraft orientation after landing on the offset location
- account for realistic turn geometry and approach behavior at cruise speed
- calculate fuel consumption on teleport
- investigate whether SimBrief estimated fuel values are available for each navlog fix

### Flight realism and simulation quality
- optionally calculate and apply fuel changes on teleport
- consider reducing or adjusting fuel based on time elapsed or route distance
- evaluate whether time/weather compensation is needed for longer jumps or live-weather scenarios

### Future exploration
- integrate a richer flight-plan workflow when the project moves beyond the current minimal implementation
- evaluate additional automation or safety checks if the feature set becomes more advanced

## Platform constraints

The panel runs inside the MSFS HTML UI environment. Native HTML controls such as `<select>` are unreliable in this environment, so route selection uses the simulator's `NewListButton` template instead. Browser storage is also not treated as durable configuration; the initial SimBrief identity is supplied through the bundled `html_ui/InGamePanels/skipto-panel/SimBriefConfig.js` file.
