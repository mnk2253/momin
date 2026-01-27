
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
  Target
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
  profitLoss: number;
  date: string;
}

const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dailyHisab, setDailyHisab] = useState<DailyHisab | null>(null);
  
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

    // 2. Fetch Dashboard's Daily Hisab
    const qHisab = query(collection(db, 'daily_hisab'), where('date', '==', today), limit(1));
    const unsubscribeHisab = onSnapshot(qHisab, (snapshot) => {
      if (!snapshot.empty) {
        setDailyHisab(snapshot.docs[0].data() as DailyHisab);
      } else {
        setDailyHisab(null);
      }
    });

    return () => {
      unsubscribeIncomes();
      unsubscribeHisab();
    };
  }, [today]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(i => 
      (i.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (i.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.date.includes(searchTerm)
    );
  }, [incomes, searchTerm]);

  const aggregateIncome = useMemo(() => filteredIncomes.reduce((sum, i) => sum + (i.income || 0), 0), [filteredIncomes]);
  const aggregateExpense = useMemo(() => filteredIncomes.reduce((sum, i) => sum + (i.expense || 0), 0), [filteredIncomes]);
  const aggregateNet = aggregateIncome + aggregateExpense;

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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Automatic Balance Tracking</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs shadow-xl">
          Record Today Hisab
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
              ৳{(dailyHisab?.profitLoss || 0).toLocaleString()}
            </h1>
            <p className="text-slate-400 font-bold text-sm tracking-tight leading-relaxed max-w-md">
              Daily Profit/Loss as synchronized with dashboard asset analysis.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Income</p>
                <p className="text-2xl font-black text-white">৳{todayStats.income.toLocaleString()}</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Expense</p>
                <p className="text-2xl font-black text-white">৳{todayStats.expense.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
           <div className="relative flex-1 max-w-lg">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
             <input type="text" placeholder="Search ledger..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-6">Date</th>
                <th className="px-10 py-6">Income</th>
                <th className="px-10 py-6">Expenses</th>
                <th className="px-10 py-6">Net</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-10 py-32 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={48} /></td></tr>
              ) : filteredIncomes.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-8 font-black text-slate-700">{inc.date}</td>
                  <td className="px-10 py-8 text-lg font-black text-emerald-600">৳{(inc.income || 0).toLocaleString()}</td>
                  <td className="px-10 py-8 font-black text-rose-500">৳{(inc.expense || 0).toLocaleString()}</td>
                  <td className="px-10 py-8 font-black text-indigo-700">৳{((inc.income || 0) + (inc.expense || 0)).toLocaleString()}</td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => handleEditStart(inc)} className="p-3 text-slate-400 hover:text-indigo-600"><Edit2 size={20} /></button>
                    <button onClick={async () => { if(confirm(`Delete?`)) await deleteDoc(doc(db, 'incomes', inc.id)); }} className="p-3 text-slate-400 hover:text-rose-600"><Trash2 size={20} /></button>
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
             <h3 className="text-3xl font-black uppercase mb-8">{editingId ? 'Modify' : 'Post'} Hisab</h3>
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-emerald-500 uppercase mb-2 block">Income (৳)</label>
                    <input required type="number" className="w-full px-6 py-6 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] font-black text-2xl text-emerald-600" value={formState.income || ''} onChange={e => setFormState({...formState, income: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-rose-500 uppercase mb-2 block">Expenses (৳)</label>
                    <input required type="number" className="w-full px-6 py-6 bg-rose-50/30 border border-rose-100 rounded-[2rem] font-black text-2xl text-rose-600" value={formState.expense || ''} onChange={e => setFormState({...formState, expense: Number(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Date</label>
                  <input required type="date" className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                  <Save size={20} />
                  <span>{editingId ? 'Push Update' : 'Commit Ledger'}</span>
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomePage;
