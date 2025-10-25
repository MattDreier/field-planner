import { Plant } from '../types';
import { formatDate, calculateGerminationDate, calculateTransplantDate } from '../utils/dateUtils';
import { Trash2, Sprout, Droplets, MapPin } from 'lucide-react';

interface PlantListProps {
  plants: Plant[];
  onDeletePlant: (id: string) => void;
}

export default function PlantList({ plants, onDeletePlant }: PlantListProps) {
  if (plants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Sprout className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Plants Yet</h3>
        <p className="text-gray-500">Add your first plant to get started with your grow plan!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Plant List</h2>
        <p className="text-sm text-gray-600 mt-1">{plants.length} plant{plants.length !== 1 ? 's' : ''} in your grow plan</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plant Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seed Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Germination</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transplant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plants.map((plant) => {
              const germinationDate = calculateGerminationDate(plant.seedStartDate, plant.daysToGermination);
              const transplantDate = calculateTransplantDate(plant.seedStartDate, plant.daysToTransplant);

              return (
                <tr key={plant.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Sprout className="text-green-600 mr-2" size={18} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{plant.name}</div>
                        {plant.notes && (
                          <div className="text-xs text-gray-500 mt-1">{plant.notes}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plant.location === 'indoor'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      <MapPin size={12} className="mr-1" />
                      {plant.location === 'indoor' ? 'Indoor' : 'Outdoor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plant.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(plant.seedStartDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Droplets size={14} className="text-blue-500 mr-1" />
                      {formatDate(germinationDate)}
                      <span className="text-xs text-gray-500 ml-1">({plant.daysToGermination}d)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transplantDate)}
                    <span className="text-xs text-gray-500 ml-1">({plant.daysToTransplant}d)</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {plant.currentStage.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onDeletePlant(plant.id)}
                      className="text-red-600 hover:text-red-900 transition p-2 hover:bg-red-50 rounded-lg"
                      title="Delete plant"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
