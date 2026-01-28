
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
// Redirected modular imports to local wrappers in firebase.ts
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  setDoc,
  getDocs,
  db
} from '../firebase';
import { 
  Wallet, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Loader2, 
  HandCoins, 
  Package, 
  Receipt, 
  TrendingDown, 
  Calculator,
  Briefcase,
  Activity,
  History,
  Edit2,
  Check,
  Save,
  Clock,
  Minus,
  Plus as PlusIcon,
  PieChart as PieIcon
} from 'lucide-react';
import { IncomeRecord } from '../types';

const PROVIDER_COLORS: Record<string, string> = {
  bkash: '#e2136e',
  nagad: '#f7941d',
  rocket: '#8c3494',
  flexiload: '#0084ff',
  hand_cash: '#16a34a',
  others: '#94a3b8'
};

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-all group">
    <div>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
      <div className="flex items-center mt-2">
        <span className={`text-[9px] flex items-center font-black uppercase tracking-widest ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} className="mr-1" /> : trend === 'down' ? <ArrowDownRight size={12} className="mr-1" /> : <Activity size={12} className="mr-1" />}
          {subValue}
        </span>
      </div>
    </div>
    <div className={`p-4 rounded-2xl ${color} text-white shadow-xl shadow-opacity-20 transition-transform group-hover:scale-110`}>
      <Icon size={24} />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    walletBalance: 0,
    walletCount: 0,
    marketDues: 0,
    customerCount: 0,
    totalLoan: 0,
    loanCount: 0,
    stockBalance: 0,
    todayProfit: 0,
    todayExpenses: 0,
  });
  
  const [pastCash, setPastCash] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [isPastCashEditing, setIsPastCashEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSavingClosing, setIsSavingClosing] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // 1. Listen to Wallets/Accounts
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
      let balance = 0;
      const providerTotals: Record<string, number> = {};
      
      snap.forEach(doc => {
        const data = doc.data();
        const bal = (data.balance || 0);
        balance += bal;
        
        const provider = data.provider || 'others';
        providerTotals[provider] = (providerTotals[provider] || 0) + bal;
      });

      // Format data for Pie Chart
      const formattedPieData = Object.entries(providerTotals)
        .filter(([_, val]) => val > 0)
        .map(([key, val]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
          value: val,
          key: key
        }))
        .sort((a, b) => b.value - a.value);

      setPieData(formattedPieData);
      setStats(prev => ({ ...prev, walletBalance: balance, walletCount: snap.size }));
      setLoading(false);
    });

    // 2. Listen to Customers (Dues)
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      let due = 0;
      snap.forEach(doc => due += (doc.data().currentDue || 0));
      setStats(prev => ({ ...prev, marketDues: due, customerCount: snap.size }));
    });

    // 3. Listen to Loans (Using "Close Due" logic)
    const unsubLoans = onSnapshot(collection(db, 'loans'), (snap) => {
      let totalCloseDue = 0;
      snap.forEach(doc => {
        const data = doc.data();
        // Calculation: Math.max(0, currentDue - totalSavings) matching LoanManagement page logic
        const closeDue = Math.max(0, (data.currentDue || 0) - (data.totalSavings || 0));
        totalCloseDue += closeDue;
      });
      setStats(prev => ({ ...prev, totalLoan: totalCloseDue, loanCount: snap.size }));
    });

    // 4. Listen to Products (Stock)
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      let stock = 0;
      snap.forEach(doc => stock += (doc.data().totalValue || 0));
      setStats(prev => ({ ...prev, stockBalance: stock }));
    });

    // 5. Listen to Today's Combined Income Records & Chart Data
    const unsubIncome = onSnapshot(
      query(collection(db, 'incomes'), orderBy('date', 'desc'), limit(30)),
      (snap) => {
        let totalIncToday = 0;
        let totalExpToday = 0;
        const dataByDate: Record<string, { income: number; expense: number }> = {};

        snap.forEach(doc => {
          const data = doc.data() as IncomeRecord;
          if (data.date === todayStr) {
            totalIncToday += (data.income || 0);
            totalExpToday += (data.expense || 0);
          }
          
          if (!dataByDate[data.date]) {
            dataByDate[data.date] = { income: 0, expense: 0 };
          }
          dataByDate[data.date].income += (data.income || 0);
          dataByDate[data.date].expense += Math.abs(data.expense || 0);
        });

        // Format last 7 days for chart
        const sortedChartData = Object.entries(dataByDate)
          .map(([date, vals]) => ({
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            date,
            income: vals.income,
            expense: vals.expense,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7);

        setChartData(sortedChartData);
        setStats(prev => ({ ...prev, todayProfit: totalIncToday - totalExpToday, todayExpenses: totalExpToday }));
      }
    );

    // 6. Intelligent Past Cash Fetching Logic
    const fetchPastCash = async () => {
      const todayDoc = query(collection(db, 'daily_hisab'), where('date', '==', todayStr));
      const todaySnap = await getDocs(todayDoc);
      
      if (!todaySnap.empty) {
        const todayData = todaySnap.docs[0].data();
        setPastCash(todayData.pastCash || 0);
      } else {
        const prevDoc = query(
          collection(db, 'daily_hisab'), 
          where('date', '<', todayStr), 
          orderBy('date', 'desc'), 
          limit(1)
        );
        const prevSnap = await getDocs(prevDoc);
        if (!prevSnap.empty) {
          const prevData = prevSnap.docs[0].data();
          setPastCash(prevData.mainCash || 0); 
        }
      }
    };

    fetchPastCash();

    return () => {
      unsubAccounts();
      unsubCustomers();
      unsubLoans();
      unsubProducts();
      unsubIncome();
    };
  }, [todayStr]);

  // Derived Calculations
  const totalBalance = (stats.walletBalance || 0) + (stats.marketDues || 0) + (stats.stockBalance || 0);
  const mainCash = totalBalance - (stats.totalLoan || 0);
  const profitLoss = mainCash - (pastCash || 0);

  const handleSaveClosing = async () => {
    setIsSavingClosing(true);
    try {
      await setDoc(doc(db, 'daily_hisab', todayStr), {
        date: todayStr,
        totalBalance,
        totalLoan: stats.totalLoan,
        mainCash,
        pastCash,
        profitLoss,
        lastUpdated: new Date().toISOString()
      });
      alert("Daily Hisab Closed Successfully!");
    } catch (error) {
      console.error("Error closing day:", error);
    } finally {
      setIsSavingClosing(false);
    }
  };

  const handleUpdatePastCash = async () => {
    setIsPastCashEditing(false);
    try {
      await setDoc(doc(db, 'daily_hisab', todayStr), {
        date: todayStr,
        pastCash,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating past cash:", error);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Financial Cloud...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Top Banner: Grand Total */}
      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-1000">
           <Calculator size={160} />
         </div>
         <div className="relative z-10 space-y-4">
           <div className="flex items-center space-x-3">
             <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
               <Activity size={20} />
             </div>
             <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Aggregate Business Liquidity</p>
           </div>
           <h1 className="text-5xl font-black tracking-tighter leading-none">৳{(totalBalance || 0).toLocaleString()}</h1>
           <p className="text-slate-400 font-bold text-sm tracking-tight flex items-center">
             Wallets (৳{(stats.walletBalance || 0).toLocaleString()}) + Dues (৳{(stats.marketDues || 0).toLocaleString()}) + Stock (৳{(stats.stockBalance || 0).toLocaleString()}) - Loan (৳{(stats.totalLoan || 0).toLocaleString()})
           </p>
         </div>
         <div className="mt-8 md:mt-0 flex flex-col items-end gap-3 relative z-10">
            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
               <p className="text-[9px] font-black uppercase text-slate-400 mb-1">System Clock</p>
               <p className="text-sm font-black text-white flex items-center">
                 <Clock size={14} className="mr-2 text-indigo-400" />
                 {todayStr}
               </p>
            </div>
            <button 
              onClick={handleSaveClosing}
              disabled={isSavingClosing}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/50 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSavingClosing ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Commit Daily Closing
            </button>
         </div>
      </div>

      {/* Row 1: Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Wallet Balance" value={`৳${(stats.walletBalance || 0).toLocaleString()}`} subValue={`${stats.walletCount || 0} Wallets`} icon={Wallet} color="bg-indigo-600" trend="up" />
        <StatCard title="Market Dues" value={`৳${(stats.marketDues || 0).toLocaleString()}`} subValue={`${stats.customerCount || 0} Clients`} icon={Users} color="bg-orange-500" trend="down" />
        <StatCard title="Loan Close Due" value={`৳${(stats.totalLoan || 0).toLocaleString()}`} subValue={`${stats.loanCount || 0} Profiles`} icon={HandCoins} color="bg-rose-600" trend="down" />
        <StatCard title="Stock Balance" value={`৳${(stats.stockBalance || 0).toLocaleString()}`} subValue="Inventory Value" icon={Package} color="bg-amber-500" trend="up" />
      </div>

      {/* Financial Health Section (Profit/Loss Logic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* The "Hisab" Panel */}
        <div className="lg:col-span-6 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between space-y-8">
           <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Calculator size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Financial "Hisab"</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Real-time Asset Analysis</p>
              </div>
           </div>

           <div className="space-y-4">
             {/* Total Cash / Assets Row */}
             <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><PlusIcon size={14} /></div>
                   <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Total Cash (Assets)</p>
                </div>
                <p className="text-xl font-black text-slate-900">৳{(totalBalance || 0).toLocaleString()}</p>
             </div>

             {/* Total Loan Row */}
             <div className="flex items-center justify-between p-5 bg-rose-50/30 rounded-2xl border border-rose-100">
                <div className="flex items-center space-x-3">
                   <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Minus size={14} /></div>
                   <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Loan Close Due (Debt)</p>
                </div>
                <p className="text-xl font-black text-rose-600">- ৳{(stats.totalLoan || 0).toLocaleString()}</p>
             </div>

             <div className="h-px bg-slate-100 mx-2"></div>

             {/* Main Cash Row */}
             <div className="flex items-center justify-between p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100 shadow-inner">
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Main Cash (Closing)</p>
                   <p className="text-[9px] text-indigo-400 italic font-bold">Today's Remaining Value</p>
                </div>
                <div className="text-right">
                   <p className="text-3xl font-black text-indigo-700">৳{(mainCash || 0).toLocaleString()}</p>
                </div>
             </div>

             {/* Past Cash Row */}
             <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${isPastCashEditing ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20' : 'bg-slate-50/80 border-slate-200'}`}>
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Past Cash (Opening)</p>
                   <p className="text-[9px] text-slate-400 font-bold italic">Brought Forward</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-black">৳</span>
                    {isPastCashEditing ? (
                      <input 
                        type="number" 
                        autoFocus
                        onWheel={(e) => e.currentTarget.blur()}
                        value={pastCash} 
                        onChange={(e) => setPastCash(Number(e.target.value))}
                        className="w-32 pl-4 py-1 text-right bg-transparent border-b-2 border-amber-500 outline-none font-black text-xl text-amber-700 transition-all"
                        placeholder="0"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-700">৳{(pastCash || 0).toLocaleString()}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => isPastCashEditing ? handleUpdatePastCash() : setIsPastCashEditing(true)}
                    className={`p-2 rounded-lg transition-all ${isPastCashEditing ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    {isPastCashEditing ? <Check size={16} /> : <Edit2 size={16} />}
                  </button>
                </div>
             </div>

             {/* Net Profit/Loss Display */}
             <div className={`p-8 rounded-[2rem] flex items-center justify-between text-white shadow-2xl transition-all ${profitLoss >= 0 ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}>
                <div>
                   <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1">Total {profitLoss >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                   <h2 className="text-4xl font-black tracking-tighter leading-tight">৳{(profitLoss || 0).toLocaleString()}</h2>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                   {profitLoss >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                </div>
             </div>
           </div>

           <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest flex items-center justify-center pt-4">
              <History size={12} className="mr-2" />
              Formula: (Total Cash - Loan Close Due) - Past Cash
           </div>
        </div>

        {/* Charts Panel */}
        <div className="lg:col-span-6 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Business Velocity</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Income vs Expense History</p>
              </div>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Income</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-50"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense</span>
                </div>
              </div>
           </div>

           <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                 />
                 <Bar dataKey="income" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={20} />
                 <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Row 3: Wallet Distribution (Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <PieIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Wallet Distribution</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Balance breakdown by provider</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {Object.entries(PROVIDER_COLORS).map(([provider, color]) => (
                  <div key={provider} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{provider.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={8}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.key] || PROVIDER_COLORS.others} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px', fontWeight: 'bold' }} 
                      formatter={(value: number) => `৳${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {pieData.map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: PROVIDER_COLORS[item.key] || PROVIDER_COLORS.others }}>
                         <Wallet size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Balance</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-slate-900">৳{item.value.toLocaleString()}</p>
                       <p className="text-[10px] font-bold text-indigo-500">{((item.value / stats.walletBalance) * 100).toFixed(1)}% of total</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
