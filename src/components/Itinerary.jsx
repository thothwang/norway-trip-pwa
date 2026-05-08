import React, { useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';

export default function Itinerary({ onSelectLocation }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/itinerary/')
      .then(res => res.json())
      .then(data => {
        setSchedule(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch itinerary", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading itinerary...</div>;

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800">Trip Schedule</h2>
      
      {schedule.map(day => (
        <div key={day.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">{day.title}</h3>
            <span className="text-xs text-gray-500 font-mono">{day.date}</span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {day.locations.map(loc => (
              <div 
                key={loc.id} 
                onClick={() => onSelectLocation(loc, day.id)}
                className="p-4 hover:bg-[#fceeed] cursor-pointer transition flex items-center gap-4 active:scale-[0.98]"
              >
                <div className="bg-[#fceeed] text-[#e85a4f] p-2 rounded-full">
                  <MapPin size={20} />
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-gray-800">{loc.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock size={12}/> {loc.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}