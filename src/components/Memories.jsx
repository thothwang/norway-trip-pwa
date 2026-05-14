import React, { useState } from 'react';
import { Camera, Save, CloudUpload, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { saveOfflineNote, saveOfflinePhoto, getPendingSyncData, getPendingPhotos, markAsSynced } from '../db';
import { API_BASE_URL } from '../config';

export default function Memories({ selectedLocation, onSyncComplete }) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('Idle');

  // Hardcoded for testing (We will make this dynamic later)
  const TEST_USER_ID = 1;
  //const TEST_LOCATION_ID = 1;
  const currentLocationId = selectedLocation ? selectedLocation.id : null;

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 4) {
      alert("Maximum 4 photos allowed per location!");
      return;
    }
    
    setStatus('Compressing images...');
    const compressedBlobs = [];
    
    for (const file of files) {
      try {
        const compressedBlob = await compressImage(file);
        compressedBlobs.push(compressedBlob);
      } catch (error) {
        console.error("Compression failed", error);
      }
    }
    
    setPhotos([...photos, ...compressedBlobs]);
    setStatus('Images ready.');
  };

  const handleSaveOffline = async () => {
    if (!currentLocationId) {
      alert("Please select a location from the Itinerary first!");
      return;
    }
    setStatus('Saving offline...');
    
    if (note) {
      await saveOfflineNote(TEST_USER_ID, currentLocationId, note);
    }
    
    for (let i = 0; i < photos.length; i++) {
      await saveOfflinePhoto(TEST_USER_ID, currentLocationId, photos[i], i + 1);
    }
    
    setNote('');
    setPhotos([]);
    setStatus('Saved locally! Ready to sync.');
  };

  const handleSyncToServer = async () => {
    setStatus('Syncing to server...');
    try {
      // 1. Sync Text Data (Notes & Expenses)
      const { notes, expenses } = await getPendingSyncData();
      
      if (notes.length > 0 || expenses.length > 0) {
        const payload = {
          user_id: TEST_USER_ID,
          notes: notes.map(n => ({ location_id: n.location_id, content: n.content })),
          expenses: expenses.map(e => ({ location_id: e.location_id, amount_nok: e.amount_nok, category: e.category }))
        };

        const response = await fetch(`${API_BASE_URL}/api/sync/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          for (const n of notes) await markAsSynced('notes', n.local_id);
          for (const e of expenses) await markAsSynced('expenses', e.local_id);
        }
      }

      // 2. Sync Photos
      const pendingPhotos = await getPendingPhotos();
      for (const p of pendingPhotos) {
        const formData = new FormData();
        formData.append('user_id', p.user_id);
        formData.append('location_id', p.location_id);
        formData.append('sort_order', p.sort_order);
        // Convert Blob to File object for the FormData
        formData.append('file', new File([p.blob], 'photo.webp', { type: 'image/webp' }));

        const photoRes = await fetch(`${API_BASE_URL}/api/sync/photo`, {
          method: 'POST',
          body: formData
        });

        if (photoRes.ok) {
          await markAsSynced('photos', p.local_id);
        }
      }

      setStatus('Sync complete!');
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error(error);
      setStatus('Sync failed. Are you offline?');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Add Memory</h2>
      
      {/* Note Input */}
      <textarea 
        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#e85a4f] outline-none resize-none"
        rows="4"
        placeholder="What happened here?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {/* Photo Input */}
      <div className="flex gap-2 items-center">
        <label className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200 transition">
          <Camera size={18} />
          <span className="text-sm font-bold text-gray-700">Add Photos ({photos.length}/4)</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button 
          onClick={handleSaveOffline}
          className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
        >
          <Save size={18} /> Save Offline
        </button>
        
        <button 
          onClick={handleSyncToServer}
          className="flex-1 bg-[#10B981] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
        >
          <CloudUpload size={18} /> Sync
        </button>
      </div>

      {/* Status Bar */}
      <div className="text-center text-sm font-bold text-gray-500 mt-4 animate-pulse">
        {status}
      </div>
    </div>
  );
}