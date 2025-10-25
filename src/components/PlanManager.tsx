import { useState } from 'react';
import { GrowPlan } from '../types';
import { Save, FolderOpen, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface PlanManagerProps {
  currentPlan: GrowPlan;
  savedPlans: GrowPlan[];
  onSavePlan: (plan: GrowPlan) => void;
  onLoadPlan: (plan: GrowPlan) => void;
  onCreateNewPlan: () => void;
  onDeletePlan: (planId: string) => void;
  onUpdatePlanName: (name: string) => void;
  onUpdatePlanDescription: (description: string) => void;
}

export default function PlanManager({
  currentPlan,
  savedPlans,
  onSavePlan,
  onLoadPlan,
  onCreateNewPlan,
  onDeletePlan,
  onUpdatePlanName,
  onUpdatePlanDescription,
}: PlanManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [editName, setEditName] = useState(currentPlan.name);
  const [editDescription, setEditDescription] = useState(currentPlan.description || '');

  const handleSave = () => {
    if (isEditing) {
      onUpdatePlanName(editName);
      onUpdatePlanDescription(editDescription);
      setIsEditing(false);
    }
    onSavePlan(currentPlan);
  };

  const handleEdit = () => {
    setEditName(currentPlan.name);
    setEditDescription(currentPlan.description || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(currentPlan.name);
    setEditDescription(currentPlan.description || '');
    setIsEditing(false);
  };

  const handleLoadPlan = (plan: GrowPlan) => {
    onLoadPlan(plan);
    setShowSavedPlans(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={24} />
              <h2 className="text-xl font-bold">Current Grow Plan</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition"
                title="Save plan"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={onCreateNewPlan}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition"
                title="Create new plan"
              >
                <Plus size={18} />
                New
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Grow Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add a description for your grow plan..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{currentPlan.name}</h3>
                {currentPlan.description && (
                  <p className="text-gray-600 mt-2">{currentPlan.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="flex items-center gap-2 text-gray-800 font-medium mt-1">
                    <Calendar size={16} />
                    {formatDate(currentPlan.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Last Updated</div>
                  <div className="flex items-center gap-2 text-gray-800 font-medium mt-1">
                    <Calendar size={16} />
                    {formatDate(currentPlan.updatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Plants</div>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {currentPlan.plants.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Racks</div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">
                    {currentPlan.tentConfiguration.racks.length}
                  </div>
                </div>
              </div>

              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition mt-4"
              >
                Edit Plan Details
              </button>
            </>
          )}
        </div>
      </div>

      {/* Saved Plans Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setShowSavedPlans(!showSavedPlans)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="text-indigo-600" size={24} />
            <h3 className="text-lg font-bold text-gray-800">
              Saved Plans ({savedPlans.length})
            </h3>
          </div>
          <span className="text-gray-500">
            {showSavedPlans ? 'Hide' : 'Show'}
          </span>
        </button>

        {showSavedPlans && (
          <div className="border-t border-gray-200">
            {savedPlans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderOpen className="mx-auto mb-3 text-gray-400" size={48} />
                <p>No saved plans yet</p>
                <p className="text-sm mt-1">Save your current plan to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{plan.name}</h4>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{plan.plants.length} plants</span>
                        <span>Updated {formatDate(plan.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleLoadPlan(plan)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                        disabled={plan.id === currentPlan.id}
                      >
                        {plan.id === currentPlan.id ? 'Current' : 'Load'}
                      </button>
                      <button
                        onClick={() => onDeletePlan(plan.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete plan"
                        disabled={plan.id === currentPlan.id}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
