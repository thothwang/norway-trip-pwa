import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { getAllExpenses } from '../db';
import ExpenseModal from './ExpenseModal'; // Import the Modal

export default function Budget({ refreshTrigger, triggerRefresh }) {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  
  // NEW: State for editing
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    const data = await getAllExpenses();
    data.sort((a, b) => b.timestamp - a.timestamp);
    setExpenses(data);
    const sum = data.reduce((acc, curr) => acc + (curr.amount_nok || 0), 0);
    setTotal(sum);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleEditClick = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="p-5 pt-12 pb-24 animate-fade-in">
      <h2 className="text-3xl font-bold mb-4 text-gray-800">消費統計</h2>
      
      {/* Total Card */}
      <div className="bg-[#10B981] text-white p-6 rounded-3xl shadow-lg mb-6 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-sm opacity-90 font-bold">總支出 (NOK/JPY)</div>
          <div className="text-5xl font-mono font-bold mt-2">
            ${total.toLocaleString()}
          </div>
        </div>
        <div className="absolute -right-8 -bottom-12 opacity-10 rotate-12">
          <ShoppingBag size={140} strokeWidth={1} />
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-400">明細列表</h3>
      </div>

      {/* List */}
      <div className="space-y-3">
        {expenses.length === 0 && (
          <div className="text-center text-gray-400 py-10">還沒有紀錄喔</div>
        )}
        
        {expenses.map(e => (
          <div 
            key={e.local_id} 
            onClick={() => handleEditClick(e)} // Trigger Edit
            className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-50 p-2.5 rounded-xl text-gray-400">
                <ShoppingBag size={18} />
              </div>
              <div>
                <div className="font-bold text-gray-800 text-lg">{e.category}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {e.sync_status === 'pending' ? '⏳ Pending' : '✅ Synced'}
                </div>
              </div>
            </div>
            <span className="font-mono text-xl font-bold text-gray-700">
              ${e.amount_nok.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* The Modal in Edit Mode */}
      <ExpenseModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
        onRefresh={() => {
          loadData();
          if (triggerRefresh) triggerRefresh();
        }}
      />
    </div>
  );
}