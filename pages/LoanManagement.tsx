import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Building2, 
  X,
  Calendar,
  DollarSign,
  PiggyBank,
  Hash,
  Calculator,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  Receipt,
  TrendingDown,
  User,
  Info,
  ArrowRightLeft,
  CircleCheck,
  FileText,
  Edit2
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
  runTransaction,
  updateDoc,
  db
} from '../firebase';
import { LoanRecord, LoanTransaction } from '../types';

const LoanManagement: React.FC = () => {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [formState, setFormState] = useState<Partial<LoanRecord>>({
    ngoName: '',
    loanId: '',
    date: new Date().toISOString().split('T')[0],
    initialSavings: 0,
    principal: 0,
    interest: 0,
    type: 'Taken'
  });

  const [transForm, setTransForm] = useState({
    date: new Date().toISOString().split('T')[0],
    deposit: 0,
    savings: 0,
    comment: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'loans'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        transactions: doc.data().transactions || []
      })) as LoanRecord[];
      setLoans(loanData);
      setLoading(false);

      if (selectedLoan) {
        const updated = loanData.find(l => l.id === selectedLoan.id);
        if (updated) setSelectedLoan(updated);
      }
    });

    return () => unsubscribe();
  }, [selectedLoan?.id]);

  const totalMarketDebt = loans.reduce((sum, l) => sum + (l.currentDue || 0), 0);
  const totalMarketSavings = loans.reduce((sum, l) => sum + (l.totalSavings || 0), 0);

  const handleOpenEditLoan = (loan: LoanRecord) => {
    setEditingLoanId(loan.id);
    setFormState({
      ngoName: loan.ngoName,
      loanId: loan.loanId,
      date: loan.date,
      initialSavings: loan.initialSavings,
      principal: loan.principal,
      interest: loan.interest,
      type: loan.type
    });
    setIsModalOpen(true);
  };

  const handleOpenEditTransaction = (transaction: LoanTransaction) => {
    setEditingTransactionId(transaction.id);
    setTransForm({
      date: transaction.date,
      deposit: transaction.deposit,
      savings: transaction.savings,
      comment: transaction.comment || ''
    });
    setIsTransactionModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.ngoName || !formState.principal) return;
    
    try {
      const principal = Number(formState.principal) || 0;
      const interest = Number(formState.interest) || 0;
      const initialSavings = Number(formState.initialSavings) || 0;
      const totalInitialDue = principal + interest;

      if (editingLoanId) {
        const loanRef = doc(db, 'loans', editingLoanId);
        // Recalculate current balance based on transactions and new principal/interest
        const existingTransactions = loans.find(l => l.id === editingLoanId)?.transactions || [];
        const totalDeposits = existingTransactions.reduce((sum, t) => sum + (t.deposit || 0), 0);
        const totalNewSavings = initialSavings + existingTransactions.reduce((sum, t) => sum + (t.savings || 0), 0);
        
        await updateDoc(loanRef, {
          ...formState,
          principal,
          interest,
          initialSavings,
          currentDue: totalInitialDue - totalDeposits,
          totalSavings: totalNewSavings
        });
      } else {
        await addDoc(collection(db, 'loans'), {
          ...formState,
          principal,
          interest,
          initialSavings,
          currentDue: totalInitialDue,
          totalSavings: initialSavings,
          status: 'Active',
          createdAt: new Date().toISOString(),
          transactions: []
        });
      }

      setIsModalOpen(false);
      setEditingLoanId(null);
      setFormState({ 
        ngoName: '', 
        loanId: '', 
        date: new Date().toISOString().split('T')[0], 
        initialSavings: 0, 
        principal: 0, 
        interest: 0, 
        type: 'Taken' 
      });
    } catch (error) {
      console.error("Error saving loan:", error);
    }
  };

  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      const loanRef = doc(db, 'loans', selectedLoan.id);

      await runTransaction(db, async (transaction) => {
        const lDoc = await transaction.get(loanRef);
        if (!lDoc.exists()) throw "Loan profile not found!";
        
        const lData = lDoc.data() as LoanRecord;
        const depositAmount = Number(transForm.deposit) || 0;
        const savingsAmount = Number(transForm.savings) || 0;
        
        let currentDue = lData.currentDue || 0;
        let currentSavings = lData.totalSavings || 0;
        let transactions = [...(lData.transactions || [])];

        if (editingTransactionId) {
          const index = transactions.findIndex(t => t.id === editingTransactionId);
          if (index !== -1) {
            const oldT = transactions[index];
            // Revert old values
            currentDue = currentDue + oldT.deposit;
            currentSavings = currentSavings - oldT.savings;

            // Apply new values
            const newT: LoanTransaction = {
              ...oldT,
              date: transForm.date,
              deposit: depositAmount,
              savings: savingsAmount,
              comment: transForm.comment,
              balanceAfter: 0 // Will be set after sort
            };
            transactions[index] = newT;
          }
        } else {
          const newTrans: LoanTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            date: transForm.date,
            deposit: depositAmount,
            savings: savingsAmount,
            balanceAfter: 0,
            comment: transForm.comment
          };
          transactions = [newTrans, ...transactions];
        }

        // Always recalculate balances after sorting to ensure ledger consistency
        transactions.sort((a, b) => a.date.localeCompare(b.date)); // Sort ascending for running balance calculation
        let runningDue = (lData.principal || 0) + (lData.interest || 0);
        let runningSavings = lData.initialSavings || 0;

        const updatedTransactions = transactions.map(t => {
          runningDue -= t.deposit;
          runningSavings += t.savings;
          return { ...t, balanceAfter: runningDue };
        });

        // For display we want newest first
        const displayTransactions = [...updatedTransactions].sort((a, b) => b.date.localeCompare(a.date));

        transaction.update(loanRef, {
          currentDue: runningDue,
          totalSavings: runningSavings,
          status: runningDue <= 0 ? 'Closed' : 'Active',
          transactions: displayTransactions
        });
      });

      setIsTransactionModalOpen(false);
      setEditingTransactionId(null);
      setTransForm({
        date: new Date().toISOString().split('T')[0],
        deposit: 0,
        savings: 0,
        comment: ''
      });
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Failed to update ledger.");
    }
  };

  const handleDeleteTransaction = async (transId: string) => {
    if (!selectedLoan || !confirm('Delete this transaction? The balance will be adjusted automatically.')) return;

    try {
      const loanRef = doc(db, 'loans', selectedLoan.id);

      await runTransaction(db, async (transaction) => {
        const lDoc = await transaction.get(loanRef);
        if (!lDoc.exists()) throw "Loan profile not found!";
        
        const lData = lDoc.data() as LoanRecord;
        const transactions = [...(lData.transactions || [])].filter(t => t.id !== transId);

        // Re-calculate running balance
        transactions.sort((a, b) => a.date.localeCompare(b.date));
        let runningDue = (lData.principal || 0) + (lData.interest || 0);
        let runningSavings = lData.initialSavings || 0;

        const updatedTransactions = transactions.map(t => {
          runningDue -= t.deposit;
          runningSavings += t.savings;
          return { ...t, balanceAfter: runningDue };
        });

        transaction.update(loanRef, {
          currentDue: runningDue,
          totalSavings: runningSavings,
          status: runningDue <= 0 ? 'Closed' : 'Active',
          transactions: [...updatedTransactions].sort((a, b) => b.date.localeCompare(a.date))
        });
      });
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete transaction.");
    }
  };

  const filteredLoans = loans.filter(l => 
    l.ngoName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.loanId && l.loanId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">MDO Loan Info</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Profiles: {loans.length}</p>
          </div>
        </div>

        <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest mb-1">Total Market Due</p>
            <h3 className="text-2xl font-black text-rose-700">৳{(totalMarketDebt || 0).toLocaleString()}</h3>
          </div>
          <div className="text-rose-200"><TrendingDown size={40} /></div>
        </div>

        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Total Savings</p>
            <h3 className="text-2xl font-black text-emerald-700">৳{(totalMarketSavings || 0).toLocaleString()}</h3>
          </div>
          <div className="text-emerald-200"><PiggyBank size={40} /></div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search Member Name or ID..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm" 
          />
        </div>
        <button 
          onClick={() => { setEditingLoanId(null); setFormState({ ngoName: '', loanId: '', date: new Date().toISOString().split('T')[0], initialSavings: 0, principal: 0, interest: 0, type: 'Taken' }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-2 hover:bg-indigo-700 transition-all font-black shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Plus size={20} />
          <span className="uppercase tracking-widest text-xs">New Member Loan</span>
        </button>
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={48} /></div>
        ) : filteredLoans.length > 0 ? (
          filteredLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 hover:shadow-lg transition-all group relative overflow-hidden">
               <div className="absolute right-0 top-0 p-8 flex items-center space-x-2">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${loan.status === 'Closed' ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                    Loan {loan.status || 'Active'}
                  </span>
               </div>
               
               <div className="flex items-center space-x-5 mb-8">
                 <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                   <User size={32} />
                 </div>
                 <div>
                   <h4 className="text-xl font-black text-slate-900 tracking-tight">{loan.ngoName}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center mt-1">
                      <Hash size={12} className="mr-1" />
                      ID: {loan.loanId || 'N/A'} • Joined {loan.date}
                   </p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6 mb-6">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-400 uppercase tracking-tighter">Total Loan</span>
                       <span className="font-black text-slate-800">৳{((loan.principal || 0) + (loan.interest || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-slate-400 uppercase tracking-tighter">Savings</span>
                       <span className="font-black text-emerald-600">৳{(loan.totalSavings || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2">
                       <span className="font-bold text-rose-500 uppercase tracking-tighter">Remaining Due</span>
                       <span className="font-black text-rose-600">৳{(loan.currentDue || 0).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="bg-slate-900 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Loan Close Due</p>
                    <p className="text-xl font-black text-white">৳{(Math.max(0, (loan.currentDue || 0) - (loan.totalSavings || 0))).toLocaleString()}</p>
                 </div>
               </div>

               <div className="flex gap-2">
                 <button 
                   onClick={() => setSelectedLoan(loan)}
                   className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center space-x-2"
                 >
                   <FileText size={16} />
                   <span>Open Ledger</span>
                 </button>
                 <button 
                    onClick={() => handleOpenEditLoan(loan)}
                    className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"
                  >
                    <Edit2 size={20} />
                  </button>
                 <button 
                    onClick={async () => { if(confirm('Permanently delete member profile?')) await deleteDoc(doc(db, 'loans', loan.id)); }}
                    className="p-4 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-2xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-300 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
             <Briefcase size={64} className="mx-auto mb-4 opacity-10" />
             <p className="font-bold tracking-widest uppercase text-xs">No active member profiles found</p>
          </div>
        )}
      </div>

      {/* Ledger Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedLoan(null)} />
          <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-6">
                 <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                   <User size={32} />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{selectedLoan.ngoName}</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Member Ledger • ID: {selectedLoan.loanId}</p>
                 </div>
               </div>
               <div className="flex items-center space-x-3">
                  <button onClick={() => handleOpenEditLoan(selectedLoan)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors">
                    <Edit2 size={24} />
                  </button>
                  <button onClick={() => setSelectedLoan(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-rose-500 rounded-2xl transition-colors">
                    <X size={24} />
                  </button>
               </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0 bg-slate-50/50 overflow-y-auto">
               <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                     <div className="grid grid-cols-2 gap-y-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase">Member Name</div>
                        <div className="text-sm font-black text-slate-900">{selectedLoan.ngoName}</div>
                        
                        <div className="text-[10px] font-black text-slate-400 uppercase">Join Date</div>
                        <div className="text-sm font-black text-slate-900">{selectedLoan.date}</div>
                        
                        <div className="text-[10px] font-black text-slate-400 uppercase">Loan Accept</div>
                        <div className="text-sm font-black text-indigo-600">৳{(selectedLoan.principal || 0).toLocaleString()}</div>
                        
                        <div className="text-[10px] font-black text-slate-400 uppercase">Accept Savings</div>
                        <div className="text-sm font-black text-emerald-600">৳{(selectedLoan.initialSavings || 0).toLocaleString()}</div>
                        
                        <div className="text-[10px] font-black text-slate-400 uppercase">Interest</div>
                        <div className="text-sm font-black text-rose-500">৳{(selectedLoan.interest || 0).toLocaleString()}</div>

                        <div className="text-[10px] font-black text-slate-400 uppercase">Monthly Installment</div>
                        <div className="text-sm font-black text-slate-900">৳{(((selectedLoan.principal + selectedLoan.interest) / 12).toFixed(2)).toLocaleString()}</div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-400 uppercase">Remaining Due</span>
                        <span className="text-2xl font-black text-rose-600">৳{(selectedLoan.currentDue || 0).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Total Savings</span>
                        <span className="text-xl font-black text-indigo-600">৳{(selectedLoan.totalSavings || 0).toLocaleString()}</span>
                     </div>
                  </div>

                  <div className="bg-slate-900 p-7 rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl relative overflow-hidden group">
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loan Close Due (Settlement)</p>
                        <h4 className="text-3xl font-black tracking-tighter">৳{(Math.max(0, (selectedLoan.currentDue || 0) - (selectedLoan.totalSavings || 0))).toLocaleString()}</h4>
                     </div>
                     <CircleCheck className="text-emerald-500 relative z-10" size={48} />
                  </div>
                  
                  {selectedLoan.status !== 'Closed' && (
                    <button 
                      // Fixed 'coach' to 'comment' in setTransForm call
                      onClick={() => { setEditingTransactionId(null); setTransForm({ date: new Date().toISOString().split('T')[0], deposit: 0, savings: 0, comment: '' }); setIsTransactionModalOpen(true); }}
                      className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={18} />
                      <span>Post Repayment</span>
                    </button>
                  )}
               </div>
            </div>

            {/* Transaction Ledger Table */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
               <div className="flex items-center space-x-2 mb-6 mt-8">
                  <Receipt size={18} className="text-slate-400" />
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction History</h5>
               </div>
               
               <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Date</th>
                        <th className="px-8 py-5">Deposit (কিস্তি)</th>
                        <th className="px-8 py-5">Savings (সঞ্চয়)</th>
                        <th className="px-8 py-5">Current Due</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(selectedLoan.transactions || []).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group/row">
                          <td className="px-8 py-5 text-xs text-slate-500 font-bold">{t.date}</td>
                          <td className="px-8 py-5 text-sm font-black text-rose-600">৳{(t.deposit || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-black text-emerald-600">৳{(t.savings || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-sm font-black text-slate-900">৳{(t.balanceAfter || 0).toLocaleString()}</td>
                          <td className="px-8 py-5 text-right opacity-0 group-hover/row:opacity-100 transition-opacity">
                             <div className="flex justify-end space-x-2">
                               <button onClick={() => handleOpenEditTransaction(t)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                               <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Registration/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 overflow-hidden border border-slate-100">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{editingLoanId ? 'Update Member' : 'Register Member'}</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{editingLoanId ? 'Update loan details' : 'New MDO Loan Setup'}</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input required className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black" placeholder="Md. Mukul Hossen" value={formState.ngoName} onChange={e => setFormState({...formState, ngoName: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Member ID</label>
                    <div className="relative">
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" placeholder="004-025-087" value={formState.loanId} onChange={e => setFormState({...formState, loanId: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Join Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="date" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xs" value={formState.date} onChange={e => setFormState({...formState, date: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 block ml-1">Loan Accept</label>
                    <input required type="number" className="w-full px-6 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" placeholder="200000" value={formState.principal || ''} onChange={e => setFormState({...formState, principal: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 block ml-1">Interest</label>
                    <input type="number" className="w-full px-6 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-lg" placeholder="27000" value={formState.interest || ''} onChange={e => setFormState({...formState, interest: Number(e.target.value)})} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 block ml-1">Accept Savings</label>
                  <div className="relative">
                    <PiggyBank className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-300" size={18} />
                    <input type="number" className="w-full pl-14 pr-6 py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black" placeholder="20000" value={formState.initialSavings || ''} onChange={e => setFormState({...formState, initialSavings: Number(e.target.value)})} />
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-indigo-600 shadow-xl transition-all uppercase tracking-widest text-xs">
                  {editingLoanId ? 'Save Changes' : 'Create Profile'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Transaction Entry/Edit Modal */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTransactionModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 overflow-hidden border border-slate-100">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{editingTransactionId ? 'Edit Entry' : 'New Entry'}</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedLoan?.ngoName}</p>
               </div>
               <button onClick={() => setIsTransactionModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
             </div>
             
             <form onSubmit={handlePostTransaction} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 block ml-1">Deposit (কিস্তি)</label>
                    <input required type="number" className="w-full px-5 py-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-xl" placeholder="0" value={transForm.deposit || ''} onChange={e => setTransForm({...transForm, deposit: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 block ml-1">Savings (জমা)</label>
                    <input type="number" className="w-full px-5 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-xl" placeholder="0" value={transForm.savings || ''} onChange={e => setTransForm({...transForm, savings: Number(e.target.value)})} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Entry Date</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={transForm.date} onChange={e => setTransForm({...transForm, date: e.target.value})} />
                </div>

                <div className="bg-slate-900 p-6 rounded-[2.5rem] text-center shadow-xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected Due</p>
                   <p className="text-2xl font-black text-white">৳{Math.max(0, (selectedLoan?.currentDue || 0) - (Number(transForm.deposit) || 0) + (editingTransactionId ? (selectedLoan?.transactions.find(t => t.id === editingTransactionId)?.deposit || 0) : 0)).toLocaleString()}</p>
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-xs">
                  {editingTransactionId ? 'Update Ledger' : 'Execute & Sync'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;