
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  Receipt, 
  Calendar, 
  X, 
  CheckCircle2, 
  Tag, 
  ArrowDownCircle, 
  Coffee, 
  Lightbulb, 
  Wifi, 
  Briefcase,
  TrendingDown,
  Save
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
import { Expense } from '../types';

const EXPENSE_CATEGORIES = [
  { id: 'Electricity', icon: <Lightbulb size={16} /> },
  { id: 'Internet/Wifi', icon: <Wifi size={16} /> },
  { id: 'Staff Salary', icon: <Briefcase size={16} /> },
  { id: 'Tea & Snacks', icon: <Coffee size={16} /> },
  { id: 'Shop Rent', icon: <ArrowDownCircle size={16} /> },
  { id: 'Baba', icon: <Tag size={16} /> },
  { id: 'Maintenance', icon: <Receipt size={16} /> },
  { id: 'Bazar', icon: <Plus size={16} /> }
];

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const [formState, setFormState] = useState<Partial<Expense>>({
    amount: 0,
    category: 'Others',
    description: '',
    date: today
  });

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Expense[];
      setExpenses(expenseData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Summary Calculations
  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const monthlyTotal = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.date.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formState,
        amount: Number(formState.amount),
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), data);
      } else {
        await addDoc(collection(db, 'expenses'), data);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormState({ amount: 0, category: 'Others', description: '', date: today });
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense.");
    }
  };

  const handleEditStart = (expense: Expense) => {
    setEditingId(expense.id);
    setFormState({
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date
    });
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-rose-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-rose-100">
              <TrendingDown size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Expense Tracker</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Shop Outgoings v2.5</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Today's Total</p>
             <p className="text-2xl font-black text-slate-900">৳{todayTotal.toLocaleString()}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-3 hover:bg-rose-700 transition-all font-black shadow-xl shadow-rose-100 active:scale-95"
          >
            <Plus size={20} />
            <span className="uppercase tracking-widest text-xs">Add Expense</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
             <input 
               type="text" 
               placeholder="Search expenses..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-sm"
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{e.date}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-medium text-slate-700">{e.description}</td>
                  <td className="px-8 py-6 font-black text-rose-600">৳{e.amount.toLocaleString()}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditStart(e)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                      <button onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'expenses', e.id)); }} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="text-2xl font-black">{editingId ? 'Edit' : 'New'} Expense</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={formState.category} onChange={e => setFormState({...formState, category: e.target.value})}>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.id}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (৳)</label>
                <input required type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl" value={formState.amount || ''} onChange={e => setFormState({...formState, amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label>
                <input required type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24 resize-none" value={formState.description} onChange={e => setFormState({...formState, description: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-rose-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2">
                <Save size={18} />
                <span>Save Expense</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
