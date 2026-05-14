import React, { useState, useEffect } from 'react'
import { Map, Wallet, Camera, CloudUpload, CloudOff, CloudCheck, RefreshCw, Car } from 'lucide-react'
import Timeline from './components/Timeline'
import Itinerary from './components/Itinerary'
import ExpenseModal from './components/ExpenseModal'
import Budget from './components/Budget'
import NoteModal from './components/NoteModal';
import PhotoModal from './components/PhotoModal';
import { checkHasPendingData, getCurrentUserId, setCurrentUserId } from './db';
import { runGlobalSync } from './sync';
import TrafficDashboard from './components/TrafficDashboard';



function App() {
  const [currentUserId, setCurrentUserIdState] = useState(getCurrentUserId());
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Placeholder states for our future Global Sync logic
  const [isOnline, setIsOnline] = useState(true);
  const [hasUnsyncedData, setHasUnsyncedData] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  
  // Check for unsynced data whenever the app loads or data changes
  useEffect(() => {
    checkHasPendingData().then(status => setHasUnsyncedData(status));
  }, [refreshTrigger]);

  // The function that runs when you click the Cloud button
  const handleManualSync = async () => {
    if (!hasUnsyncedData) return;
    
    setIsSyncing(true);
    const result = await runGlobalSync();
    setIsSyncing(false);

    if (result === 'SUCCESS') {
      triggerRefresh(); // Refresh all UI to show the new ✅ Synced status!
    } else {
      alert("同步失敗 (Sync Failed). Please check your connection.");
    }
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleLocationAction = (loc, dayId, actionType) => {
    setSelectedLocation(loc);
    setSelectedDayId(dayId);

    if (actionType === 'expense') setIsExpenseModalOpen(true);
    else if (actionType === 'note') setIsNoteModalOpen(true);
    else if (actionType === 'photo') setIsPhotoModalOpen(true);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8f5f2] relative shadow-2xl flex flex-col overflow-hidden">
      
      <header className="bg-white px-5 pt-10 pb-4 shadow-sm z-10 flex justify-between items-center border-b border-gray-100">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Norway 2026</h1>
            {selectedLocation && activeTab === 'memories' ? (
              <p className="text-xs font-bold text-[#e85a4f] flex items-center gap-1 mt-1">
                📍 {selectedLocation.name}
              </p>
            ) : (
              <p className="text-xs font-bold text-gray-400 mt-1">
                15 Days • Offline Mode
              </p>
            )}
        </div>
        <select
          value={currentUserId}
          onChange={(e) => {
            const userId = parseInt(e.target.value, 10);
            setCurrentUserId(userId);
            setCurrentUserIdState(userId);
            triggerRefresh();
          }}
          className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 font-bold text-gray-500"
        >
          <option value={1}>TH</option>
          <option value={2}>Chun</option>
          <option value={3}>Chris</option>
          <option value={4}>03</option>
          <option value={5}>Seven</option>
          <option value={6}>Sheng</option>
          <option value={7}>Doulu</option>
          <option value={8}>Doris</option>
          <option value={9}>Julie</option>
          <option value={10}>Hwa</option>
        </select>
        <button 
          onClick={handleManualSync}
          disabled={isSyncing || !hasUnsyncedData}
          className={`p-2.5 rounded-full transition-all active:scale-95 shadow-sm 
            ${isSyncing ? 'bg-blue-50 text-blue-500' : 
              hasUnsyncedData ? 'bg-red-50 text-red-500 animate-pulse' : 
              'bg-green-50 text-green-500'}`}
        >
            {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : 
             hasUnsyncedData ? <CloudUpload size={20} /> : 
             <CloudCheck size={20} />}
        </button>
      </header>

      <main className="flex-grow overflow-y-auto pb-24 scrollbar-hide">
        {activeTab === 'itinerary' && <Itinerary onSelectLocation={handleLocationAction} refreshTrigger={refreshTrigger}/>}
        
        {activeTab === 'memories' && (
          <div className="animate-fade-in mt-4">
            <h2 className="px-5 text-2xl font-bold text-gray-800 mb-2">Travel Journal</h2>
            <Timeline refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />
          </div>
        )}
        
        {activeTab === 'budget' && <Budget refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh}/>}
        {activeTab === 'traffic' && (<TrafficDashboard />)}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-gray-100 z-50">
        <div className="flex justify-around items-center py-2">
          <button onClick={() => setActiveTab('itinerary')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'itinerary' ? 'text-[#e85a4f]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Map size={22} strokeWidth={activeTab === 'itinerary' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">行程</span>
          </button>
          <button onClick={() => setActiveTab('traffic')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'traffic' ? 'text-[#e85a4f]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Car size={22} strokeWidth={activeTab === 'traffic' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">交通</span>
          </button>
          <button onClick={() => setActiveTab('budget')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'budget' ? 'text-[#e85a4f]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Wallet size={22} strokeWidth={activeTab === 'budget' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">記帳</span>
          </button>
          <button onClick={() => setActiveTab('memories')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${activeTab === 'memories' ? 'text-[#e85a4f]' : 'text-gray-400 hover:text-gray-600'}`}>
            <Camera size={22} strokeWidth={activeTab === 'memories' ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wider">紀錄</span>
          </button>
        </div>
      </nav>

      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        location={selectedLocation} 
        onRefresh={triggerRefresh}
      />
      <NoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
        location={selectedLocation} 
        onRefresh={triggerRefresh}
      />
      <PhotoModal 
        isOpen={isPhotoModalOpen} 
        onClose={() => setIsPhotoModalOpen(false)} 
        location={selectedLocation} 
        onRefresh={triggerRefresh}
      />
    </div>
  )
}

export default App