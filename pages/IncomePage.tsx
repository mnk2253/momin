
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  TrendingUp, 
  Calendar, 
  X, 
  Calculator,
  Save,
  Activity,
  ArrowUpRight,
  TrendingDown,
  ArrowRightLeft,
  PieChart,
  Target,
  Briefcase,
  History,
  ShieldCheck
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
  where,
  limit,
  db
} from '../firebase';
import { IncomeRecord } from '../types';

interface DailyHisab {
  pastCash: number;
  mainCash: number;
  totalLoan?: number;
  profitLoss: number;
  date: string;
}

const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [todayHisab, setTodayHisab] = useState<DailyHisab | null>(null);
  const [allHisab, setAllHisab] = useState<DailyHisab[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [formState, setFormState] = useState<Partial<IncomeRecord>>({
    income: 0,
    expense: 0,
    source: 'Daily Summary',
    description: '',
    date: today
  });

  useEffect(() => {
    // 1. Fetch Income Records
    const q = query(collection(db, 'incomes'), orderBy('date', 'desc'));
    const unsubscribeIncomes = onSnapshot(q, (snapshot) => {
      const incomeData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as IncomeRecord[];
      setIncomes(incomeData);
      setLoading(false);
    });

    // 2. Fetch ALL Daily Hisab records for aggregate total
    const qAllHisab = query(collection(db, 'daily_hisab'), orderBy('date', 'desc'));
    const unsubscribeAllHisab = onSnapshot(qAllHisab, (snapshot) => {
      const hisabData = snapshot.docs.map(doc => doc.data() as DailyHisab);
      setAllHisab(hisabData);
      
      const foundToday = hisabData.find(h => h.date === today);
      setTodayHisab(foundToday || null);
    });

    return () => {
      unsubscribeIncomes();
      unsubscribeAllHisab();
    };
  }, [today]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(i => 
      (i.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (i.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.date.includes(searchTerm)
    );
  }, [incomes, searchTerm]);

  // Aggregate stats from Daily Hisab (The "Actual" Profit)
  const totalNetProfitHisab = useMemo(() => {
    return allHisab.reduce((sum, h) => sum + (h.profitLoss || 0), 0);
  }, [allHisab]);

  const todayStats = useMemo(() => {
    const todayRecords = incomes.filter(i => i.date === today);
    const inc = todayRecords.reduce((sum, i) => sum + (i.income || 0), 0);
    const exp = todayRecords.reduce((sum, i) => sum + (i.expense || 0), 0);
    return { income: inc, expense: exp, net: inc + exp };
  }, [incomes, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formState,
        income: Number(formState.income) || 0,
        expense: Number(formState.expense) || 0,
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'incomes', editingId), data);
      } else {
        await addDoc(collection(db, 'incomes'), data);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving income summary:", error);
    }
  };

  const handleEditStart = (income: IncomeRecord) => {
    setEditingId(income.id);
    setFormState(income);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState({ income: 0, expense: 0, source: 'Daily Summary', description: '', date: today });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center space-x-6">
          <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-2xl">
            <Calculator size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Income Ledger</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time Financial "Hisab" Sync</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-transform">
          Record Custom Entry
        </button>
      </div>

      {/* Main Stats Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Total Net Profit (Aggregate Hisab) */}
        <div className="lg:col-span-7 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group border border-white/5 flex flex-col justify-between">
           <div className="absolute right-0 top-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-1000">
             <ShieldCheck size={200} />
           </div>
           <div className="relative z-10 space-y-4">
             <div className="flex items-center space-x-3">
               <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                 <Target size={20} />
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">Business Net Growth (Total Hisab)</p>
             </div>
             <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
               ৳{totalNetProfitHisab.toLocaleString()}
             </h1>
             <p className="text-slate-400 font-bold text-sm tracking-tight leading-relaxed max-w-md">
               This represents the total cumulative profit/loss based on all daily asset reconciliations recorded in the system.
             </p>
           </div>
           <div className="mt-8 flex items-center space-x-4">
              <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                 <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Status</p>
                 <div className={`flex items-center space-x-2 font-black text-sm ${totalNetProfitHisab >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalNetProfitHisab >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{totalNetProfitHisab >= 0 ? 'Surplus Balance' : 'Net Deficit'}</span>
                 </div>
              </div>
              <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                 <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Records Found</p>
                 <p className="text-sm font-black text-white">{allHisab.length} Closing Days</p>
              </div>
           </div>
        </div>

        {/* Today's Specific Hisab */}
        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8 flex flex-col justify-between">
           <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner">
                  <Calendar size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900 tracking-tight">Today's Result</h3>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{today}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculated Net</p>
                   <p className={`text-3xl font-black ${ (todayHisab?.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     ৳{(todayHisab?.profitLoss || 0).toLocaleString()}
                   </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                      <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Manual Inc</p>
                      <p className="text-lg font-black text-indigo-700">৳{todayStats.income.toLocaleString()}</p>
                   </div>
                   <div className="p-5 bg-rose-50/30 border border-rose-100 rounded-2xl">
                      <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Manual Exp</p>
                      <p className="text-lg font-black text-rose-700">৳{todayStats.expense.toLocaleString()}</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="pt-6 border-t border-slate-50 flex items-center justify-center space-x-2">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Verified Assets Data</span>
           </div>
        </div>
      </div>

      {/* Manual Ledger Records */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Manual Ledger Entries</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction History</p>
           </div>
           <div className="relative group min-w-[320px]">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-500" size={20} />
             <input type="text" placeholder="Search by date or description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Income</th>
                <th className="px-10 py-6">Expenses</th>
                <th className="px-10 py-6">Net (Manual)</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-10 py-32 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={48} /></td></tr>
              ) : filteredIncomes.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                     <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                        <span className="font-black text-slate-700">{inc.date}</span>
                     </div>
                  </td>
                  <td className="px-10 py-8 text-lg font-black text-emerald-600">৳{(inc.income || 0).toLocaleString()}</td>
                  <td className="px-10 py-8 font-black text-rose-500">৳{(inc.expense || 0).toLocaleString()}</td>
                  <td className="px-10 py-8 font-black text-indigo-700">৳{((inc.income || 0) + (inc.expense || 0)).toLocaleString()}</td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditStart(inc)} className="p-3 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-xl transition-all"><Edit2 size={18} /></button>
                      <button onClick={async () => { if(confirm(`Permanently delete this record?`)) await deleteDoc(doc(db, 'incomes', inc.id)); }} className="p-3 text-slate-400 hover:text-rose-600 bg-white shadow-sm border border-slate-100 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl p-14 border border-slate-100">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black uppercase tracking-tight">{editingId ? 'Modify' : 'Post'} Ledger</h3>
                <button onClick={handleCloseModal} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 block ml-1">Manual Income (৳)</label>
                    <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-6 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] font-black text-2xl text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={formState.income || ''} onChange={e => setFormState({...formState, income: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 block ml-1">Manual Expenses (৳)</label>
                    <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-6 bg-rose-50/30 border border-rose-100 rounded-[2rem] font-black text-2xl text-rose-600 outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" value={formState.expense || ''} onChange={e => setFormState({...formState, expense: Number(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Entry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input required type="date" className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all">
                  <Save size={20} />
                  <span>{editingId ? 'Push Update' : 'Commit to Ledger'}</span>
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomePage;
