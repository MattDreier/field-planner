import { useState, useEffect } from 'react';
import { GrowPlan, Plant } from './types';
import { createNewPlan, savePlanToStorage, loadAllPlansFromStorage, deletePlanFromStorage } from './utils/plannerUtils';
import PlanManager from './components/PlanManager';
import RackConfiguration from './components/RackConfiguration';
import PlantForm from './components/PlantForm';
import PlantList from './components/PlantList';
import CalendarView from './components/CalendarView';
import SpaceVisualization from './components/SpaceVisualization';
import { Sprout, Settings, Calendar, BarChart3, List } from 'lucide-react';

type View = 'planner' | 'calendar' | 'space' | 'config';

function App() {
  const [currentPlan, setCurrentPlan] = useState<GrowPlan>(() => createNewPlan('My First Plan'));
  const [savedPlans, setSavedPlans] = useState<GrowPlan[]>([]);
  const [activeView, setActiveView] = useState<View>('planner');

  useEffect(() => {
    const plans = loadAllPlansFromStorage();
    setSavedPlans(plans);
  }, []);

  const handleAddPlant = (plant: Plant) => {
    const updatedPlan = { ...currentPlan, plants: [...currentPlan.plants, plant], updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);
  };

  const handleDeletePlant = (plantId: string) => {
    const updatedPlan = { ...currentPlan, plants: currentPlan.plants.filter(p => p.id !== plantId), updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);
  };

  const handleUpdateConfig = (updatedConfig: any) => {
    const updatedPlan = { ...currentPlan, tentConfiguration: updatedConfig, updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);
  };

  const handleSavePlan = (plan: GrowPlan) => {
    savePlanToStorage(plan);
    setSavedPlans(loadAllPlansFromStorage());
  };

  const handleLoadPlan = (plan: GrowPlan) => {
    setCurrentPlan(plan);
  };

  const handleCreateNewPlan = () => {
    const newPlan = createNewPlan('New Plan');
    setCurrentPlan(newPlan);
    savePlanToStorage(newPlan);
    setSavedPlans(loadAllPlansFromStorage());
  };

  const handleDeletePlan = (planId: string) => {
    deletePlanFromStorage(planId);
    setSavedPlans(loadAllPlansFromStorage());
    if (currentPlan.id === planId) {
      handleCreateNewPlan();
    }
  };

  const handleUpdatePlanName = (name: string) => {
    const updatedPlan = { ...currentPlan, name, updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);
  };

  const handleUpdatePlanDescription = (description: string) => {
    const updatedPlan = { ...currentPlan, description, updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);
  };

  const totalShelves = currentPlan.tentConfiguration.racks.reduce((sum, r) => sum + r.shelves.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Sprout size={32} className="text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grow Tent Planner</h1>
              <p className="text-sm text-gray-600">Plan, schedule, and optimize your grow space</p>
            </div>
          </div>
        </div>
      </header>
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            <button onClick={() => setActiveView('planner')} className={"flex items-center gap-2 px-4 py-3 font-medium transition " + (activeView === 'planner' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900')}><List size={18} />Planner</button>
            <button onClick={() => setActiveView('calendar')} className={"flex items-center gap-2 px-4 py-3 font-medium transition " + (activeView === 'calendar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900')}><Calendar size={18} />Calendar</button>
            <button onClick={() => setActiveView('space')} className={"flex items-center gap-2 px-4 py-3 font-medium transition " + (activeView === 'space' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900')}><BarChart3 size={18} />Space</button>
            <button onClick={() => setActiveView('config')} className={"flex items-center gap-2 px-4 py-3 font-medium transition " + (activeView === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900')}><Settings size={18} />Config</button>
          </nav>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PlanManager 
            currentPlan={currentPlan}
            savedPlans={savedPlans}
            onSavePlan={handleSavePlan}
            onLoadPlan={handleLoadPlan}
            onCreateNewPlan={handleCreateNewPlan}
            onDeletePlan={handleDeletePlan}
            onUpdatePlanName={handleUpdatePlanName}
            onUpdatePlanDescription={handleUpdatePlanDescription}
          />
          {activeView === 'planner' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PlantForm onAddPlant={handleAddPlant} />
              <PlantList plants={currentPlan.plants} onDeletePlant={handleDeletePlant} />
            </div>
          )}
          {activeView === 'calendar' && <CalendarView plants={currentPlan.plants} />}
          {activeView === 'space' && <SpaceVisualization plants={currentPlan.plants} totalRacks={3} totalShelves={totalShelves} />}
          {activeView === 'config' && <RackConfiguration tentConfig={currentPlan.tentConfiguration} onUpdate={handleUpdateConfig} />}
        </div>
      </main>
      <footer className="mt-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">Grow Tent Planner</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
