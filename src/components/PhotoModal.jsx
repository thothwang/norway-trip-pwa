import React, { useState, useEffect } from 'react';
import { Camera, X, Image as ImageIcon, Clock } from 'lucide-react';
import { saveOfflinePhoto, saveCheckIn, getCurrentUserId } from '../db';
import exifr from 'exifr'; // The magic EXIF library!

export default function PhotoModal({ isOpen, onClose, location, onRefresh }) {
  const [preview, setPreview] = useState(null);
  const [blob, setBlob] = useState(null);
  const [exifTime, setExifTime] = useState(null); // Holds the extracted time
  const [updateTimeChecked, setUpdateTimeChecked] = useState(true); // Default to YES if we find a time

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setBlob(null);
      setExifTime(null);
      setUpdateTimeChecked(true);
    }
  }, [isOpen]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBlob(file);
    
    // 1. Create the visual preview
    const reader = new FileReader();
    reader.onload = (ex) => setPreview(ex.target.result);
    reader.readAsDataURL(file);

    // 2. Extract the EXIF Data!
    try {
      // We only ask for the specific tag we need to keep it lightning fast
      const metadata = await exifr.parse(file, ['DateTimeOriginal']);
      
      if (metadata && metadata.DateTimeOriginal) {
        const date = new Date(metadata.DateTimeOriginal);
        // Format it exactly how our check-ins like it (e.g., "14:35")
        const timeString = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        setExifTime(timeString);
      } else {
        setExifTime(null); // No timestamp found (e.g., a screenshot or downloaded meme)
      }
    } catch (err) {
      console.warn("Could not extract EXIF data", err);
      setExifTime(null);
    }
  };

  const handleSave = async () => {
    if (!blob) return alert("請先選擇照片 (Please select a photo)");
    
    try {
      // Save the actual photo
      await saveOfflinePhoto(getCurrentUserId(), location.id, blob, 1);
      
      // MAGIC: If the user agreed to update the check-in time, save it!
      if (exifTime && updateTimeChecked) {
        await saveCheckIn(location.id, exifTime, getCurrentUserId());
      }

      if (onRefresh) onRefresh();
      onClose();
    } catch (err) { 
      console.error(err); 
      alert("儲存失敗 (Failed to save)");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md p-6 pb-12 rounded-t-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <div className="bg-red-100 text-red-500 p-2 rounded-xl"><Camera size={20} /></div>
            上傳照片 ({location?.name})
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition"><X size={18} /></button>
        </div>

        <div className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative">
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" />
          ) : (
            <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
              <ImageIcon size={48} className="text-gray-300 mb-2" />
              <span className="text-sm font-bold text-gray-400">點擊選擇照片 (Tap to select photo)</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        {/* The Smart EXIF Banner */}
        {exifTime && (
          <div className="mt-4 bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3 animate-fade-in">
            <Clock className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm text-gray-800 font-bold">發現照片時間：{exifTime}</p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={updateTimeChecked} 
                  onChange={(e) => setUpdateTimeChecked(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                />
                <span className="text-xs text-gray-600 font-bold">同步更新行程的打卡時間？ (Update check-in time?)</span>
              </label>
            </div>
          </div>
        )}

        <button 
          onClick={handleSave} 
          className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-lg mt-6 shadow-lg active:scale-95 transition-transform"
        >
          確認上傳 (Upload)
        </button>
      </div>
    </div>
  );
}