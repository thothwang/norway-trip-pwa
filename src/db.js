import { openDB } from 'idb';

const DB_NAME = 'norway_trip_offline_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Master Itinerary (Pulled from server, read-only locally)
      if (!db.objectStoreNames.contains('itinerary')) {
        db.createObjectStore('itinerary', { keyPath: 'id' });
      }

      // 2. Private Data (Notes, Expenses, Photos)
      // We use 'local_id' because offline items won't have a Postgres ID until they sync!
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'local_id' });
        noteStore.createIndex('sync_status', 'sync_status'); // To quickly find 'pending' items
      }

      if (!db.objectStoreNames.contains('expenses')) {
        const expStore = db.createObjectStore('expenses', { keyPath: 'local_id' });
        expStore.createIndex('sync_status', 'sync_status');
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'local_id' });
        photoStore.createIndex('sync_status', 'sync_status');
      }
    },
  });
};

// --- Helper Functions for Offline Actions ---

// Generate a unique local ID (timestamp + random number)
const generateLocalId = () => `loc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export const saveOfflineNote = async (userId, locationId, content) => {
  const db = await initDB();
  const note = {
    local_id: generateLocalId(),
    user_id: userId,
    location_id: locationId,
    content: content,
    sync_status: 'pending', // Flags this to be sent to the backend later
    timestamp: Date.now()
  };
  await db.put('notes', note);
  return note;
};

// Fetch all items waiting to be synced to your QNAP
export const getPendingSyncData = async () => {
  const db = await initDB();
  const pendingNotes = await db.getAllFromIndex('notes', 'sync_status', 'pending');
  const pendingExpenses = await db.getAllFromIndex('expenses', 'sync_status', 'pending');
  // We'll handle photos separately due to file sizes
  
  return {
    notes: pendingNotes,
    expenses: pendingExpenses
  };
};

// Mark items as synced after a successful backend push
export const markAsSynced = async (storeName, localId) => {
    const db = await initDB();
    const item = await db.get(storeName, localId);
    if (item) {
        item.sync_status = 'synced';
        await db.put(storeName, item);
    }
};

export const saveOfflinePhoto = async (userId, locationId, fileBlob, sortOrder) => {
  const db = await initDB();
  const photo = {
    local_id: generateLocalId(),
    user_id: userId,
    location_id: locationId,
    blob: fileBlob,       // We store the compressed WebP blob here
    sort_order: sortOrder,
    sync_status: 'pending',
    timestamp: Date.now()
  };
  await db.put('photos', photo);
  return photo;
};

export const getPendingPhotos = async () => {
  const db = await initDB();
  return await db.getAllFromIndex('photos', 'sync_status', 'pending');
};
