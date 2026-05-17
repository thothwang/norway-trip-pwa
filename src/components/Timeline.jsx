import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Image as ImageIcon, Trash2, Edit3 } from 'lucide-react';
import { getAllNotes, getAllPhotos, deleteOfflinePhoto, getAllCheckIns, getCurrentUserId, checkHasPendingData   } from '../db';
import NoteModal from './NoteModal';
import { API_BASE_URL } from '../config';

export default function Timeline({ refreshTrigger, triggerRefresh }) {
  const [schedule, setSchedule] = useState([]);
  const [activeDayId, setActiveDayId] = useState(null);
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [expandedNoteLocations, setExpandedNoteLocations] = useState({});

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  //const CURRENT_USER_ID = getCurrentUserId();

  const openPublicJournal = async () => {
    if (!activeDayId) return;

    const hasPending = await checkHasPendingData();

    if (hasPending) {
      const shouldOpen = window.confirm(
        "你有尚未同步的紀錄。公開頁面只會顯示已同步資料。\n\n仍要開啟分享頁面嗎？"
      );

      if (!shouldOpen) return;
    }
    const userId = getCurrentUserId();

    window.open(
      `${API_BASE_URL}/api/journal/user/${userId}/day/${activeDayId}/public`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyPublicJournalLink = async () => {
    if (!activeDayId) return;

    const userId = getCurrentUserId();
    const url = `${API_BASE_URL}/api/journal/user/${userId}/day/${activeDayId}/public`;

    try {
      await navigator.clipboard.writeText(url);
      alert("分享連結已複製");
    } catch (err) {
      console.error(err);
      alert(url);
    }
  };

  const handleTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goNextPhoto();
    }

    if (distance < -minSwipeDistance) {
      goPrevPhoto();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const openGallery = (photos, startIndex = 0) => {
    setGalleryPhotos(photos);
    setGalleryIndex(startIndex);
  };

  const closeGallery = () => {
    setGalleryPhotos([]);
    setGalleryIndex(0);
  };

  const goPrevPhoto = () => {
    setGalleryIndex(prev =>
      prev === 0 ? galleryPhotos.length - 1 : prev - 1
    );
  };

  const goNextPhoto = () => {
    setGalleryIndex(prev =>
      prev === galleryPhotos.length - 1 ? 0 : prev + 1
    );
  };


  const toggleNotesExpanded = (locationId) => {
    setExpandedNoteLocations(prev => ({
      ...prev,
      [locationId]: !prev[locationId],
    }));
  };


    const getDefaultDayId = (days) => {
    if (!days || days.length === 0) return null;

    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);

    // Exact match: today is one of the trip days
    const todayDay = days.find(day => day.date === todayString);
    if (todayDay) return todayDay.id;

    // Before trip: use first day
    if (todayString < days[0].date) {
        return days[0].id;
    }

    // After trip: use last day
    if (todayString > days[days.length - 1].date) {
        return days[days.length - 1].id;
    }

    // During trip but no exact match, fallback to first day
    return days[0].id;
    };

  const loadData = async () => {
    try {
      // 1. Fetch the overarching schedule for the Day Tabs
      const res = await fetch(`${API_BASE_URL}/api/itinerary/`);
      const scheduleData = await res.json();
      setSchedule(scheduleData);

      // Set the active day to the first day if none is selected
      const currentDayId = activeDayId || getDefaultDayId(scheduleData);
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

      const currentUserId = getCurrentUserId();
      const userCheckIns = allCheckIns.filter(c => c.user_id === currentUserId);

      const userNotes = allNotes.filter(n => n.user_id === currentUserId);
      const userPhotos = allPhotos.filter(p => p.user_id === currentUserId);

      // 3. Merge the memories into the timeline locations
      const mergedTimeline = currentDay.locations.map(loc => {
        const checkInRecord = userCheckIns.find(c => c.location_id === loc.id);
        const rawTime = checkInRecord ? checkInRecord.actual_time : loc.time;
        const displayTime = rawTime ? rawTime.substring(0, 5) : "--:--";

        return {
          ...loc,
          displayTime,
          notes: userNotes
            .filter(n => n.location_id === loc.id)
            .sort((a, b) => b.timestamp - a.timestamp),

          photos: userPhotos
            .filter(p => p.location_id === loc.id)
            .sort((a, b) => b.timestamp - a.timestamp)
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

  const hasAnyMemories = journalData.some(
    loc => loc.notes.length > 0 || loc.photos.length > 0
  );

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

      <div className="px-5 mb-5 flex justify-end">
        <button
          onClick={openPublicJournal}
          className="px-4 py-2 rounded-full bg-[#e85a4f] text-white text-sm font-bold shadow-sm active:scale-95 transition"
        >
          分享今日紀錄
        </button>
      </div>

    {/* The Timeline Content */}
    {!hasAnyMemories && (
      <div className="px-5 mt-8">
        <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#e85a4f]/10 text-[#e85a4f] flex items-center justify-center mb-4">
            <ImageIcon size={28} />
          </div>

          <h3 className="text-xl font-black text-gray-800">
            今天還沒有紀錄
          </h3>

          <p className="text-sm text-gray-400 font-medium leading-relaxed mt-2">
            到「行程」頁面新增筆記或照片，<br />
            你的旅遊回憶會出現在這裡。
          </p>
        </div>
      </div>
    )}

    {hasAnyMemories && (
      <div className="px-5">
        <div className="relative border-l-2 border-red-100 ml-3 space-y-8 pb-10">
          {journalData.map((loc) => {
            const hasMemories = loc.notes.length > 0 || loc.photos.length > 0;
            if (!hasMemories) return null;

            return (
              <div key={loc.id} className="relative pl-6 animate-fade-in">
                {/* Timeline dot */}
                <div className="absolute -left-[10px] top-2 w-5 h-5 bg-[#f8f5f2] border-[5px] border-[#e85a4f] rounded-full shadow-sm"></div>

                {/* Location header */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-[#e85a4f] font-mono text-sm font-black">
                    <Clock size={14} />
                    <span>{loc.displayTime}</span>
                  </div>

                  <h3 className="text-xl font-black text-gray-800 mt-1 leading-tight">
                    {loc.name}
                  </h3>
                </div>

                {/* Journal card */}
                <div className="bg-white rounded-[1.75rem] shadow-sm border border-gray-100 overflow-hidden">
                  {/* Photo grid */}
                  {loc.photos.length > 0 && (
                    <div className="p-2">
                      {loc.photos.length === 1 && (
                        <button
                          onClick={() => openGallery(loc.photos, 0)}
                          className="relative w-full overflow-hidden bg-gray-100 rounded-3xl aspect-[4/3]"
                        >
                          <img
                            src={URL.createObjectURL(loc.photos[0].blob)}
                            className="w-full h-full object-cover"
                            alt="Travel memory"
                          />
                        </button>
                      )}

                      {loc.photos.length === 2 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {loc.photos.slice(0, 2).map((photo, index) => (
                            <button
                              key={photo.local_id}
                              onClick={() => openGallery(loc.photos, index)}
                              className="relative overflow-hidden bg-gray-100 rounded-2xl aspect-square"
                            >
                              <img
                                src={URL.createObjectURL(photo.blob)}
                                className="w-full h-full object-cover"
                                alt="Travel memory"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {loc.photos.length === 3 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => openGallery(loc.photos, 0)}
                            className="relative overflow-hidden bg-gray-100 rounded-2xl row-span-2 aspect-square"
                          >
                            <img
                              src={URL.createObjectURL(loc.photos[0].blob)}
                              className="w-full h-full object-cover"
                              alt="Travel memory"
                            />
                          </button>

                          {loc.photos.slice(1, 3).map((photo, index) => (
                            <button
                              key={photo.local_id}
                              onClick={() => openGallery(loc.photos, index + 1)}
                              className="relative overflow-hidden bg-gray-100 rounded-2xl aspect-square"
                            >
                              <img
                                src={URL.createObjectURL(photo.blob)}
                                className="w-full h-full object-cover"
                                alt="Travel memory"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {loc.photos.length >= 4 && (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => openGallery(loc.photos, 0)}
                            className="relative w-full overflow-hidden bg-gray-100 rounded-2xl aspect-[16/9]"
                          >
                            <img
                              src={URL.createObjectURL(loc.photos[0].blob)}
                              className="w-full h-full object-cover"
                              alt="Travel memory"
                            />
                          </button>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => openGallery(loc.photos, 1)}
                              className="relative overflow-hidden bg-gray-100 rounded-2xl aspect-[4/3]"
                            >
                              <img
                                src={URL.createObjectURL(loc.photos[1].blob)}
                                className="w-full h-full object-cover"
                                alt="Travel memory"
                              />
                            </button>

                            <button
                              onClick={() => openGallery(loc.photos, 2)}
                              className="relative overflow-hidden bg-gray-100 rounded-2xl aspect-[4/3]"
                            >
                              <img
                                src={URL.createObjectURL(loc.photos[2].blob)}
                                className="w-full h-full object-cover"
                                alt="Travel memory"
                              />

                              <div className="absolute inset-0 bg-black/45 text-white flex items-center justify-center text-3xl font-black backdrop-blur-[1px]">
                                +{loc.photos.length - 3}
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {loc.notes.length > 0 && (
                    <div className="px-4 pb-4 pt-2 space-y-3">
                      {(expandedNoteLocations[loc.id] ? loc.notes : loc.notes.slice(0, 2)).map(note => (
                        <div
                          key={note.local_id}
                          className="bg-[#f8f5f2] rounded-2xl p-4 border border-gray-100"
                        >
                          <p className="text-gray-700 whitespace-pre-wrap text-[15px] leading-relaxed">
                            {note.content}
                          </p>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                            <span className={`text-[10px] font-bold ${
                              note.sync_status === 'pending' ? 'text-amber-500' : 'text-gray-300'
                            }`}>
                              {note.sync_status === 'pending' ? '待同步' : '已同步'}
                            </span>

                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setIsNoteModalOpen(true);
                              }}
                              className="text-gray-300 hover:text-[#e85a4f] p-1"
                            >
                              <Edit3 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {loc.notes.length > 2 && (
                        <button
                          onClick={() => toggleNotesExpanded(loc.id)}
                          className="w-full py-3 rounded-2xl bg-white border border-gray-100 text-sm font-bold text-gray-500 hover:text-[#e85a4f] hover:border-[#e85a4f]/30 transition"
                        >
                          {expandedNoteLocations[loc.id]
                            ? '收合筆記'
                            : `查看其他 ${loc.notes.length - 2} 則筆記`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

      <NoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => { setIsNoteModalOpen(false); setEditingNote(null); }}
        editItem={editingNote}
        onRefresh={() => {
          setLocalRefresh(prev => prev + 1);
          if (triggerRefresh) triggerRefresh();
        }}
      />

      {galleryPhotos.length > 0 && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 text-white">
            <button
              onClick={closeGallery}
              className="text-sm font-bold bg-white/10 px-4 py-2 rounded-full"
            >
              關閉
            </button>

            <span className="text-sm font-bold text-white/70">
              {galleryIndex + 1} / {galleryPhotos.length}
            </span>

            <button
              onClick={async () => {
                const currentPhoto = galleryPhotos[galleryIndex];

                if (window.confirm("確定要刪除這張照片嗎？")) {
                  await deleteOfflinePhoto(currentPhoto.local_id);
                  setGalleryPhotos(prev =>
                    prev.filter(photo => photo.local_id !== currentPhoto.local_id)
                  );
                  setGalleryIndex(prev =>
                    Math.max(0, Math.min(prev, galleryPhotos.length - 2))
                  );
                  setLocalRefresh(prev => prev + 1);
                  if (triggerRefresh) triggerRefresh();
                }
              }}
              className="text-sm font-bold bg-red-500/80 px-4 py-2 rounded-full"
            >
              刪除
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={URL.createObjectURL(galleryPhotos[galleryIndex].blob)}
              className="max-w-full max-h-full object-contain rounded-2xl"
              alt="Travel memory full size"
            />
          </div>

          {galleryPhotos.length > 1 && (
            <div className="flex items-center justify-between px-8 pb-8">
              <button
                onClick={goPrevPhoto}
                className="bg-white/10 text-white px-5 py-3 rounded-full font-bold"
              >
                上一張
              </button>

              <button
                onClick={goNextPhoto}
                className="bg-white/10 text-white px-5 py-3 rounded-full font-bold"
              >
                下一張
              </button>
            </div>
          )}
        </div>
      )}



    </div>
  );
}