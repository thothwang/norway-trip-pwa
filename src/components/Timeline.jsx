import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Image as ImageIcon, Trash2, Edit3 } from 'lucide-react';
import { getAllNotes, getAllPhotos, deleteOfflinePhoto, getAllCheckIns } from '../db';
import NoteModal from './NoteModal';

export default function Timeline({ refreshTrigger, triggerRefresh }) {
  const [schedule, setSchedule] = useState([]);
  const [activeDayId, setActiveDayId] = useState(null);
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  const loadData = async () => {
    try {
      // 1. Fetch the overarching schedule for the Day Tabs
      const res = await fetch('http://localhost:8000/api/itinerary/');
      const scheduleData = await res.json();
      setSchedule(scheduleData);

      // Set the active day to the first day if none is selected
      const currentDayId = activeDayId || (scheduleData.length > 0 ? scheduleData[0].id : null);
      if (!activeDayId && currentDayId) setActiveDayId(currentDayId);

      if (!currentDayId) {
        setLoading(false);
        return;
      }

      const currentDay = scheduleData.find(d => d.id === currentDayId);

      // 2. Fetch the local offline memories
      const allNotes = await getAllNotes();
      const allPhotos = await getAllPhotos();
      const allCheckIns = await getAllCheckIns();

      // 3. Merge the memories into the timeline locations
      const mergedTimeline = currentDay.locations.map(loc => {
        const checkInRecord = allCheckIns.find(c => c.location_id === loc.id);
        const rawTime = checkInRecord ? checkInRecord.actual_time : loc.time;
        const displayTime = rawTime ? rawTime.substring(0, 5) : "--:--";

        return {
          ...loc,
          displayTime,
          notes: allNotes.filter(n => n.location_id === loc.id).sort((a,b) => b.timestamp - a.timestamp),
          photos: allPhotos.filter(p => p.location_id === loc.id).sort((a,b) => b.timestamp - a.timestamp)
        };
      });

      setJournalData(mergedTimeline);
    } catch (err) {
      console.error("Failed to load journal", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeDayId, refreshTrigger, localRefresh]); // Reload if Day changes or Sync happens

  const handleDeletePhoto = async (photoId) => {
    if (window.confirm("確定要刪除這張照片嗎？ (Delete this photo?)")) {
      await deleteOfflinePhoto(photoId);
      setLocalRefresh(prev => prev + 1);
      if (triggerRefresh) triggerRefresh();
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">載入紀錄中...</div>;
  if (schedule.length === 0) return <div className="p-8 text-center text-gray-500">尚無行程資料</div>;

  return (
    <div className="pb-8 animate-fade-in">
      
      {/* 🚀 THE NEW DAY SELECTOR UI (Mirrored from Itinerary) */}
      <div className="sticky top-0 z-30 bg-[#f8f5f2]/95 backdrop-blur-sm shadow-sm pt-3 pb-3 mb-6">
        <div className="flex overflow-x-auto gap-3 px-4 pb-1 scrollbar-hide">
            {schedule.map((day, index) => (
                <button 
                  key={day.id} 
                  onClick={() => setActiveDayId(day.id)}
                  className={`flex-shrink-0 w-14 h-16 rounded-xl flex flex-col items-center justify-center transition-all ${activeDayId === day.id ? 'bg-[#e85a4f] text-white shadow-md scale-105' : 'bg-white text-gray-400 border border-gray-100'}`}
                >
                    <span className="text-[10px] font-bold">Day {index + 1}</span>
                    <span className="text-lg font-bold">{day.date.split('-')[2]}</span>
                </button>
            ))}
        </div>
      </div>

      {/* The Timeline Content */}
      <div className="px-5">
        <div className="relative border-l-2 border-red-100 ml-3 space-y-8 pb-10">
          {journalData.map((loc) => {
            const hasMemories = loc.notes.length > 0 || loc.photos.length > 0;
            if (!hasMemories) return null;

            return (
              <div key={loc.id} className="relative pl-6 animate-fade-in">
                {/* The Timeline Dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-white border-4 border-[#e85a4f] rounded-full shadow-sm"></div>
                
                {/* Location Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-sm font-bold text-[#e85a4f]">{loc.displayTime}</span>
                  <h3 className="text-lg font-bold text-gray-800">{loc.name}</h3>
                </div>

                {/* Photos Grid */}
                {loc.photos.length > 0 && (
                  <div className="flex overflow-x-auto gap-2 pb-3 scrollbar-hide snap-x">
                    {loc.photos.map(photo => (
                      <div key={photo.local_id} className="relative w-32 h-32 flex-shrink-0 snap-center rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                        <img src={URL.createObjectURL(photo.blob)} className="w-full h-full object-cover" />
                        <button onClick={() => handleDeletePhoto(photo.local_id)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes List */}
                {loc.notes.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {loc.notes.map(note => (
                      <div key={note.local_id} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 relative group">
                        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100/50">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            {note.sync_status === 'pending' ? '⏳ 待同步' : '✅ 已同步'}
                          </span>
                          <button onClick={() => { setEditingNote(note); setIsNoteModalOpen(true); }} className="text-blue-400 hover:text-blue-600 p-1">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <NoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
        editItem={editingNote}
        onRefresh={() => {
          setLocalRefresh(prev => prev + 1);
          if (triggerRefresh) triggerRefresh();
        }}
      />
    </div>
  );
}