import { useState } from 'react';
import { TentConfiguration } from '../types';
import { Settings, Save, X } from 'lucide-react';

interface RackConfigurationProps {
  tentConfig: TentConfiguration;
  onUpdate: (updatedConfig: TentConfiguration) => void;
}

export default function RackConfiguration({ tentConfig, onUpdate }: RackConfigurationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedShelves, setEditedShelves] = useState<Record<number, number>>({});

  const handleEdit = () => {
    const initial: Record<number, number> = {};
    tentConfig.racks.forEach(rack => {
      initial[rack.id] = rack.shelves.length;
    });
    setEditedShelves(initial);
    setIsEditing(true);
  };

  const handleSave = () => {
    const updatedRacks = tentConfig.racks.map(rack => {
      const newShelfCount = editedShelves[rack.id];
      if (newShelfCount && newShelfCount !== rack.shelves.length) {
        const shelves = [];
        const shelfSpacing = rack.totalHeight / (newShelfCount + 1);
        for (let i = 0; i < newShelfCount; i++) {
          shelves.push({ id: i, rackId: rack.id, height: Math.round(shelfSpacing * (i + 1)), growLights: 2, trays: [], pottedPlants: [], usableWidth: rack.width, usableDepth: rack.depth });
        }
        return { ...rack, shelves };
      }
      return rack;
    });
    onUpdate({ ...tentConfig, racks: updatedRacks });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedShelves({});
  };

  const handleShelfCountChange = (rackId: number, count: number) => {
    setEditedShelves(prev => ({ ...prev, [rackId]: Math.max(1, Math.min(20, count)) }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Rack Configuration</h2>
        {!isEditing ? (
          <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Settings size={18} />Configure
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <Save size={18} />Save
            </button>
            <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
              <X size={18} />Cancel
            </button>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {tentConfig.racks.map(rack => (
          <div key={rack.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-semibold text-gray-700">{rack.name}</h3>
                <p className="text-sm text-gray-500">{rack.width}" W × {rack.depth}" D × {rack.totalHeight}" H</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Shelves:</label>
                  <input type="number" min="1" max="20" value={editedShelves[rack.id]} onChange={(e) => handleShelfCountChange(rack.id, parseInt(e.target.value))} className="w-20 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ) : (
                <span className="text-lg font-semibold text-blue-600">{rack.shelves.length} shelves</span>
              )}
            </div>
            {!isEditing && (
              <div className="mt-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Capacity:</span><span className="font-medium">{rack.maxCapacity} lbs</span></div>
                <div className="flex justify-between"><span>Grow Lights:</span><span className="font-medium">{rack.shelves.length * 2} total</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Tent Specs</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Ceiling Height: {tentConfig.ceilingHeight}" (6.5 ft)</p>
          <p>Total Racks: {tentConfig.racks.length}</p>
          <p>Total Shelves: {tentConfig.racks.reduce((sum, r) => sum + r.shelves.length, 0)}</p>
        </div>
      </div>
    </div>
  );
}
