
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Wallet, Landmark, Trash2, Edit2, Loader2, X, CheckCircle2, Save, Zap } from 'lucide-react';
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
  writeBatch,
  setDoc,
  db
} from '../firebase';
import { Account, AccountProvider, AccountType, ProviderClosing } from '../types';
import { ACCOUNT_PROVIDERS, ACCOUNT_TYPES, FLEXILOAD_TYPES, CARRIER_LOGOS } from '../constants';

const AccountPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeClosingProvider, setActiveClosingProvider] = useState<AccountProvider | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [tempBalances, setTempBalances] = useState<Record<string, string>>({});
  
  const modalRef = useRef<HTMLDivElement>(null);

  const [formState, setFormState] = useState<Partial<Account>>({
    slNumber: 1,
    provider: 'bkash',
    type: 'Agent',
    balance: 0,
    number: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('slNumber', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Account[];
      setAccounts(accountsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenClosingModal = (provider: AccountProvider) => {
    const providerAccounts = accounts.filter(a => a.provider === provider);
    const initialBalances: Record<string, string> = {};
    providerAccounts.forEach(acc => {
      initialBalances[acc.id] = acc.balance.toString();
    });
    setTempBalances(initialBalances);
    setActiveClosingProvider(provider);
  };

  const handleCloseClosingModal = () => {
    setActiveClosingProvider(null);
    setTempBalances({});
  };

  const handleSaveAllBalances = async (provider: AccountProvider) => {
    const providerAccounts = accounts.filter(a => a.provider === provider);
    
    // Prepare history snapshot data for this specific provider
    const historyAccounts = providerAccounts.map(acc => ({
      slNumber: acc.slNumber,
      number: acc.number,
      type: acc.type,
      balance: tempBalances[acc.id] !== undefined ? Number(tempBalances[acc.id]) : acc.balance
    }));

    const totalBalance = historyAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const todayDate = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const closingData: ProviderClosing = {
      provider: provider,
      timestamp: now,
      totalBalance: totalBalance,
      accounts: historyAccounts
    };

    setIsSavingAll(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Update Current Accounts
      providerAccounts.forEach(acc => {
        const newBal = tempBalances[acc.id] !== undefined ? Number(tempBalances[acc.id]) : acc.balance;
        const accRef = doc(db, 'accounts', acc.id);
        batch.update(accRef, {
          balance: newBal,
          lastDailyUpdate: now
        });
      });

      // 2. Save to History (Unified Daily Document)
      const historyDocRef = doc(db, 'history', todayDate);
      await setDoc(historyDocRef, {
        id: todayDate,
        date: todayDate,
        lastUpdated: now,
        closings: {
          [provider]: closingData
        }
      }, { merge: true });

      await batch.commit();
      handleCloseClosingModal();
    } catch (error) {
      console.error("Error updating balances:", error);
      alert("Failed to update balances.");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, inputClass: string) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); 
      const container = modalRef.current || document;
      const inputs = container.querySelectorAll(`.${inputClass}`) as NodeListOf<HTMLInputElement>;
      
      let nextIndex = index;
      if (e.key === 'ArrowDown') nextIndex = index + 1;
      else if (e.key === 'ArrowUp') nextIndex = index - 1;

      if (nextIndex >= 0 && nextIndex < inputs.length) {
        const nextInput = inputs[nextIndex];
        nextInput.focus();
        nextInput.select();
        nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const getProviderDisplay = (account: Account) => {
    const info = ACCOUNT_PROVIDERS.find(p => p.id === account.provider);
    let logoUrl = info?.logo;
    if (account.provider === 'flexiload' && CARRIER_LOGOS[account.type]) {
      logoUrl = CARRIER_LOGOS[account.type];
    }
    return (
      <div className="flex items-center space-x-3">
        {logoUrl ? (
          <img src={logoUrl} alt={account.provider} className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-100 shadow-sm" />
        ) : (
          <div className={`w-10 h-10 rounded-xl ${info?.color || 'bg-slate-400'} flex items-center justify-center text-white shadow-sm`}><Wallet size={20} /></div>
        )}
        <span className="font-bold text-slate-900 uppercase tracking-tight">{info?.name || account.provider}</span>
      </div>
    );
  };

  const renderClosingModal = (providerId: AccountProvider, title: string, colorClass: string, focusColorClass: string, inputClass: string) => {
    if (activeClosingProvider !== providerId) return null;

    const providerAccounts = accounts.filter(a => a.provider === providerId);
    const providerInfo = ACCOUNT_PROVIDERS.find(p => p.id === providerId);
    
    const changedCount = Object.keys(tempBalances).filter(id => {
      const account = providerAccounts.find(acc => acc.id === id);
      return account && tempBalances[id] !== '' && Number(tempBalances[id]) !== account.balance;
    }).length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseClosingModal} />
        <div ref={modalRef} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
          <div className={`${colorClass} px-8 py-8 flex items-center justify-between text-white shrink-0`}>
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg">
                <img src={providerInfo?.logo} alt={title} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">{title}</h3>
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Rapid Daily Balance Sync</p>
              </div>
            </div>
            <button onClick={handleCloseClosingModal} className="w-10 h-10 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-xl transition-all"><X size={24} /></button>
          </div>

          <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {providerAccounts.length > 0 ? providerAccounts.map((account, idx) => {
              const itemLogo = (providerId === 'flexiload' && CARRIER_LOGOS[account.type]) ? CARRIER_LOGOS[account.type] : providerInfo?.logo;
              const isChanged = tempBalances[account.id] !== undefined && Number(tempBalances[account.id]) !== account.balance;

              return (
                <div key={account.id} className={`p-6 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isChanged ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-200">
                      <img src={itemLogo} alt={account.type} className="w-full h-full object-contain" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                         <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-500 uppercase">#{account.slNumber}</span>
                         <h4 className="font-black text-slate-900">{account.number} <span className="text-[10px] font-bold text-slate-400">({account.type})</span></h4>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current: ৳{account.balance.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="relative flex-1 sm:w-40">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">৳</span>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck="false"
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => handleInputKeyDown(e, idx, inputClass)}
                      className={`${inputClass} w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 ${focusColorClass} font-black text-slate-700 transition-all`}
                      value={tempBalances[account.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setTempBalances(prev => ({ ...prev, [account.id]: val }));
                        }
                      }}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 text-center text-slate-300">
                <Wallet size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-bold">No Accounts found.</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{changedCount} items modified</p>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button onClick={handleCloseClosingModal} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all flex-1 sm:flex-none">Discard</button>
              <button disabled={isSavingAll || (changedCount === 0 && Object.keys(tempBalances).length === 0)} onClick={() => handleSaveAllBalances(providerId)} className={`px-10 py-4 ${colorClass} text-white rounded-2xl font-black transition-all shadow-xl flex items-center justify-center space-x-3 flex-1 sm:flex-none disabled:opacity-30 disabled:grayscale`}>
                {isSavingAll ? (<><Loader2 size={20} className="animate-spin" /><span>Syncing...</span></>) : (<><Save size={20} /><span>Save & Archive</span></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredAccounts = accounts.filter(a => a.number.includes(searchTerm) || a.provider.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white"><Landmark size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ledger Accounts</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Daily Closing Management</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group flex-1 md:flex-none min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input type="text" placeholder="Filter list..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full transition-all text-sm font-medium" />
          </div>
          <button onClick={() => handleOpenClosingModal('bkash')} className="bg-[#e2136e] text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:opacity-90 transition-all shadow-md shadow-pink-100 font-bold active:scale-95 text-xs"><Zap size={14} /><span>Bkash</span></button>
          <button onClick={() => handleOpenClosingModal('nagad')} className="bg-[#f7941d] text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:opacity-90 transition-all shadow-md shadow-orange-100 font-bold active:scale-95 text-xs"><Zap size={14} /><span>Nagad</span></button>
          <button onClick={() => handleOpenClosingModal('rocket')} className="bg-[#8c3494] text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:opacity-90 transition-all shadow-md shadow-purple-100 font-bold active:scale-95 text-xs"><Zap size={14} /><span>Rocket</span></button>
          <button onClick={() => handleOpenClosingModal('flexiload')} className="bg-[#0084ff] text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:opacity-90 transition-all shadow-md shadow-blue-100 font-bold active:scale-95 text-xs"><Zap size={14} /><span>Flexi</span></button>
          <button onClick={() => handleOpenClosingModal('hand_cash')} className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:opacity-90 transition-all shadow-md shadow-green-100 font-bold active:scale-95 text-xs"><Zap size={14} /><span>Cash</span></button>
          <button onClick={() => { setIsModalOpen(true); setEditingId(null); setFormState({ slNumber: accounts.length + 1, provider: 'bkash', type: 'Agent', balance: 0, number: '' }); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-xs"><Plus size={16} /><span>New Entry</span></button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] w-16 text-center">SL</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Provider</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Number</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Type</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Balance</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 text-center font-black text-slate-400">{account.slNumber}</td>
                  <td className="px-6 py-5">{getProviderDisplay(account)}</td>
                  <td className="px-6 py-5 font-bold">{account.number}</td>
                  <td className="px-6 py-5 uppercase text-[10px] font-black">{account.type}</td>
                  <td className="px-6 py-5 font-black">৳{account.balance.toLocaleString()}</td>
                  <td className="px-6 py-5 text-right transition-opacity">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => { setFormState(account); setEditingId(account.id); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                      <button onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'accounts', account.id)); }} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8">
            <h3 className="text-2xl font-black mb-6">{editingId ? 'Edit' : 'New'} Account</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const data = { ...formState, balance: Number(formState.balance), slNumber: Number(formState.slNumber) };
              if (editingId) await updateDoc(doc(db, 'accounts', editingId), data);
              else await addDoc(collection(db, 'accounts'), data);
              setIsModalOpen(false);
            }} className="space-y-4">
              <input required type="number" placeholder="SL" className="w-full p-4 bg-slate-50 rounded-2xl border" value={formState.slNumber} onChange={e => setFormState({...formState, slNumber: Number(e.target.value)})} />
              <select className="w-full p-4 bg-slate-50 rounded-2xl border" value={formState.provider} onChange={e => setFormState({...formState, provider: e.target.value as AccountProvider})}>{ACCOUNT_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input required type="text" placeholder="Number" className="w-full p-4 bg-slate-50 rounded-2xl border" value={formState.number} onChange={e => setFormState({...formState, number: e.target.value})} />
              <input required type="number" placeholder="Balance" className="w-full p-4 bg-slate-50 rounded-2xl border font-black text-xl" value={formState.balance} onChange={e => setFormState({...formState, balance: Number(e.target.value)})} />
              <button className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black">Save Account</button>
            </form>
          </div>
        </div>
      )}

      {renderClosingModal('bkash', 'Daily Bkash Closing', 'bg-[#e2136e]', 'focus:ring-[#e2136e]', 'bkash-closing-input')}
      {renderClosingModal('nagad', 'Daily Nagad Closing', 'bg-[#f7941d]', 'focus:ring-[#f7941d]', 'nagad-closing-input')}
      {renderClosingModal('rocket', 'Daily Rocket Closing', 'bg-[#8c3494]', 'focus:ring-[#8c3494]', 'rocket-closing-input')}
      {renderClosingModal('flexiload', 'Daily Flexiload Closing', 'bg-[#0084ff]', 'focus:ring-[#0084ff]', 'flexi-closing-input')}
      {renderClosingModal('hand_cash', 'Daily Hand Cash Closing', 'bg-green-600', 'focus:ring-green-600', 'cash-closing-input')}
    </div>
  );
};

export default AccountPage;
