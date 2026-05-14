import React, { useState, useEffect } from 'react';
import { Car, Ship, AlertTriangle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function TrafficDashboard() {
  const [schedule, setSchedule] = useState([]);
  const [activeDayId, setActiveDayId] = useState(null);
  const [trafficData, setTrafficData] = useState({ roads: [], ferries: [] });
  const [loading, setLoading] = useState(true);

  // 1. Load the overarching schedule for the Day Tabs
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/itinerary/`)
      .then(res => res.json())
      .then(data => {
        setSchedule(data);
        if (data.length > 0) setActiveDayId(data[0].id);
      })
      .catch(err => console.error("Schedule Load Error:", err));
  }, []);

  // 2. Fetch live Traffic/Ferry data when the active day changes
  useEffect(() => {
    if (!activeDayId) return;
    setLoading(true);
    
    fetch(`${API_BASE_URL}/api/traffic/status/${activeDayId}`)
      .then(res => res.json())
      .then(data => {
        setTrafficData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Traffic API Error:", err);
        setLoading(false);
      });
  }, [activeDayId]);

  if (schedule.length === 0) return <div className="p-8 text-center">載入行程中...</div>;

  return (
    <div className="pb-24 animate-fade-in bg-[#f8f5f2] min-h-screen">
      {/* --- DAY SELECTOR (Unified UI) --- */}
      <div className="sticky top-0 z-30 bg-[#f8f5f2]/95 backdrop-blur-md pt-4 pb-4 shadow-sm">
        <div className="flex overflow-x-auto gap-3 px-4 scrollbar-hide">
          {schedule.map((day, index) => (
            <button 
              key={day.id} 
              onClick={() => setActiveDayId(day.id)}
              className={`flex-shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${activeDayId === day.id ? 'bg-[#e85a4f] text-white shadow-lg scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              <span className="text-[10px] font-black uppercase">Day {index + 1}</span>
              <span className="text-xl font-bold">{day.date.split('-')[2]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-6">
        {/* --- SECTION A: ROAD STATUS (路況) --- */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Car size={20} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-800">當日路況監報 (Road Alerts)</h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-pulse text-gray-400 text-center">掃描挪威路網中...</div>
          ) : trafficData.roads.length > 0 ? (
            <div className="space-y-3">
                {trafficData.roads.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-3xl border-l-8 shadow-sm flex gap-4 ${alert.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-400'}`}>
                    <AlertTriangle className={alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'} size={24} />
                    
                    <div className="flex-1"> {/* 使用 flex-1 讓內容撐滿 */}
                    <div className="flex items-center justify-between"> {/* 使用 justify-between 讓時間靠右 */}
                        <div className="flex items-center gap-2">
                        <span className="font-black text-xs bg-black text-white px-2 py-0.5 rounded">{alert.road}</span>
                        <span className="font-bold text-gray-800 text-sm">{alert.type}</span>
                        </div>
                        
                        {/* 發布時間放在這裡，字體小一點，灰色的比較優雅 */}
                        <span className="text-[10px] text-gray-400 font-medium">
                        {alert.time}
                        </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed italic">
                        {alert.description}
                    </p>
                    </div>
                </div>
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <CheckCircle2 className="text-green-500" size={32} />
              <div>
                <p className="font-bold text-gray-800">一路暢通 (All Clear)</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">No incidents reported on your route.</p>
              </div>
            </div>
          )}
        </section>

        {/* --- SECTION B: FERRIES (即時渡輪) --- */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Ship size={20} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-800">渡輪即時時刻 (Live Ferries)</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {trafficData.ferries.length > 0 ? (
              trafficData.ferries.map((f, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-gray-800 text-lg uppercase tracking-tight">{f.route}</h3>
                      <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <MapPin size={10} /> {f.station}
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">Live</span>
                  </div>

                  <div className="space-y-3">
                    {f.departures?.map((dep, dIdx) => (
                      <div key={dIdx} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-blue-500" />
                          <span className="text-lg font-black text-gray-800">{dep.time}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-500">➔ {dep.to}</span>
                      </div>
                    ))}
                    {(!f.departures || f.departures.length === 0) && (
                        <p className="text-center py-4 text-gray-400 text-sm font-medium">暫無近期班次資料</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm italic py-4">本日行程不包含渡輪航線</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}