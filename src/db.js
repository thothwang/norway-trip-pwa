import { openDB } from 'idb';

const DB_NAME = 'norway_trip_offline_db';
const DB_VERSION = 4;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
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
        if (oldVersion < 4 && db.objectStoreNames.contains('check_ins')) {
            db.deleteObjectStore('check_ins');
        }

        if (!db.objectStoreNames.contains('check_ins')) {
            const checkInStore = db.createObjectStore('check_ins', { keyPath: 'local_id' });
            checkInStore.createIndex('sync_status', 'sync_status');
            checkInStore.createIndex('user_id', 'user_id');
        }
      if (!db.objectStoreNames.contains('api_cache')) {
        db.createObjectStore('api_cache', { keyPath: 'cache_key' });
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


export const saveOfflineExpense = async (userId, locationId, amount, description) => {
  const db = await initDB();
  const expense = {
    local_id: generateLocalId(),
    user_id: userId,
    location_id: locationId,
    amount_nok: amount,
    category: description, // Mapping description to the category pipe
    sync_status: 'pending', // Flags this to be sent to the backend later
    timestamp: Date.now()
  };
  
  // Save directly to your 'expenses' store!
  await db.put('expenses', expense);
  return expense;
};


// Fetch all expenses (both pending and synced) for the Dashboard
export const getAllExpenses = async () => {
  const db = await initDB();
  return await db.getAll('expenses');
};

// Update an existing expense
export const updateOfflineExpense = async (localId, updates) => {
  const db = await initDB();
  const expense = await db.get('expenses', localId);
  if (expense) {
    const updatedExpense = { ...expense, ...updates, timestamp: Date.now(), sync_status: 'pending'};
    await db.put('expenses', updatedExpense);
    return updatedExpense;
  }
};

// Delete an expense
export const deleteOfflineExpense = async (localId) => {
  const db = await initDB();
  await db.delete('expenses', localId);
};


// Fetch all offline notes
export const getAllNotes = async () => {
  const db = await initDB();
  return await db.getAll('notes');
};

// Fetch all offline photos
export const getAllPhotos = async () => {
  const db = await initDB();
  return await db.getAll('photos');
};

// --- NOTES: Update & Delete ---
export const updateOfflineNote = async (localId, updates) => {
  const db = await initDB();
  const note = await db.get('notes', localId);
  if (note) {
    const updatedNote = { ...note, ...updates, timestamp: Date.now(), sync_status: 'pending' };
    await db.put('notes', updatedNote);
    return updatedNote;
  }
};

export const deleteOfflineNote = async (localId) => {
  const db = await initDB();
  await db.delete('notes', localId);
};


// --- PHOTOS: Delete ---
// (Usually, you don't "update" a photo file, you just delete it and take a new one)
export const deleteOfflinePhoto = async (localId) => {
  const db = await initDB();
  await db.delete('photos', localId);
};

export const saveCheckIn = async (locationId, newTime, userId = getCurrentUserId()) => {
  const db = await initDB();

  await db.put('check_ins', {
    local_id: `${userId}_${locationId}`,
    user_id: userId,
    location_id: locationId,
    actual_time: newTime,
    timestamp: Date.now(),
    sync_status: 'local'
  });
};

export const getAllCheckIns = async () => {
  const db = await initDB();
  return await db.getAll('check_ins');
};

// Remove a check-in to revert to the planned schedule
export const deleteCheckIn = async (locationId, userId = getCurrentUserId()) => {
  const db = await initDB();
  await db.delete('check_ins', `${userId}_${locationId}`);
};


// Check if the user has ANY pending data across all tables
export const checkHasPendingData = async () => {
  const db = await initDB();
  const currentUserId = getCurrentUserId();

  const expenses = await db.getAll('expenses');
  const notes = await db.getAll('notes');
  const photos = await db.getAll('photos');

  return [...expenses, ...notes, ...photos].some(
    item => item.sync_status === 'pending' && item.user_id === currentUserId
  );
};

// Mark a specific item as successfully synced
export const markItemAsSynced = async (storeName, id) => {
  const db = await initDB();
  const item = await db.get(storeName, id);
  if (item) {
    item.sync_status = 'synced';
    await db.put(storeName, item);
  }
};


export const saveApiCache = async (key, data) => {
  const db = await initDB();
  await db.put('api_cache', { cache_key: key, data, updated_at: Date.now() });
};

export const getApiCache = async (key) => {
  const db = await initDB();
  return await db.get('api_cache', key);
};


export const getCurrentUserId = () => {
  return parseInt(localStorage.getItem("current_user_id") || "1", 10);
};

export const setCurrentUserId = (userId) => {
  localStorage.setItem("current_user_id", String(userId));
};