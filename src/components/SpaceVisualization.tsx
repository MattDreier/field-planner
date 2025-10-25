import { Plant, CELLS_PER_TRAY, TRAYS_PER_SHELF } from '../types';
import { LayoutGrid, Home, Sun, Maximize2 } from 'lucide-react';

interface SpaceVisualizationProps {
  plants: Plant[];
  totalRacks?: number;
  totalShelves?: number;
}

interface SpaceStats {
  totalPlants: number;
  indoorPlants: number;
  outdoorPlants: number;
  seedCellsUsed: number;
  totalSeedCells: number;
  rackUtilization: number;
}

export default function SpaceVisualization({
  plants,
  totalRacks = 3,
  totalShelves = 18
}: SpaceVisualizationProps) {

  // Calculate space statistics
  const calculateStats = (): SpaceStats => {
    const totalPlants = plants.length;
    const indoorPlants = plants.filter(p => p.location === 'indoor').length;
    const outdoorPlants = plants.filter(p => p.location === 'outdoor').length;

    // Calculate seed cells used (plants in seed stage)
    const plantsInSeedStage = plants.filter(p => p.currentStage === 'seed');
    const seedCellsUsed = plantsInSeedStage.reduce((sum, p) => sum + p.quantity, 0);
    const totalSeedCells = totalShelves * TRAYS_PER_SHELF * CELLS_PER_TRAY;

    // Calculate rack utilization (simplified - based on indoor plants)
    const maxPlantsPerShelf = 20; // Approximate capacity
    const maxIndoorPlants = totalShelves * maxPlantsPerShelf;
    const rackUtilization = maxIndoorPlants > 0 ? (indoorPlants / maxIndoorPlants) * 100 : 0;

    return {
      totalPlants,
      indoorPlants,
      outdoorPlants,
      seedCellsUsed,
      totalSeedCells,
      rackUtilization,
    };
  };

  const stats = calculateStats();
  const seedCellPercentage = stats.totalSeedCells > 0
    ? (stats.seedCellsUsed / stats.totalSeedCells) * 100
    : 0;

  const ProgressBar = ({
    percentage,
    color,
    label,
    current,
    total
  }: {
    percentage: number;
    color: string;
    label: string;
    current: number;
    total: number;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {current} / {total} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
  }) => (
    <div className={`${color} rounded-lg p-4 flex items-center gap-3`}>
      <div className="p-3 bg-white bg-opacity-30 rounded-lg">
        <Icon size={24} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="text-white text-opacity-90 text-sm font-medium">{label}</div>
        <div className="text-white text-2xl font-bold">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="text-purple-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Space Utilization</h2>
        </div>
        <p className="text-sm text-gray-600">
          Track your grow tent capacity and optimize space usage
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={LayoutGrid}
          label="Total Plants"
          value={stats.totalPlants}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          icon={Home}
          label="Indoor Plants"
          value={stats.indoorPlants}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Sun}
          label="Outdoor Plants"
          value={stats.outdoorPlants}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      {/* Progress Bars */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Capacity Overview</h3>

        <ProgressBar
          label="Seed Cell Usage"
          percentage={seedCellPercentage}
          current={stats.seedCellsUsed}
          total={stats.totalSeedCells}
          color={
            seedCellPercentage < 50
              ? 'bg-green-500'
              : seedCellPercentage < 80
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }
        />

        <ProgressBar
          label="Rack Utilization"
          percentage={stats.rackUtilization}
          current={stats.indoorPlants}
          total={totalShelves * 20}
          color={
            stats.rackUtilization < 50
              ? 'bg-blue-500'
              : stats.rackUtilization < 80
              ? 'bg-yellow-500'
              : 'bg-orange-500'
          }
        />

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Maximize2 size={16} className="text-gray-500" />
              <span className="text-gray-600">Racks:</span>
              <span className="font-semibold text-gray-800">{totalRacks}</span>
            </div>
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-gray-500" />
              <span className="text-gray-600">Shelves:</span>
              <span className="font-semibold text-gray-800">{totalShelves}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {seedCellPercentage > 90 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 rounded-lg p-2">
              <LayoutGrid className="text-red-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-red-900 mb-1">High Seed Cell Usage</h4>
              <p className="text-sm text-red-700">
                You're using over 90% of your seed cell capacity. Consider transplanting or
                adding more seed trays to accommodate new plants.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.rackUtilization > 85 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <Maximize2 className="text-orange-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">High Rack Utilization</h4>
              <p className="text-sm text-orange-700">
                Your grow racks are at {stats.rackUtilization.toFixed(1)}% capacity.
                Consider moving some plants outdoors or expanding your indoor space.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
