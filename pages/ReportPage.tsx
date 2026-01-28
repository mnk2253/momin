
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
  Loader2, 
  Calculator,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { IncomeRecord } from '../types';

type ReportPeriod = 'Daily' | 'Monthly' | 'Yearly';

const ReportPage: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>('Daily');
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only sync the 'incomes' collection for reporting
    const unsubIncomes = onSnapshot(query(collection(db, 'incomes'), orderBy('date', 'desc')), (snap) => {
      setIncomes(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as IncomeRecord[]);
      setLoading(false);
    });

    return () => {
      unsubIncomes();
    };
  }, []);

  const processedData = useMemo(() => {
    const dataMap: Record<string, { income: number; expense: number }> = {};
    
    incomes.forEach(i => {
      let key = i.date;
      if (period === 'Monthly') key = i.date.substring(0, 7); 
      if (period === 'Yearly') key = i.date.substring(0, 4); 

      if (!dataMap[key]) dataMap[key] = { income: 0, expense: 0 };
      
      // Values are added based on user instruction: Net Profit = Income + Expense
      dataMap[key].income += (i.income || 0);
      dataMap[key].expense += (i.expense || 0);
    });

    return Object.entries(dataMap)
      .map(([label, values]) => ({
        label,
        income: values.income,
        expense: values.expense,
        net: values.income + values.expense // Using Addition as requested
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [incomes, period]);

  const stats = useMemo(() => {
    const totalIncome = processedData.reduce((s, i) => s + i.income, 0);
    const totalExpense = processedData.reduce((s, i) => s + i.expense, 0);
    const lastItem = processedData[processedData.length - 1] || { income: 0, expense: 0, net: 0 };
    
    return {
      current: lastItem,
      totalIncome,
      totalExpense,
      totalNet: totalIncome + totalExpense // Using Addition for total as well
    };
  }, [processedData]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Analyzing Income Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center space-x-6">
          <div className="bg-indigo-600 p-5 rounded-[2rem] text-white shadow-2xl shadow-indigo-100">
            <BarChart3 size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Business Growth</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Based on Income Ledger Only</p>
          </div>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-3xl flex items-center shadow-inner">
          {(['Daily', 'Monthly', 'Yearly'] as ReportPeriod[]).map((p) => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)} 
              className={`px-8 py-3 rounded-[1.25rem] text-xs font-black uppercase transition-all ${period === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute right-0 top-0 p-12 opacity-5">
           <Calculator size={160} />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-black uppercase text-indigo-400 tracking-[0.3em]">Total Cumulative Profit</p>
            <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
              ৳{stats.totalNet.toLocaleString()}
            </h1>
            <div className="flex items-center space-x-4 pt-2">
               <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${stats.totalNet >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                 {stats.totalNet >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                 <span>Overall {stats.totalNet >= 0 ? 'Surplus' : 'Deficit'}</span>
               </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Income</p>
                <p className="text-2xl font-black text-white">৳{stats.totalIncome.toLocaleString()}</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Expenses</p>
                <p className="text-2xl font-black text-white">৳{stats.totalExpense.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance Timeline</h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Net profit visualization ({period})</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Income</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense</span>
              </div>
            </div>
         </div>

         <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                />
                <Bar dataKey="income" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={period === 'Daily' ? 15 : 40} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={period === 'Daily' ? 15 : 40} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
           <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Period Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-5">Time Period</th>
                <th className="px-10 py-5">Income (৳)</th>
                <th className="px-10 py-5">Expense (৳)</th>
                <th className="px-10 py-5">Net Profit (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedData.slice().reverse().map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-10 py-6 font-black text-slate-700">{row.label}</td>
                  <td className="px-10 py-6 text-emerald-600 font-bold">৳{row.income.toLocaleString()}</td>
                  <td className="px-10 py-6 text-rose-500 font-bold">৳{row.expense.toLocaleString()}</td>
                  <td className={`px-10 py-6 font-black ${row.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    ৳{row.net.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
