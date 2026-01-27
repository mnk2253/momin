
import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Search, ChevronDown, Loader2, Folder, Clock, TrendingUp, TrendingDown, Calculator, ArrowUpRight, ArrowDownRight } from 'lucide-react';
// Redirected modular imports to local wrappers in firebase.ts
import { collection, onSnapshot, query, orderBy, db } from '../firebase';
import { HistoryRecord, AccountProvider, ProviderClosing } from '../types';
import { ACCOUNT_PROVIDERS } from '../constants';

interface DailyHisab {
  pastCash: number;
  mainCash: number;
  profitLoss: number;
  date: string;
}

interface GroupedDay {
  date: string;
  closings: Record<string, ProviderClosing>;
  totalBalance: number;
  hisab?: DailyHisab;
}

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [dailyHisab, setDailyHisab] = useState<DailyHisab[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState<AccountProvider | 'all'>('all');

  useEffect(() => {
    // 1. Fetch account history records
    const qHistory = query(collection(db, 'history'), orderBy('date', 'desc'));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as HistoryRecord[];
      setHistory(historyData);
    });

    // 2. Fetch Daily Hisab (Past/Main Cash summaries)
    const qHisab = query(collection(db, 'daily_hisab'), orderBy('date', 'desc'));
    const unsubscribeHisab = onSnapshot(qHisab, (snapshot) => {
      const hisabData = snapshot.docs.map(doc => ({
        ...doc.data(),
      })) as DailyHisab[];
      setDailyHisab(hisabData);
      setLoading(false);
    });

    return () => {
      unsubscribeHistory();
      unsubscribeHisab();
    };
  }, []);

  // Logic to group multiple records by their date string
  const groupedHistory: GroupedDay[] = React.useMemo(() => {
    const groups: Record<string, GroupedDay> = {};

    // First, process account history
    history.forEach(record => {
      if (!record || !record.date) return;
      
      const dateKey = record.date;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          closings: {},
          totalBalance: 0
        };
      }

      if (record.closings) {
        Object.entries(record.closings).forEach(([provider, data]) => {
          if (providerFilter !== 'all' && provider !== providerFilter) return;
          const closingData = data as ProviderClosing;
          const existing = groups[dateKey].closings[provider];
          if (!existing || (closingData.timestamp > existing.timestamp)) {
            groups[dateKey].closings[provider] = closingData;
          }
        });
      }
    });

    // Merge Daily Hisab data into the groups
    dailyHisab.forEach(h => {
      if (!groups[h.date]) {
         groups[h.date] = {
           date: h.date,
           closings: {},
           totalBalance: 0
         };
      }
      groups[h.date].hisab = h;
    });

    // Calculate totals and convert to array
    return Object.values(groups)
      .map(group => {
        const total = Object.values(group.closings).reduce((sum, c) => sum + (c.totalBalance || 0), 0);
        return { ...group, totalBalance: total };
      })
      .filter(group => {
        const matchesSearch = group.date.includes(searchTerm);
        // If provider filter is active, only show if that provider was closed OR if searching for date
        const hasClosings = Object.keys(group.closings).length > 0;
        const hasHisab = !!group.hisab;
        return matchesSearch && (hasClosings || hasHisab);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [history, dailyHisab, searchTerm, providerFilter]);

  const getProviderInfo = (pid: AccountProvider) => {
    return ACCOUNT_PROVIDERS.find(p => p.id === pid);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white">
            <HistoryIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Closing History</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Unified Daily Folders</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Filter by date..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full transition-all text-sm font-medium" 
            />
          </div>
          
          <div className="relative group min-w-[140px]">
            <select 
              value={providerFilter} 
              onChange={(e) => setProviderFilter(e.target.value as any)}
              className="pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
            >
              <option value="all">All Wallets</option>
              {ACCOUNT_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-5">
        {loading ? (
          <div className="bg-white p-20 rounded-[2.5rem] text-center shadow-sm border border-slate-100">
            <Loader2 className="animate-spin mx-auto text-indigo-500 mb-4" size={48} />
            <p className="font-black text-slate-400 uppercase tracking-widest">Retrieving Daily Folders...</p>
          </div>
        ) : groupedHistory.length > 0 ? (
          groupedHistory.map((dayGroup) => {
            const isExpanded = expandedDate === dayGroup.date;
            const formattedDate = new Date(dayGroup.date).toLocaleDateString('en-US', {
               weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            return (
              <div key={dayGroup.date} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                {/* Date Header (Folder) */}
                <div 
                  className={`p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/80 transition-all ${isExpanded ? 'bg-indigo-50/30 border-b border-slate-100' : ''}`}
                  onClick={() => setExpandedDate(isExpanded ? null : dayGroup.date)}
                >
                  <div className="flex items-center space-x-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Folder size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{formattedDate}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dayGroup.hisab && (
                           <span className="text-[9px] font-black px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-600 bg-white uppercase tracking-tighter">
                            Daily Hisab Logged
                          </span>
                        )}
                        {Object.keys(dayGroup.closings).map(pid => {
                          const pInfo = getProviderInfo(pid as AccountProvider);
                          return (
                            <span key={pid} className="text-[9px] font-black px-2 py-0.5 rounded-lg border border-slate-200 text-slate-500 bg-white uppercase tracking-tighter">
                              {pInfo?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-10">
                    <div className="text-right">
                      <p className={`text-2xl font-black ${ (dayGroup.hisab?.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ৳{(dayGroup.hisab?.profitLoss || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-white text-slate-300 border border-slate-100'}`}>
                      <ChevronDown size={24} />
                    </div>
                  </div>
                </div>

                {/* Expanded Sections for that Date */}
                {isExpanded && (
                  <div className="p-6 md:p-8 bg-slate-50/20 space-y-10 animate-in slide-in-from-top-4 duration-300">
                    
                    {/* 1. Daily Summary (Past/Main Cash) */}
                    {dayGroup.hisab && (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                           <Calculator size={18} className="text-indigo-600" />
                           <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Financial Summary (Opening & Closing)</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Past Cash (Opening)</p>
                              <p className="text-xl font-black text-slate-800">৳{(dayGroup.hisab.pastCash || 0).toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Clock size={20} /></div>
                          </div>
                          
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Main Cash (Closing)</p>
                              <p className="text-xl font-black text-indigo-600">৳{(dayGroup.hisab.mainCash || 0).toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">৳</div>
                          </div>

                          <div className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between ${ (dayGroup.hisab.profitLoss || 0) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div>
                              <p className={`text-[9px] font-black uppercase mb-1 ${ (dayGroup.hisab.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                Net Profit/Loss
                              </p>
                              <p className={`text-xl font-black ${ (dayGroup.hisab.profitLoss || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                ৳{(dayGroup.hisab.profitLoss || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${ (dayGroup.hisab.profitLoss || 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                              {(dayGroup.hisab.profitLoss || 0) >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Provider Closings List */}
                    {Object.keys(dayGroup.closings).length > 0 && (
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                           <HistoryIcon size={18} className="text-indigo-600" />
                           <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">All Account History</h5>
                        </div>
                        {Object.values(dayGroup.closings)
                          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
                          .map((closing) => {
                            const info = getProviderInfo(closing.provider);
                            const formattedTime = closing.timestamp ? new Date(closing.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            }) : 'N/A';

                            return (
                              <div key={closing.provider} className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-lg ${info?.color || 'bg-slate-500'} flex items-center justify-center text-white text-[10px]`}>
                                      <img src={info?.logo} className="w-5 h-5 object-contain rounded" alt="" />
                                    </div>
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                      {info?.name} — Final Sync at {formattedTime}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-indigo-600">৳{(closing.totalBalance || 0).toLocaleString()}</span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {(closing.accounts || []).map((acc, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-indigo-200 transition-colors group">
                                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-[10px] border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                        #{acc.slNumber}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-black text-slate-800 text-sm truncate">{acc.number}</h5>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{acc.type}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">৳{(acc.balance || 0).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-100 text-slate-300">
            <Folder size={64} className="mx-auto mb-4 opacity-10" />
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Empty Archive</h3>
            <p className="text-sm font-bold text-slate-400">Perform a daily closing to generate history folders.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
