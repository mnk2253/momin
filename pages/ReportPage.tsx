
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart
} from 'recharts';
// Redirected modular imports to local wrappers in firebase.ts
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  db
} from '../firebase';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Calendar, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight
} from 'lucide-react';
import { IncomeRecord, Expense, RentRecord } from '../types';

type ReportPeriod = 'Daily' | 'Monthly' | 'Yearly';

const ReportPage: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>('Daily');
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rents, setRents] = useState<RentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync all financial collections
    const unsubIncomes = onSnapshot(query(collection(db, 'incomes'), orderBy('date', 'desc')), (snap) => {
      setIncomes(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as IncomeRecord[]);
    });
    
    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snap) => {
      setExpenses(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Expense[]);
    });

    const unsubRents = onSnapshot(query(collection(db, 'rent_history'), orderBy('date', 'desc')), (snap) => {
      setRents(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as RentRecord[]);
      setLoading(false);
    });

    return () => {
      unsubIncomes();
      unsubExpenses();
      unsubRents();
    };
  }, []);

  const processedData = useMemo(() => {
    const dataMap: Record<string, { income: number; expense: number }> = {};
    const addToMap = (dateStr: string, inc: number, exp: number) => {
      let key = dateStr;
      if (period === 'Monthly') key = dateStr.substring(0, 7); 
      if (period === 'Yearly') key = dateStr.substring(0, 4); 

      if (!dataMap[key]) dataMap[key] = { income: 0, expense: 0 };
      dataMap[key].income += inc;
      dataMap[key].expense += exp;
    };

    incomes.forEach(i => addToMap(i.date, i.income || 0, Math.abs(i.expense || 0)));
    expenses.forEach(e => addToMap(e.date, 0, e.amount || 0));
    rents.forEach(r => addToMap(r.date, 0, r.amount || 0));

    return Object.entries(dataMap)
      .map(([label, values]) => ({
        label,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [incomes, expenses, rents, period]);

  const stats = useMemo(() => {
    const lastItem = processedData[processedData.length - 1] || { income: 0, expense: 0, net: 0 };
    return {
      current: lastItem,
      totalIncome: processedData.reduce((s, i) => s + i.income, 0),
      totalExpense: processedData.reduce((s, i) => s + i.expense, 0),
    };
  }, [processedData]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-slate-400 uppercase text-xs">Analyzing Data...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center space-x-6">
          <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-2xl">
            <BarChart3 size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Growth Reports</h2>
          </div>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-3xl flex items-center">
          {(['Daily', 'Monthly', 'Yearly'] as ReportPeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-8 py-3 rounded-[1.25rem] text-xs font-black uppercase transition-all ${period === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-black uppercase text-slate-400 mb-2">{period} Net Snapshot</p>
            <h1 className="text-6xl font-black text-white tracking-tighter">
              ৳{stats.current.net.toLocaleString()}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Income</p>
                <p className="text-2xl font-black text-white">৳{stats.totalIncome.toLocaleString()}</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Expense</p>
                <p className="text-2xl font-black text-white">৳{stats.totalExpense.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
         <h3 className="text-xl font-black text-slate-900 mb-10">Performance Timeline</h3>
         <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="income" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default ReportPage;
