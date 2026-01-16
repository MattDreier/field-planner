# Field Planner

A visual garden planning tool for designing cut flower beds with intelligent spacing, sun simulation, and succession planting schedules.

![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-orange)
![Svelte](https://img.shields.io/badge/Svelte-5.0-red)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-blue)

## Features

- **Visual Bed Designer** - Create rectangular and circular garden beds with drag-and-drop placement
- **Smart Plant Spacing** - Automatic collision detection shows when plants are too close together
- **Height Visualization** - Color-coded plant markers indicate relative heights for planning sight lines
- **Sun Simulation** - Real-time shadow casting based on time of day, season, and USDA hardiness zone
- **Succession Planner** - Schedule multiple plantings of the same crop for continuous harvest
- **Timeline View** - Gantt-style visualization of planting schedules with lifecycle phases

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5 (runes), TypeScript
- **Styling**: Tailwind CSS v4, shadcn-svelte components
- **Backend**: Convex (currently demo mode with in-memory state)
- **Tools**: Vite 6, Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
# Clone the repository
git clone https://github.com/MattDreier/field-planner.git
cd field-planner

# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

### Scripts

```bash
bun run dev      # Start dev server
bun run build    # Production build
bun run preview  # Preview production build
```

## Usage

1. **Create a bed** - Select the rectangle or circle tool and click on the canvas
2. **Add plants** - Drag flowers from the palette onto a bed
3. **Check spacing** - Red circles indicate plants that are too close together
4. **Simulate shadows** - Use the sun tool to see how plant heights affect shading
5. **Plan successions** - Open the timeline panel (T) and add succession plantings

## Flower Database

Includes 13 cut flower varieties with comprehensive growing data:
- Zinnia, Dahlia, Sunflower, Cosmos
- Snapdragon, Larkspur, Sweet Pea, Lisianthus
- Ranunculus, Anemone, Stock, Celosia, Strawflower

Each variety includes spacing requirements, height ranges, germination times, days to harvest, and companion planting suggestions.

## Architecture

```
src/
├── lib/
│   ├── components/
│   │   ├── canvas/      # FieldCanvas, Bed, PlacedPlant, GridBackground
│   │   ├── sidebar/     # BedTools, PlantPalette, PlantDetails
│   │   └── timeline/    # TimelinePanel, TimelineGantt, SuccessionPlanner
│   ├── stores/          # Svelte 5 rune-based state management
│   ├── utils/           # Collision detection, color mapping, coordinates
│   └── data/            # Flower database, hardiness zones
├── convex/              # Database schema and functions
└── routes/              # SvelteKit pages
```

## License

MIT
