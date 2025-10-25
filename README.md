# Grow Tent Planner

A comprehensive web application for planning and managing your indoor grow tent operations. Schedule seed starts, track plant growth, and maximize your available space.

## Features

- **Rack Configuration**: Customize your grow tent setup with 3 configurable racks
  - Rack 1: Default 2 shelves
  - Rack 2: Default 4 shelves
  - Rack 3: Default 12 shelves (seed starting rack)
  - All racks are adjustable to fit your needs

- **Plant Planning**:
  - Add plants with seed start dates
  - Track indoor vs outdoor plants
  - Set germination and transplant timelines
  - Manage different pot sizes (3", 6", 12")
  - Add notes for each plant variety

- **Calendar View**: Visualize your entire growing schedule
  - See seed start dates
  - Track germination dates
  - Plan transplant dates
  - Monthly calendar display

- **Space Management**:
  - Calculate seed cell usage (72 cells per tray, 4 trays per shelf)
  - Track shelf utilization across all racks
  - Monitor indoor vs outdoor plant distribution
  - View grow light coverage (2 lights per shelf)

- **Plan Management**:
  - Save multiple growing plans
  - Name plans by season (e.g., "Spring 2024", "Winter Indoor")
  - Load and switch between different plans
  - Export/import plans via browser localStorage

## Specifications

### Grow Tent
- Ceiling Height: 6.5 ft (78")

### Racks (3 total)
- Dimensions: 72"H x 47.7"W x 18"D
- Maximum Capacity: 2100 lbs per rack

### Seed Starting
- 72 cells per tray
- 4 trays per shelf
- 2 grow lights per shelf

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Create a Plan**: Start by creating a new plan and giving it a descriptive name
2. **Configure Racks**: Adjust the number of shelves on each rack if needed
3. **Add Plants**: Use the plant form to add seeds you want to start
4. **View Calendar**: Check the calendar view to see your schedule
5. **Monitor Space**: Track how much space you're using in the Space Usage tab
6. **Save**: Your plans are automatically saved to browser localStorage

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **date-fns** - Date manipulation
- **lucide-react** - Icons

## License

MIT
