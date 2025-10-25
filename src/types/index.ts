export type PotSize = '3"' | '6"' | '12"' | 'tray';
export type PlantLocation = 'indoor' | 'outdoor';
export type GrowthStage = 'seed' | 'seedling' | 'potted-3"' | 'potted-6"' | 'potted-12"' | 'transplanted';

export interface Plant {
  id: string;
  name: string;
  location: PlantLocation;
  seedStartDate: string;
  currentStage: GrowthStage;
  potSize: PotSize;
  quantity: number;
  daysToGermination: number;
  daysToTransplant: number;
  estimatedHarvestDate?: string;
  notes?: string;
  rackId?: number;
  shelfId?: number;
  trayId?: number;
}

export interface SeedTray {
  id: string;
  cells: number;
  occupiedCells: number;
  plantIds: string[];
  shelfId: number;
  rackId: number;
}

export interface Shelf {
  id: number;
  rackId: number;
  height: number;
  growLights: number;
  trays: SeedTray[];
  pottedPlants: string[];
  usableWidth: number;
  usableDepth: number;
}

export interface Rack {
  id: number;
  name: string;
  totalHeight: number;
  width: number;
  depth: number;
  maxCapacity: number;
  currentWeight: number;
  shelves: Shelf[];
}

export interface TentConfiguration {
  ceilingHeight: number;
  racks: Rack[];
}

export interface GrowPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tentConfiguration: TentConfiguration;
  plants: Plant[];
  season?: string;
}

export const DEFAULT_RACK_CONFIG = {
  rack1: 2,
  rack2: 4,
  rack3: 12,
};

export const RACK_DIMENSIONS = {
  height: 72,
  width: 47.7,
  depth: 18,
  maxCapacity: 2100,
};

export const TENT_CEILING_HEIGHT = 78;
export const CELLS_PER_TRAY = 72;
export const TRAYS_PER_SHELF = 4;
export const LIGHTS_PER_SHELF = 2;

export const POT_DIMENSIONS = {
  '3"': 3,
  '6"': 6,
  '12"': 12,
};
