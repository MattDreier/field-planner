import { useState } from 'react';
import { Plant, PlantLocation, PotSize } from '../types';
import { Plus } from 'lucide-react';

interface PlantFormProps {
  onAddPlant: (plant: Plant) => void;
}

export default function PlantForm({ onAddPlant }: PlantFormProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substr(2, 9);
    const plant: Plant = {
      id: `plant-${timestamp}-${random}`,
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
    setFormData({
      ...formData,
      name: '',
      quantity: 1,
      notes: '',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Plant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plant Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Tomato, Basil" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value as PlantLocation })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seed Start Date *</label>
            <input type="date" required value={formData.seedStartDate} onChange={(e) => setFormData({ ...formData, seedStartDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days to Germination</label>
            <input type="number" min="1" value={formData.daysToGermination} onChange={(e) => setFormData({ ...formData, daysToGermination: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days to Transplant</label>
            <input type="number" min="1" value={formData.daysToTransplant} onChange={(e) => setFormData({ ...formData, daysToTransplant: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Pot Size</label>
            <select value={formData.potSize} onChange={(e) => setFormData({ ...formData, potSize: e.target.value as PotSize })} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="3&quot;">3"</option>
              <option value="6&quot;">6"</option>
              <option value="12&quot;">12"</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." />
        </div>
        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
          <Plus size={20} />Add Plant
        </button>
      </form>
    </div>
  );
}
