# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Orchestration (Required)

**Always use the Task tool to delegate work to specialized agents.** This preserves the main session's context window for high-level coordination.

### When to Spawn Agents

| Task Type | Agent | Rationale |
|-----------|-------|-----------|
| Codebase exploration | `Explore` | Searches, greps, and file reads consume context |
| Implementation planning | `Plan` | Architecture analysis is context-heavy |
| Multi-file implementations | Specialized agents | Keep main session for coordination |
| Code review | `pr-review-toolkit:*` agents | Detailed review stays isolated |
| Research questions | `general-purpose` | Web searches and doc reads stay contained |

### Orchestration Pattern

1. **Understand** - Spawn `Explore` agent to gather context
2. **Plan** - Use `Plan` agent or enter plan mode for architecture decisions
3. **Implement** - Delegate to appropriate agents (frontend, backend, etc.)
4. **Verify** - Spawn review agents to validate work
5. **Summarize** - Main session synthesizes agent outputs for user

### Context Preservation Rules

- **Never** read large files directly in main session when an agent can do it
- **Spawn agents in parallel** when tasks are independent
- **Run long builds/tests in background** using `run_in_background: true`
- **Prefer agent summaries** over raw tool outputs in main session

## Commands

```bash
# Development
bun run dev          # Start dev server at localhost:5173
bun run build        # Production build
bun run preview      # Preview production build

# Convex (database)
bunx convex dev      # Start Convex dev server (generates types in src/convex/_generated/)
```

## Architecture

### Tech Stack
- SvelteKit 2 with Svelte 5 (uses runes: `$state`, `$derived`, `$props`)
- Tailwind CSS v4 with @tailwindcss/postcss
- shadcn-svelte for UI components
- Convex for backend persistence (currently in demo mode - data is in-memory)

### Coordinate Systems

The app uses three coordinate spaces for the canvas:

1. **Canvas Pixels** - Browser display coordinates
2. **Field Inches** - Absolute garden position (default 240" × 180" = 20ft × 15ft)
3. **Bed-Local Inches** - Position within a specific bed

Conversion utilities in `src/lib/utils/coordinates.ts`. Scale formula: `pixelsPerInch (12) × zoom`

### Data Flow

State lives in `src/routes/+page.svelte` with `beds[]` and `plants[]` arrays. These pass down to:
- `FieldCanvas.svelte` - Main SVG container that renders everything
- Child components receive data via props and emit events back up

### Key Algorithms

**Collision Detection** (`src/lib/utils/collision.ts`): O(n²) circle overlap detection using squared distances. Plants with overlapping spacing circles get `hasConflict: true`.

**Height Color Mapping** (`src/lib/utils/color.ts`): Maps plant heights to HSL gradient. Blue (240°) = shortest, Red (0°) = tallest. Colors are relative to currently placed plants.

### Component Structure

```
+page.svelte (state owner)
├── BedTools (tool selection)
├── PlantPalette → PlantCard (draggable flowers)
├── HeightLegend
└── FieldCanvas (SVG)
    ├── GridBackground
    ├── Bed[] (rectangle/circle shapes)
    └── PlacedPlant[] → SpacingCircle
```

### Database Schema (Convex)

Three tables: `layouts`, `beds`, `placedPlants`. Schema in `src/convex/schema.ts`. Currently app runs in demo mode with local state only.

### Flower Database

`flowers.ts` contains 13 cut flower varieties with comprehensive growing data including `spacingMin`, `heightMax`, germination times, harvest info, and growing conditions.

## Key Patterns

- Use `$derived.by()` for expensive reactive computations (collision detection, color mapping)
- Beds store dimensions in feet (user-facing), calculations use inches internally
- SVG elements need ARIA roles for accessibility (`role="button"`, `role="img"`)
- Drag-and-drop uses native HTML5 events, not a library
