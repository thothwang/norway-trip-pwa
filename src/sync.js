import { getAllExpenses, getAllNotes, getAllPhotos, getAllCheckIns, markItemAsSynced } from './db';

export const runGlobalSync = async () => {
  try {
    // 1. Gather all offline data
    const expenses = await getAllExpenses();
    const notes = await getAllNotes();
    const photos = await getAllPhotos();
    const checkIns = await getAllCheckIns();

    // 2. Filter out only the pending items
    const pendingExpenses = expenses.filter(e => e.sync_status === 'pending');
    const pendingNotes = notes.filter(n => n.sync_status === 'pending');
    const pendingPhotos = photos.filter(p => p.sync_status === 'pending');
    const pendingCheckIns = checkIns.filter(c => c.sync_status === 'pending');

    const totalPending = pendingExpenses.length + pendingNotes.length + pendingPhotos.length + pendingCheckIns.length;
    
    if (totalPending === 0) return "NO_DATA";

    // 3. PUSH TO SERVER (The Real Deal)
    console.log(`Syncing ${totalPending} items to server...`);
    
    // Package everything up
    const payload = {
      pendingExpenses,
      pendingNotes,
      pendingPhotos,
      pendingCheckIns
    };

    // Send it to your Python backend
    const response = await fetch('http://localhost:8000/api/sync/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Server rejected the sync");

    const result = await response.json();
    
    if (result.status !== "SUCCESS") throw new Error("Sync failed on server");
    
    // 4. Update Local Database to "Synced"
    
    for (const photo of pendingPhotos) {
      const formData = new FormData();
      // Hardcoding user_id 1 for now, just like the backend
      formData.append('user_id', 1); 
      formData.append('location_id', photo.location_id);
      formData.append('sort_order', photo.sort_order || 1);
      
      // Attach the actual image file from IndexedDB
      formData.append('file', photo.blob, `photo_${photo.local_id}.jpg`);

      const photoRes = await fetch('http://localhost:8000/api/sync/photo', {
        method: 'POST',
        body: formData // Notice we don't set 'Content-Type', the browser handles it for FormData!
      });

      if (!photoRes.ok) console.error("Failed to sync photo:", photo.local_id);
    }

    for (const e of pendingExpenses) await markItemAsSynced('expenses', e.local_id);
    for (const n of pendingNotes) await markItemAsSynced('notes', n.local_id);
    for (const p of pendingPhotos) await markItemAsSynced('photos', p.local_id);
    for (const c of pendingCheckIns) await markItemAsSynced('check_ins', c.location_id);

    return "SUCCESS";
  } catch (error) {
    console.error("Global Sync Failed:", error);
    return "ERROR";
  }
};