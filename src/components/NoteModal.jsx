import React, { useState, useEffect } from 'react';
import { Pencil, X, Trash2 } from 'lucide-react';
import { saveOfflineNote, updateOfflineNote, deleteOfflineNote, getCurrentUserId } from '../db';

export default function NoteModal({ isOpen, onClose, location, editItem, onRefresh }) {
  const [content, setContent] = useState('');
  const isEditMode = !!editItem;

  useEffect(() => {
    if (isOpen) {
      // Fill the form if we are editing!
      setContent(editItem ? editItem.content : '');
    }
  }, [isOpen, editItem]);

  const handleSave = async () => {
    if (!content.trim()) return alert("請輸入內容 (Please enter text)");

    try {
      if (isEditMode) {
        await updateOfflineNote(editItem.local_id, { content });
      } else {
        await saveOfflineNote(getCurrentUserId(), location?.id, content);
      }
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("儲存失敗");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("確定要刪除這筆筆記嗎？ (Are you sure you want to delete this note?)")) {
      await deleteOfflineNote(editItem.local_id);
      if (onRefresh) onRefresh();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md p-6 pb-12 rounded-t-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Pencil size={20} /></div>
            {isEditMode ? '編輯筆記' : `寫筆記 (${location?.name})`}
          </h3>
          <div className="flex gap-2">
            {isEditMode && (
              <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        <textarea 
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="記錄這一刻的心情..."
          className="w-full h-40 bg-gray-50 p-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none text-lg"
        />

        <button 
          onClick={handleSave} 
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg mt-6 shadow-lg active:scale-95 transition-transform"
        >
          {isEditMode ? '儲存修改' : '儲存筆記'}
        </button>
      </div>
    </div>
  );
}