import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

export default function Timeline({ dayId = 1, refreshTrigger = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/journal/day/${dayId}`);
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch timeline", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [dayId, refreshTrigger]);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading memories...</div>;
  if (!data || data.memories.length === 0) return <div className="p-8 text-center text-gray-500">No memories synced for this day yet.</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{data.title}</h2>
        <p className="text-sm text-gray-500 font-mono">{data.date}</p>
      </div>

      <div className="relative pl-4 space-y-8">
        {/* The vertical timeline line */}
        <div className="absolute left-[23px] top-2 bottom-0 w-0.5 bg-gray-200 z-0"></div>

        {data.memories.map((mem) => (
          <div key={mem.id} className="relative z-10 pl-6">
            {/* The Timeline Dot */}
            <div className="absolute left-[-11px] top-1 bg-white border-4 border-[#e85a4f] w-5 h-5 rounded-full"></div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white bg-[#e85a4f] px-2 py-0.5 rounded-full">{mem.time}</span>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1">
                <MapPin size={16} className="text-gray-400"/> {mem.name}
              </h3>
            </div>

            {/* Render Notes */}
            {mem.notes.map((note, idx) => (
              <div key={idx} className="bg-yellow-50 p-3 rounded-xl text-sm text-gray-700 italic border border-yellow-100 mb-3 shadow-sm">
                "{note}"
              </div>
            ))}

            {/* Render Photos Grid */}
            {mem.photos.length > 0 && (
              <div className={`grid gap-2 ${mem.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {mem.photos.map((url, idx) => (
                  <img key={idx} src={`${url}?t=${refreshTrigger}`} alt="Memory" className="w-full h-32 object-cover rounded-xl shadow-sm border border-gray-100" loading="lazy" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}