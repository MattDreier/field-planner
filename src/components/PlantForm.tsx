import { useState } from 'react';
import { Plant, PlantLocation, PotSize } from '../types';
import { Plus, X, Info, Flower2 } from 'lucide-react';
import { getAllFlowers, getFlowerById, FlowerData } from '../data/flowers';

interface PlantFormProps {
  onAddPlant: (plant: Plant) => void;
  onClose?: () => void;
}

export default function PlantForm({ onAddPlant, onClose }: PlantFormProps) {
  const [selectedFlowerId, setSelectedFlowerId] = useState<string>('');
  const [selectedFlower, setSelectedFlower] = useState<FlowerData | null>(null);
  const [showFlowerInfo, setShowFlowerInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: 'indoor' as PlantLocation,
    seedStartDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    daysToGermination: 7,
    daysToTransplant: 21,
    potSize: '3"' as PotSize,
    notes: '',
  });

  const allFlowers = getAllFlowers();

  const handleFlowerSelect = (flowerId: string) => {
    setSelectedFlowerId(flowerId);

    if (flowerId === '') {
      // Custom plant
      setSelectedFlower(null);
      setShowFlowerInfo(false);
      setFormData({
        name: '',
        location: 'indoor',
        seedStartDate: new Date().toISOString().split('T')[0],
        quantity: 1,
        daysToGermination: 7,
        daysToTransplant: 21,
        potSize: '3"',
        notes: '',
      });
    } else {
      const flower = getFlowerById(flowerId);
      if (flower) {
        setSelectedFlower(flower);
        setShowFlowerInfo(true);
        // Auto-fill form with flower data
        setFormData({
          name: flower.name,
          location: 'indoor', // Default, user can change
          seedStartDate: new Date().toISOString().split('T')[0],
          quantity: 1,
          daysToGermination: flower.daysToGermination || 7,
          daysToTransplant: flower.daysToHarvest || 21,
          potSize: '3"', // Default, user can change
          notes: flower.specialNotes || '',
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const plant: Plant = {
      id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name,
      location: formData.location,
      seedStartDate: new Date(formData.seedStartDate).toISOString(),
      currentStage: 'seed',
      potSize: formData.potSize,
      quantity: formData.quantity,
      daysToGermination: formData.daysToGermination,
      daysToTransplant: formData.daysToTransplant,
      notes: formData.notes,
    };

    onAddPlant(plant);

    // Reset form
    setSelectedFlowerId('');
    setSelectedFlower(null);
    setShowFlowerInfo(false);
    setFormData({
      name: '',
      location: 'indoor',
      seedStartDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      daysToGermination: 7,
      daysToTransplant: 21,
      potSize: '3"',
      notes: '',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Add New Plant</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Flower Selection Dropdown */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Flower2 size={18} className="text-purple-600" />
            Select from Flower Database (or choose Custom)
          </label>
          <select
            value={selectedFlowerId}
            onChange={(e) => handleFlowerSelect(e.target.value)}
            className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">Custom Plant (Enter Manually)</option>
            <optgroup label="Cut Flowers">
              {allFlowers.map(flower => (
                <option key={flower.id} value={flower.id}>{flower.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Flower Information Display */}
        {selectedFlower && showFlowerInfo && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <Info size={18} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-2">Growing Information for {selectedFlower.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                  <div><span className="font-medium">Germination:</span> {selectedFlower.daysToGermination}{selectedFlower.daysToGerminationMax ? `-${selectedFlower.daysToGerminationMax}` : ''} days</div>
                  <div><span className="font-medium">Harvest:</span> {selectedFlower.daysToHarvest}{selectedFlower.daysToHarvestMax ? `-${selectedFlower.daysToHarvestMax}` : ''} days</div>
                  <div><span className="font-medium">Height:</span> {selectedFlower.heightMin}-{selectedFlower.heightMax}"</div>
                  <div><span className="font-medium">Spacing:</span> {selectedFlower.spacingMin}-{selectedFlower.spacingMax}"</div>
                  <div><span className="font-medium">Light:</span> {selectedFlower.lightRequirements}</div>
                  <div><span className="font-medium">Vase Life:</span> {selectedFlower.vaseLifeDays}{selectedFlower.vaseLifeDaysMax ? `-${selectedFlower.vaseLifeDaysMax}` : ''} days</div>
                  {selectedFlower.cutAndComeAgain && (
                    <div className="col-span-2 bg-green-100 px-2 py-1 rounded"><span className="font-medium text-green-800">✓ Cut-and-Come-Again:</span> {selectedFlower.cutAndComeAgainNotes}</div>
                  )}
                </div>
                {selectedFlower.specialNotes && (
                  <div className="mt-2 text-xs text-gray-600 italic border-t pt-2">
                    <span className="font-medium">Note:</span> {selectedFlower.specialNotes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plant Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Tomato, Basil"
              disabled={!!selectedFlower}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <select
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value as PlantLocation })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seed Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.seedStartDate}
              onChange={(e) => setFormData({ ...formData, seedStartDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days to Germination
            </label>
            <input
              type="number"
              min="1"
              value={formData.daysToGermination}
              onChange={(e) => setFormData({ ...formData, daysToGermination: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days to Transplant
            </label>
            <input
              type="number"
              min="1"
              value={formData.daysToTransplant}
              onChange={(e) => setFormData({ ...formData, daysToTransplant: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Pot Size
            </label>
            <select
              value={formData.potSize}
              onChange={(e) => setFormData({ ...formData, potSize: e.target.value as PotSize })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3&quot;">3"</option>
              <option value="6&quot;">6"</option>
              <option value="12&quot;">12"</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about this plant..."
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          <Plus size={20} />
          Add Plant
        </button>
      </form>
    </div>
  );
}
