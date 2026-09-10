# Skip to Waypoint

A lightweight MSFS in-game toolbar panel for moving the aircraft directly to the active next waypoint while keeping the transition simple, stable, and consistent with the stock simulator UI.

## Introduction

This project started with a simple goal: make waypoint skipping fast and predictable without turning the tool into a heavy custom flight management system.

The current version focuses on the core workflow only: read the active waypoint, display it, and teleport the aircraft there safely. The design intentionally avoids unsupported SimVar assumptions and keeps the implementation focused on data the simulator exposes directly.

The project is intentionally minimal and conservative. It aims to stay compatible with the default MSFS panel feel while leaving room for future upgrades such as route-aware waypoint selection or SimBrief-based flight-plan support.

## How it works

The panel reads the active next waypoint from the simulator using the standard GPS waypoint variables:

- GPS WP NEXT ID
- GPS WP NEXT LAT
- GPS WP NEXT LON
- GPS WP NEXT ALT

It then displays the selected fix and allows the user to teleport the aircraft to that location. During teleport, the aircraft keeps its current altitude and rotates to the true bearing from the starting aircraft position toward the target waypoint.

This makes the reposition feel controlled rather than abrupt, while still keeping the operation fast and easy to use.

## What is implemented

The current implementation includes:

- a compact in-game panel for waypoint telemetry
- display of the active next waypoint
- coordinates and altitude output for the selected fix
- a teleport action to the current waypoint target
- altitude preservation on teleport
- heading adjustment toward the selected waypoint
- a default MSFS-style panel appearance using the native panel/template approach instead of custom color overrides
- a simplified architecture that avoids unsupported route-list SimVars

## Planned features

These are the planned improvements for later iterations of the project.

### UI refinements
- keep the panel aligned with native MSFS panel conventions
- reduce custom styling further where unnecessary
- improve spacing, hierarchy, and overall panel cleanliness without fighting the default theme

### SimBrief and route-aware waypoint support
- parse a real flight plan source and expose the full route
- show a list of upcoming waypoints instead of only the immediate next fix
- allow waypoint selection from a route list
- prefer SimBrief data when available, while keeping the current simulator waypoint fallback as a safe default

### Teleport behavior improvements
- add an optional offset so the aircraft can land just before the waypoint instead of on top of it
- calculate the offset based on the line from the current position to the target waypoint
- maintain the correct aircraft orientation after landing on the offset location
- account for realistic turn geometry and approach behavior at cruise speed

### Flight realism and simulation quality
- optionally calculate and apply fuel changes on teleport
- consider reducing or adjusting fuel based on time elapsed or route distance
- evaluate whether time/weather compensation is needed for longer jumps or live-weather scenarios

### Future exploration
- integrate a richer flight-plan workflow when the project moves beyond the current minimal implementation
- revisit the route selection UI only when a real route source becomes available
- evaluate additional automation or safety checks if the feature set becomes more advanced
