import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  Receipt,
  X,
  Tag,
  ArrowDownCircle,
  Coffee,
  Lightbulb,
  Wifi,
  Briefcase,
  TrendingDown,
  Save
} from 'lucide-react';

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
  { id: 'Electricity' },
  { id: 'Internet/Wifi' },
  { id: 'Staff Salary' },
  { id: 'Tea & Snacks' },
  { id: 'Shop Rent' },
  { id: 'Baba' },
  { id: 'Maintenance' },
  { id: 'Bazar' },
  { id: 'Others' }
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
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({
        ...(d.data() as Expense),
        id: d.id
      }));
      setExpenses(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ===== TOTAL CALCULATIONS =====
  const todayTotal = expenses
    .filter(e => e.date === today)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const monthlyTotal = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const grandTotal = expenses.reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  const filteredExpenses = expenses.filter(e =>
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.date.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleEditStart = (ex: Expense) => {
    setEditingId(ex.id);
    setFormState(ex);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rose-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-rose-600 p-4 rounded-2xl text-white">
            <TrendingDown size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black">Expense Tracker</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Shop Outgoings
            </p>
          </div>
        </div>

        {/* TOTAL SUMMARY */}
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase">
              Today
            </p>
            <p className="text-xl font-black">৳{todayTotal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase">
              This Month
            </p>
            <p className="text-xl font-black">
              ৳{monthlyTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase">
              Total
            </p>
            <p className="text-xl font-black text-rose-600">
              ৳{grandTotal.toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2"
          >
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl border overflow-hidden">
        <div className="p-6">
          <input
            className="w-full p-3 rounded-xl bg-slate-50 border"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left text-xs">Date</th>
              <th className="p-4 text-left text-xs">Category</th>
              <th className="p-4 text-left text-xs">Description</th>
              <th className="p-4 text-left text-xs">Amount</th>
              <th className="p-4 text-right text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-4">{e.date}</td>
                <td className="p-4">{e.category}</td>
                <td className="p-4">{e.description}</td>
                <td className="p-4 font-black text-rose-600">
                  ৳{e.amount.toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleEditStart(e)}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() =>
                      confirm('Delete?') &&
                      deleteDoc(doc(db, 'expenses', e.id))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4"
          >
            <h3 className="text-2xl font-black">
              {editingId ? 'Edit Expense' : 'New Expense'}
            </h3>

            <select
              className="w-full p-3 rounded-xl border"
              value={formState.category}
              onChange={e =>
                setFormState({ ...formState, category: e.target.value })
              }
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id}>{c.id}</option>
              ))}
            </select>

            <input
              type="number"
              required
              className="w-full p-3 rounded-xl border"
              value={formState.amount || ''}
              onChange={e =>
                setFormState({ ...formState, amount: Number(e.target.value) })
              }
            />

            <input
              type="date"
              className="w-full p-3 rounded-xl border"
              value={formState.date}
              onChange={e =>
                setFormState({ ...formState, date: e.target.value })
              }
            />

            <textarea
              className="w-full p-3 rounded-xl border"
              placeholder="Description"
              value={formState.description}
              onChange={e =>
                setFormState({ ...formState, description: e.target.value })
              }
            />

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-rose-600 text-white p-3 rounded-xl font-black"
              >
                <Save size={16} /> Save
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-3"
              >
                <X />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
