import { getAllExpenses, getAllNotes, getAllPhotos, markItemAsSynced, getCurrentUserId } from './db';
import { API_BASE_URL } from './config';

export const runGlobalSync = async () => {
  try {
    // 1. Gather all offline data
    const expenses = await getAllExpenses();
    const notes = await getAllNotes();
    const photos = await getAllPhotos();
    const currentUserId = getCurrentUserId();


    // 2. Filter only this user's pending items
    const pendingExpenses = expenses.filter(
      e => e.sync_status === 'pending' && e.user_id === currentUserId
    );

    const pendingNotes = notes.filter(
      n => n.sync_status === 'pending' && n.user_id === currentUserId
    );

    const pendingPhotos = photos.filter(
      p => p.sync_status === 'pending' && p.user_id === currentUserId
    );

    // For now, keep check-ins local only.
    // Backend currently updates shared itinerary time, so syncing check-ins
    // would affect all users.
    const pendingCheckIns = [];

    const totalPending =
      pendingExpenses.length +
      pendingNotes.length +
      pendingPhotos.length +
      pendingCheckIns.length;    
    
    if (totalPending === 0) return "NO_DATA";

    console.log(`Syncing ${totalPending} items to server...`);

    // 3. Sync notes and expenses through JSON endpoint
    const payload = {
        user_id: currentUserId,
        pendingExpenses,
        pendingNotes,
        pendingPhotos,
        pendingCheckIns
    };

    // Send it to your Python backend
    const response = await fetch(`${API_BASE_URL}/api/sync/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Server rejected the sync");

    const result = await response.json();
    
    if (result.status !== "SUCCESS") throw new Error("Sync failed on server");
    
    // 4. Sync photos separately.
    // Only mark each photo as synced if its upload succeeds.

    const syncedPhotoIds = [];

    for (const photo of pendingPhotos) {
    const formData = new FormData();

    formData.append('user_id', currentUserId);
    formData.append('location_id', photo.location_id);
    formData.append('sort_order', photo.sort_order || 1);
    formData.append('file', photo.blob, `photo_${photo.local_id}.jpg`);

    const photoRes = await fetch(`${API_BASE_URL}/api/sync/photo`, {
        method: 'POST',
        body: formData
    });

    if (!photoRes.ok) {
        console.error("Failed to sync photo:", photo.local_id);
        continue;
    }

    syncedPhotoIds.push(photo.local_id);
    }
    
    // 5. Mark only successfully synced items as synced locally
    for (const e of pendingExpenses) await markItemAsSynced('expenses', e.local_id);
    for (const n of pendingNotes) await markItemAsSynced('notes', n.local_id);

    for (const photoId of syncedPhotoIds) {
        await markItemAsSynced('photos', photoId);
    }

    for (const c of pendingCheckIns) {
        await markItemAsSynced('check_ins', c.local_id || c.location_id);
    }

    return "SUCCESS";
  } catch (error) {
    console.error("Global Sync Failed:", error);
    return "ERROR";
  }
};