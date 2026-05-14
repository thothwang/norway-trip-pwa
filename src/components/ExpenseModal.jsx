import React, { useState, useEffect } from 'react';
import { Wallet, X, Trash2 } from 'lucide-react';
import { saveOfflineExpense, updateOfflineExpense, deleteOfflineExpense, getCurrentUserId } from '../db';

export default function ExpenseModal({ isOpen, onClose, location, editItem, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const isEditMode = !!editItem;

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setAmount(editItem.amount_nok);
        setDescription(editItem.category);
      } else {
        setAmount('');
        setDescription('');
      }
    }
  }, [isOpen, editItem]);

  const handleSave = async () => {
    if (!amount || !description) return alert("請輸入內容");

    try {
      if (isEditMode) {
        await updateOfflineExpense(editItem.local_id, {
          amount_nok: parseInt(amount),
          category: description
        });
      } else {
        await saveOfflineExpense(getCurrentUserId(), location.id, parseInt(amount), description);
      }
        if (onRefresh) {
                onRefresh();
            }
        onClose();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (window.confirm("確定要刪除這筆紀錄嗎？")) {
      await deleteOfflineExpense(editItem.local_id);
    if (onRefresh) {
            onRefresh();
        }
    onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md p-6 pb-12 rounded-t-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="text-green-600" />
            {isEditMode ? '修改紀錄' : `記一筆 (${location?.name})`}
          </h3>
          <div className="flex gap-2">
            {isEditMode && (
              <button onClick={handleDelete} className="p-2 bg-red-50 text-red-500 rounded-full">
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-gray-100 text-gray-400 rounded-full"><X size={18} /></button>
          </div>
        </div>

        <div className="space-y-4">
          <input 
            type="text" placeholder="項目名稱" value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full bg-gray-50 p-4 rounded-xl font-bold border border-gray-100"
          />
          <input 
            type="number" placeholder="金額" value={amount} 
            onChange={e => setAmount(e.target.value)} 
            className="w-full bg-gray-50 p-4 rounded-xl font-mono text-2xl font-bold border border-gray-100"
            inputMode="numeric"
          />
        </div>

        <button onClick={handleSave} className="w-full bg-[#10B981] text-white py-4 rounded-xl font-bold mt-8 shadow-lg">
          {isEditMode ? '儲存修改' : '確認記帳'}
        </button>
      </div>
    </div>
  );
}