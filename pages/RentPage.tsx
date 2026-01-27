
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  Calendar, 
  X, 
  CheckCircle2, 
  History,
  Filter
} from 'lucide-react';
// Redirected modular imports to local wrappers in firebase.ts
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  updateDoc,
  db
} from '../firebase';
import { RentRecord } from '../types';

const RENT_TYPES = ["Room Enamul", "Pay Bill Enamul", "Sinthiyar Beton"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const RentPage: React.FC = () => {
  const [rentHistory, setRentHistory] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formState, setFormState] = useState<Partial<RentRecord>>({
    amount: 0,
    type: 'Room Enamul',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'rent_history'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RentRecord[];
      setRentHistory(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter history based on search and month
  const filteredHistory = rentHistory.filter(record => {
    const matchesSearch = record.comment.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          record.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedMonth === 'all') return matchesSearch;
    
    const recordMonth = new Date(record.date).toLocaleString('default', { month: 'long' });
    return matchesSearch && recordMonth === selectedMonth;
  });

  // Calculate latest payments for the "Fixed Rows" summary
  const getLatestPayment = (type: typeof RENT_TYPES[number]) => {
    return rentHistory.find(r => r.type === type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formState,
        amount: Number(formState.amount),
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'rent_history', editingId), data);
      } else {
        await addDoc(collection(db, 'rent_history'), data);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormState({ amount: 0, type: 'Room Enamul', comment: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error("Error saving rent record:", error);
      alert("Failed to save record.");
    }
  };

  const handleEditStart = (record: RentRecord) => {
    setEditingId(record.id);
    setFormState({
      amount: record.amount,
      type: record.type,
      comment: record.comment,
      date: record.date
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rent & Bills</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Shop Utility Ledger v2.0</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => { setEditingId(null); setFormState({ amount: 0, type: 'Room Enamul', comment: '', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-3 hover:bg-indigo-700 transition-all font-black shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Plus size={20} />
          <span className="uppercase tracking-widest text-xs">Post Payment</span>
        </button>
      </div>

      {/* Latest Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {RENT_TYPES.map((type) => {
          const latest = getLatestPayment(type);
          return (
            <div key={type} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                 <Building2 size={80} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Latest Payment</p>
                <h4 className="text-sm font-black text-slate-900 mb-4">{type}</h4>
                <div className="flex items-baseline space-x-2">
                  <h3 className="text-3xl font-black text-indigo-600 tracking-tight">
                    ৳{latest ? latest.amount.toLocaleString() : '0'}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">Tk</span>
                </div>
                {latest && (
                  <p className="text-[10px] text-slate-400 font-bold mt-4 flex items-center">
                    <Calendar size={12} className="mr-1" />
                    Last Paid: {new Date(latest.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by comment or type..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                />
              </div>
              <div className="relative w-48">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xs appearance-none cursor-pointer"
                >
                  <option value="all">All Months</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Selected Total</p>
              <p className="text-xl font-black text-indigo-600">৳{filteredHistory.reduce((s, r) => s + r.amount, 0).toLocaleString()}</p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-16 text-center">SL</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Type</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Comment</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-500" size={40} />
                    <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Loading History...</p>
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 text-center">
                       <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-400">
                         {String(index + 1).padStart(2, '0')}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500 whitespace-nowrap">{record.date}</td>
                    <td className="px-8 py-6">
                       <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span className="font-black text-slate-800 tracking-tight">{record.type}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-400 max-w-xs truncate">{record.comment || '—'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-lg font-black text-slate-900">৳{record.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditStart(record)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                         <button onClick={async () => { if(confirm(`Delete record?`)) await deleteDoc(doc(db, 'rent_history', record.id)); }} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <History className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="font-bold text-slate-300 italic tracking-tight uppercase">No records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
             <div className="p-8 bg-indigo-600 flex items-center justify-between text-white shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-2xl"><Building2 size={24} /></div>
                  <div>
                     <h3 className="text-2xl font-black tracking-tight uppercase leading-none">{editingId ? 'Edit Entry' : 'Post Payment'}</h3>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Payment Type</label>
                  <select 
                    required 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs appearance-none cursor-pointer" 
                    value={formState.type} 
                    onChange={e => setFormState({...formState, type: e.target.value as any})}
                  >
                    {RENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Paid Amount (৳)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-6 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl font-black text-2xl text-indigo-600" 
                    value={formState.amount || ''} 
                    onChange={e => setFormState({...formState, amount: Number(e.target.value)})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Payment Date</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" 
                    value={formState.date} 
                    onChange={e => setFormState({...formState, date: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Comment</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24 resize-none" 
                    value={formState.comment} 
                    onChange={e => setFormState({...formState, comment: e.target.value})} 
                  />
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2">
                  <CheckCircle2 size={18} />
                  <span>{editingId ? 'Update Ledger' : 'Confirm & Sync'}</span>
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentPage;
