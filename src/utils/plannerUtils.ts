import {
  Rack,
  Shelf,
  TentConfiguration,
  GrowPlan,
  Plant,
  DEFAULT_RACK_CONFIG,
  RACK_DIMENSIONS,
  TENT_CEILING_HEIGHT,
  CELLS_PER_TRAY,
  TRAYS_PER_SHELF,
  LIGHTS_PER_SHELF,
  POT_DIMENSIONS,
  PotSize
} from '../types';

export function createDefaultRack(id: number, name: string, shelfCount: number): Rack {
  const shelves: Shelf[] = [];
  const shelfSpacing = RACK_DIMENSIONS.height / (shelfCount + 1);

  for (let i = 0; i < shelfCount; i++) {
    shelves.push({
      id: i,
      rackId: id,
      height: Math.round(shelfSpacing * (i + 1)),
      growLights: LIGHTS_PER_SHELF,
      trays: [],
      pottedPlants: [],
      usableWidth: RACK_DIMENSIONS.width,
      usableDepth: RACK_DIMENSIONS.depth,
    });
  }

  return {
    id,
    name,
    totalHeight: RACK_DIMENSIONS.height,
    width: RACK_DIMENSIONS.width,
    depth: RACK_DIMENSIONS.depth,
    maxCapacity: RACK_DIMENSIONS.maxCapacity,
    currentWeight: 0,
    shelves,
  };
}

export function createDefaultTentConfiguration(): TentConfiguration {
  return {
    ceilingHeight: TENT_CEILING_HEIGHT,
    racks: [
      createDefaultRack(1, 'Rack 1', DEFAULT_RACK_CONFIG.rack1),
      createDefaultRack(2, 'Rack 2', DEFAULT_RACK_CONFIG.rack2),
      createDefaultRack(3, 'Rack 3 (Seed Starting)', DEFAULT_RACK_CONFIG.rack3),
    ],
  };
}

export function createNewPlan(name: string, description?: string): GrowPlan {
  const now = new Date().toISOString();
  const timestamp = new Date().getTime();
  return {
    id: "plan-" + timestamp,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    tentConfiguration: createDefaultTentConfiguration(),
    plants: [],
  };
}

export function calculateCellsNeeded(quantity: number): number {
  return quantity;
}

export function calculateTraysNeeded(totalCells: number): number {
  return Math.ceil(totalCells / CELLS_PER_TRAY);
}

export function calculatePotCapacity(shelf: Shelf, potSize: PotSize): number {
  if (potSize === 'tray') {
    return TRAYS_PER_SHELF;
  }

  const potDiameter = POT_DIMENSIONS[potSize];
  const potsPerRow = Math.floor(shelf.usableWidth / potDiameter);
  const rows = Math.floor(shelf.usableDepth / potDiameter);
  return potsPerRow * rows;
}

export function calculateAvailableSeedCells(rack: Rack): number {
  let total = 0;
  rack.shelves.forEach(shelf => {
    const availableTrays = TRAYS_PER_SHELF - shelf.trays.length;
    total += availableTrays * CELLS_PER_TRAY;
    shelf.trays.forEach(tray => {
      total += (tray.cells - tray.occupiedCells);
    });
  });
  return total;
}

export function getPlantsByLocation(plants: Plant[], location: 'indoor' | 'outdoor'): Plant[] {
  return plants.filter(p => p.location === location);
}

export function calculateSpaceUsage(plan: GrowPlan): {
  seedCells: { used: number; total: number; percentage: number };
  racks: Array<{ rackId: number; used: number; total: number; percentage: number }>;
} {
  const seedStartingRack = plan.tentConfiguration.racks.find(r => r.id === 3);

  let totalCells = 0;
  let usedCells = 0;

  if (seedStartingRack) {
    seedStartingRack.shelves.forEach(shelf => {
      totalCells += TRAYS_PER_SHELF * CELLS_PER_TRAY;
      shelf.trays.forEach(tray => {
        usedCells += tray.occupiedCells;
      });
    });
  }

  const racks = plan.tentConfiguration.racks.map(rack => {
    const totalShelves = rack.shelves.length;
    const usedShelves = rack.shelves.filter(s =>
      s.trays.length > 0 || s.pottedPlants.length > 0
    ).length;

    return {
      rackId: rack.id,
      used: usedShelves,
      total: totalShelves,
      percentage: totalShelves > 0 ? Math.round((usedShelves / totalShelves) * 100) : 0,
    };
  });

  return {
    seedCells: {
      used: usedCells,
      total: totalCells,
      percentage: totalCells > 0 ? Math.round((usedCells / totalCells) * 100) : 0,
    },
    racks,
  };
}

export function savePlanToStorage(plan: GrowPlan): void {
  const plans = loadAllPlansFromStorage();
  const existingIndex = plans.findIndex(p => p.id === plan.id);

  if (existingIndex >= 0) {
    plans[existingIndex] = { ...plan, updatedAt: new Date().toISOString() };
  } else {
    plans.push(plan);
  }

  localStorage.setItem('growPlans', JSON.stringify(plans));
}

export function loadAllPlansFromStorage(): GrowPlan[] {
  const stored = localStorage.getItem('growPlans');
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error loading plans:', e);
    return [];
  }
}

export function loadPlanFromStorage(planId: string): GrowPlan | null {
  const plans = loadAllPlansFromStorage();
  return plans.find(p => p.id === planId) || null;
}

export function deletePlanFromStorage(planId: string): void {
  const plans = loadAllPlansFromStorage();
  const filtered = plans.filter(p => p.id !== planId);
  localStorage.setItem('growPlans', JSON.stringify(filtered));
}

export function updateRackConfiguration(
  plan: GrowPlan,
  rackId: number,
  newShelfCount: number
): GrowPlan {
  const updatedRacks = plan.tentConfiguration.racks.map(rack => {
    if (rack.id === rackId) {
      return createDefaultRack(rackId, rack.name, newShelfCount);
    }
    return rack;
  });

  return {
    ...plan,
    tentConfiguration: {
      ...plan.tentConfiguration,
      racks: updatedRacks,
    },
    updatedAt: new Date().toISOString(),
  };
}
