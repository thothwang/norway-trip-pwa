import React, { useState } from 'react'
import { Map, Wallet, Camera } from 'lucide-react'
import Memories from './components/Memories'
import Timeline from './components/Timeline'
import Itinerary from './components/Itinerary'

function App() {
  const [activeTab, setActiveTab] = useState('itinerary'); // Start on the Itinerary tab
  
  // 2. Global state to track where we are
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(1);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // 3. The function that runs when you click a location
  const handleLocationSelect = (loc, dayId) => {
    setSelectedLocation(loc);
    setSelectedDayId(dayId);
    setActiveTab('memories'); // Instantly switch to the camera tab!
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8f5f2] relative shadow-2xl flex flex-col">
      <header className="bg-[#e85a4f] text-white p-4 pt-8 shadow-md z-10 flex justify-between items-end">
        <div>
            <h1 className="text-2xl font-bold">Norway 2026</h1>
            <p className="text-sm opacity-90">Offline Mode Active</p>
        </div>
        {/* Visual indicator of where we are */}
        {selectedLocation && activeTab === 'memories' && (
            <div className="text-right text-sm font-bold bg-white/20 px-2 py-1 rounded">
                📍 {selectedLocation.name}
            </div>
        )}
      </header>

      <main className="flex-grow overflow-y-auto pb-24">
        {activeTab === 'itinerary' && <Itinerary onSelectLocation={handleLocationSelect} />}
        
        {activeTab === 'memories' && (
          <div className="animate-fade-in">
            {/* 2. Pass a function to Memories to trigger the refresh */}
            <Memories 
              selectedLocation={selectedLocation} 
              onSyncComplete={() => setRefreshTrigger(prev => prev + 1)} 
            />
            
            <div className="w-full h-2 bg-gray-200/50 my-2"></div>
            
            {/* 3. Pass the trigger to the Timeline */}
            <Timeline 
              dayId={selectedDayId} 
              refreshTrigger={refreshTrigger} 
            />
          </div>
        )}
        
        {activeTab === 'budget' && <div className="p-4 text-center">Budget Coming Soon</div>}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 z-50">
        <div className="flex justify-around items-center py-3">
          <button onClick={() => setActiveTab('itinerary')} className={`flex flex-col items-center gap-1 ${activeTab === 'itinerary' ? 'text-[#e85a4f]' : 'text-gray-400'}`}>
            <Map size={24} />
            <span className="text-[10px] font-bold">Itinerary</span>
          </button>
          <button onClick={() => setActiveTab('budget')} className={`flex flex-col items-center gap-1 ${activeTab === 'budget' ? 'text-[#e85a4f]' : 'text-gray-400'}`}>
            <Wallet size={24} />
            <span className="text-[10px] font-bold">Budget</span>
          </button>
          <button onClick={() => setActiveTab('memories')} className={`flex flex-col items-center gap-1 ${activeTab === 'memories' ? 'text-[#e85a4f]' : 'text-gray-400'}`}>
            <Camera size={24} />
            <span className="text-[10px] font-bold">Memories</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App