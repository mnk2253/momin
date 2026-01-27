
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, User, Users, MapPin, Phone, History, ArrowRightLeft, Loader2, Wallet, CheckCircle2, ChevronRight, X, UserPlus, Camera, Link as LinkIcon, Image as ImageIcon, Maximize2, Download, Edit2, Trash2, Calendar, FileText, DatabaseBackup, ClipboardPaste, Info, FileDown, RotateCcw, Upload, ZoomIn, MessageCircle } from 'lucide-react';
// Redirected modular imports to local wrappers in firebase.ts
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  query, 
  orderBy,
  runTransaction,
  updateDoc,
  deleteDoc,
  getDocs,
  where,
  db
} from '../firebase';
import { Customer, Transaction, Account } from '../types';

declare const jspdf: any;

const CustomerDuePage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Bulk Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Ledger Import States
  const [isLedgerImportOpen, setIsLedgerImportOpen] = useState(false);
  const [ledgerImportData, setLedgerImportData] = useState('');
  const [isLedgerImporting, setIsLedgerImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCust, setNewCust] = useState<Partial<Customer>>({ 
    name: '', 
    number: '', 
    address: '', 
    imageUrl: '' 
  });
  
  const [newTrans, setNewTrans] = useState<Partial<Transaction>>({ 
    amountGiven: 0, 
    amountReceived: 0, 
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Helper to generate WhatsApp URL
  const getWhatsAppUrl = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const finalNumber = cleanNumber.startsWith('0') ? `88${cleanNumber}` : cleanNumber;
    return `https://wa.me/${finalNumber}`;
  };

  // Smart date parser
  const parseDateToTimestamp = (dateStr: string): number => {
    if (!dateStr) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr).getTime();
    }
    const parts = dateStr.split(/[/ -]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const yearStr = parts[2];
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      let month = parseInt(monthStr) - 1;
      if (isNaN(month)) {
        month = months[monthStr.toLowerCase().substring(0, 3)] ?? 0;
      }
      let year = parseInt(yearStr);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return new Date(dateStr).getTime() || 0;
  };

  const normalizeToISO = (dateStr: string): string => {
    const ts = parseDateToTimestamp(dateStr);
    if (!ts) return new Date().toISOString().split('T')[0];
    const d = new Date(ts);
    return d.toISOString().split('T')[0];
  };

  const toDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(parseDateToTimestamp(dateStr));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    const qCust = query(collection(db, 'customers'), orderBy('name'));
    const unsubCust = onSnapshot(qCust, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        transactions: doc.data().transactions || []
      })) as Customer[];
      setCustomers(customersData);
      setLoading(false);

      if (selectedCustomer) {
        const updated = customersData.find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    });
    return () => unsubCust();
  }, [selectedCustomer?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCust(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBulkImport = async () => {
    if (!importData.trim()) {
      alert("Please paste data first!");
      return;
    }
    setIsImporting(true);
    try {
      const lines = importData.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const name = (parts[0] || '').trim();
        const number = (parts[1] || '').trim();
        const address = (parts[2] || '').trim();
        const due = (parts[3] || '0').trim();
        if (name.toLowerCase().includes('name') || !name || !number) continue;
        const q = query(collection(db, 'customers'), where('number', '==', number));
        const existing = await getDocs(q);
        if (existing.empty) {
          await addDoc(collection(db, 'customers'), {
            name, number, address: address || 'Unknown', imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            currentDue: Number(due) || 0, transactions: [], createdAt: new Date().toISOString()
          });
        }
      }
      setIsImportModalOpen(false);
      setImportData('');
    } catch (error) { console.error(error); } finally { setIsImporting(false); }
  };

  const handleLedgerBulkImport = async () => {
    if (!selectedCustomer || !ledgerImportData.trim()) return;
    setIsLedgerImporting(true);
    try {
      const lines = ledgerImportData.trim().split('\n');
      const newTransactions: Transaction[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.includes('\t') ? line.split('\t') : line.split('|');
        const rawDate = (parts[0] || '').trim();
        const given = Number((parts[1] || '0').replace(/,/g, '').trim()) || 0;
        const received = Number((parts[2] || '0').replace(/,/g, '').trim()) || 0;
        const desc = (parts[3] || '').trim();
        if (rawDate.toLowerCase().includes('date') || !rawDate) continue;
        newTransactions.push({
          id: Math.random().toString(36).substr(2, 9),
          customerId: selectedCustomer.id,
          date: normalizeToISO(rawDate),
          comment: desc || 'Imported Entry',
          amountGiven: given,
          amountReceived: received,
          balanceAfter: 0
        });
      }
      if (newTransactions.length === 0) return;
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await runTransaction(db, async (transaction) => {
        const cDoc = await transaction.get(customerRef);
        const cData = cDoc.data();
        let allTransactions = [...(cData.transactions || []), ...newTransactions];
        allTransactions.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        let runningDue = 0;
        const updated = allTransactions.map(t => {
          runningDue += (t.amountGiven - t.amountReceived);
          return { ...t, balanceAfter: runningDue };
        });
        transaction.update(customerRef, { currentDue: runningDue, transactions: updated });
      });
      setIsLedgerImportOpen(false);
      setLedgerImportData('');
    } catch (error) { console.error(error); } finally { setIsLedgerImporting(false); }
  };

  const handleClearLedger = async () => {
    if (!selectedCustomer) return;
    if (window.confirm(`Are you sure you want to delete all transactions for ${selectedCustomer.name}? This will reset balance to 0.`)) {
      try {
        await updateDoc(doc(db, 'customers', selectedCustomer.id), { currentDue: 0, transactions: [] });
      } catch (error) { console.error(error); }
    }
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setNewCust({
      name: customer.name,
      number: customer.number,
      address: customer.address,
      imageUrl: customer.imageUrl
    });
    setIsAddCustomerOpen(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (window.confirm(`Delete customer "${customer.name}" and all history permanently?`)) {
      try {
        await deleteDoc(doc(db, 'customers', customer.id));
        if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      } catch (error) { console.error(error); }
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await runTransaction(db, async (transaction) => {
        const cDoc = await transaction.get(customerRef);
        let transactions = [...(cDoc.data()?.transactions || [])];
        if (editingTransactionId) {
          const idx = transactions.findIndex(t => t.id === editingTransactionId);
          if (idx !== -1) {
            transactions[idx] = { ...transactions[idx], amountGiven: Number(newTrans.amountGiven), amountReceived: Number(newTrans.amountReceived), comment: newTrans.comment || '', date: normalizeToISO(newTrans.date || transactions[idx].date) };
          }
        } else {
          transactions.push({ id: Math.random().toString(36).substr(2, 9), customerId: selectedCustomer.id, amountGiven: Number(newTrans.amountGiven), amountReceived: Number(newTrans.amountReceived), comment: newTrans.comment || '', date: normalizeToISO(newTrans.date || ''), balanceAfter: 0 });
        }
        transactions.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        let runningDue = 0;
        const updated = transactions.map(t => {
          runningDue += (t.amountGiven - t.amountReceived);
          return { ...t, balanceAfter: runningDue };
        });
        transaction.update(customerRef, { currentDue: runningDue, transactions: updated });
      });
      setIsTransactionOpen(false);
      setEditingTransactionId(null);
      setNewTrans({ amountGiven: 0, amountReceived: 0, comment: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) { console.error(error); }
  };

  const handleDeleteTransaction = async (transId: string) => {
    if (!selectedCustomer || !confirm("Delete transaction?")) return;
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await runTransaction(db, async (transaction) => {
        const cDoc = await transaction.get(customerRef);
        const transactions = (cDoc.data()?.transactions || []).filter((t: any) => t.id !== transId);
        transactions.sort((a: any, b: any) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
        let runningDue = 0;
        const updated = transactions.map((t: any) => {
          runningDue += (t.amountGiven - t.amountReceived);
          return { ...t, balanceAfter: runningDue };
        });
        transaction.update(customerRef, { currentDue: runningDue, transactions: updated });
      });
    } catch (error) { console.error(error); }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = { 
        name: newCust.name, 
        number: newCust.number, 
        address: newCust.address, 
        imageUrl: newCust.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${newCust.name}` 
      };
      if (editingCustomerId) await updateDoc(doc(db, 'customers', editingCustomerId), data);
      else await addDoc(collection(db, 'customers'), { ...data, currentDue: 0, transactions: [], createdAt: new Date().toISOString() });
      setIsAddCustomerOpen(false);
      setEditingCustomerId(null);
      setNewCust({ name: '', number: '', address: '', imageUrl: '' });
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const generatePDF = (customer: Customer) => {
    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header Section
    doc.setFontSize(22); doc.setTextColor(79, 70, 229); doc.setFont("helvetica", "bold"); 
    doc.text("Sinthiya Telecom", 14, 20);
    
    doc.setFontSize(10); doc.setTextColor(50); doc.setFont("helvetica", "normal"); 
    doc.text("Sirajganj, Bangladesh", 14, 27);
    
    // Customer Image (If available)
    if (customer.imageUrl && customer.imageUrl.startsWith('data:image')) {
      try {
        doc.addImage(customer.imageUrl, 'PNG', pageWidth - 44, 12, 30, 30);
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - 44, 12, 30, 30); // Image Border
      } catch (e) { console.error("Could not add image to PDF", e); }
    }
    
    doc.line(14, 45, pageWidth - 14, 45);
    
    // Calculate Totals
    const totalSend = (customer.transactions || []).reduce((sum, t) => sum + (t.amountGiven || 0), 0);
    const totalReceived = (customer.transactions || []).reduce((sum, t) => sum + (t.amountReceived || 0), 0);
    
    // Customer Info & Summary
    doc.setFontSize(12); doc.setTextColor(0); 
    doc.text(`Customer: ${customer.name}`, 14, 55);
    doc.text(`Phone: ${customer.number}`, 14, 61);
    doc.text(`Address: ${customer.address}`, 14, 67); // Added Address here
    
    doc.setFontSize(10); doc.setTextColor(70);
    doc.text(`Total Send: BDT ${totalSend.toLocaleString()}`, 14, 76); // Shifted Y from 70
    doc.text(`Total Received: BDT ${totalReceived.toLocaleString()}`, 14, 82); // Shifted Y from 76
    
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(220, 38, 38);
    doc.text(`Current Total Due: BDT ${customer.currentDue.toLocaleString()}`, 14, 90); // Shifted Y from 84
    
    // Table Rows
    const tableRows = (customer.transactions || []).map(t => [
      toDisplayDate(t.date), 
      t.comment, 
      t.amountGiven.toLocaleString(), 
      t.amountReceived.toLocaleString(), 
      t.balanceAfter.toLocaleString()
    ]);
    
    (doc as any).autoTable({ 
      startY: 100, // Shifted from 95
      head: [['Date', 'Description', 'Given (Send)', 'Received', 'Balance']], 
      body: tableRows,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`${customer.name}_ledger.pdf`);
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.number.includes(searchTerm));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
          <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Directory</h2><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Management Panel</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium" />
          </div>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-50 text-emerald-600 px-5 py-3.5 rounded-2xl flex items-center space-x-2 font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95"><DatabaseBackup size={18} /><span>Import List</span></button>
          <button onClick={() => { setEditingCustomerId(null); setNewCust({ name: '', number: '', address: '', imageUrl: '' }); setIsAddCustomerOpen(true); }} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl flex items-center space-x-2 font-bold shadow-xl active:scale-95"><UserPlus size={20} /><span>New Customer</span></button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] w-20 text-center">SL</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Customer</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Number</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Current Due</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : filteredCustomers.map((customer, index) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 text-center font-black text-slate-300 text-sm">{String(index + 1).padStart(2, '0')}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative group/pic">
                        <img 
                          src={customer.imageUrl} 
                          onClick={() => setViewingImageUrl(customer.imageUrl)}
                          className="w-12 h-12 rounded-2xl object-cover bg-slate-100 border border-slate-100 cursor-zoom-in transition-transform hover:scale-105" 
                          alt="" 
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover/pic:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                          <ZoomIn className="text-white" size={16} />
                        </div>
                      </div>
                      <span onClick={() => setSelectedCustomer(customer)} className="font-black text-slate-900 cursor-pointer hover:text-indigo-600 transition-all">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-500">
                    <div className="flex items-center space-x-2">
                      <span>{customer.number}</span>
                      <a 
                        href={getWhatsAppUrl(customer.number)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-xl font-black text-sm ${customer.currentDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>৳{customer.currentDue.toLocaleString()}</span></td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end items-center space-x-2">
                       <button onClick={() => handleOpenEditCustomer(customer)} title="Edit Customer" className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all">
                         <Edit2 size={18} />
                       </button>
                       <button onClick={() => handleDeleteCustomer(customer)} title="Delete Customer" className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl transition-all">
                         <Trash2 size={18} />
                       </button>
                       <button onClick={() => setSelectedCustomer(customer)} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all">
                         <ChevronRight size={20} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEDGER PANEL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="relative group/pic">
                  <img 
                    src={selectedCustomer.imageUrl} 
                    onClick={() => setViewingImageUrl(selectedCustomer.imageUrl)}
                    className="w-16 h-16 rounded-[1.5rem] object-cover shadow-xl bg-slate-100 cursor-zoom-in transition-transform hover:scale-105" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-[1.5rem] opacity-0 group-hover/pic:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                    <ZoomIn className="text-white" size={20} />
                  </div>
                </div>
                <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedCustomer.name}</h3><p className="text-xs text-slate-400 font-black uppercase tracking-widest">Transaction Ledger</p></div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => generatePDF(selectedCustomer)} className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-2xl transition-all flex items-center gap-2 font-black text-xs uppercase"><FileText size={20} /><span>PDF</span></button>
                <button onClick={handleClearLedger} title="Clear All History" className="p-3 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-2xl transition-all"><RotateCcw size={20} /></button>
                <button onClick={() => setSelectedCustomer(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl"><X size={24} /></button>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Balance</p><p className={`text-3xl font-black ${selectedCustomer.currentDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>৳{selectedCustomer.currentDue.toLocaleString()}</p></div>
              <div className="flex gap-2">
                <button onClick={() => setIsLedgerImportOpen(true)} className="bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center gap-2"><FileDown size={18} /><span>Import Ledger</span></button>
                <button onClick={() => { setEditingTransactionId(null); setIsTransactionOpen(true); }} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 flex items-center space-x-2"><Plus size={18} /><span>New Entry</span></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="min-w-[800px] w-full text-left">
                <thead className="bg-white sticky top-0 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="px-8 py-4">Date</th><th className="px-8 py-4">Details</th><th className="px-8 py-4">Given</th><th className="px-8 py-4">Received</th><th className="px-8 py-4">Balance</th><th className="px-8 py-4 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(selectedCustomer.transactions || []).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/30 transition-colors group/trans">
                      <td className="px-8 py-5 text-xs text-slate-400 font-black">{toDisplayDate(t.date)}</td>
                      <td className="px-8 py-5"><p className="text-sm font-bold text-slate-700">{t.comment}</p></td>
                      <td className="px-8 py-5 text-sm font-black text-rose-500">{t.amountGiven > 0 ? `৳${t.amountGiven.toLocaleString()}` : '-'}</td>
                      <td className="px-8 py-5 text-sm font-black text-emerald-500">{t.amountReceived > 0 ? `৳${t.amountReceived.toLocaleString()}` : '-'}</td>
                      <td className="px-8 py-5 text-sm font-black text-slate-900">৳{t.balanceAfter.toLocaleString()}</td>
                      <td className="px-8 py-5 text-right opacity-0 group-hover/trans:opacity-100 transition-opacity">
                        <div className="flex justify-end space-x-1">
                          <button onClick={() => { setEditingTransactionId(t.id); setNewTrans(t); setIsTransactionOpen(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteTransaction(t.id)} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PIC VIEW LIGHTBOX */}
      {viewingImageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setViewingImageUrl(null)} />
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setViewingImageUrl(null)} 
              className="absolute -top-12 right-0 text-white hover:text-rose-400 transition-colors p-2"
            >
              <X size={32} />
            </button>
            <img 
              src={viewingImageUrl} 
              className="w-full h-full object-contain rounded-3xl shadow-2xl border-4 border-white/10" 
              alt="Full Size View" 
            />
            <div className="mt-4 flex gap-3">
              <a 
                href={viewingImageUrl} 
                download="customer_pic.png" 
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 backdrop-blur-md transition-all border border-white/10"
              >
                <Download size={14} />
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER IMPORT MODAL */}
      {isLedgerImportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isLedgerImporting && setIsLedgerImportOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
             <div className="flex items-center justify-between mb-6">
               <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Ledger Import</h3><p className="text-xs text-slate-400 font-bold uppercase">Date | Given | Received | Desc</p></div>
               <button onClick={() => setIsLedgerImportOpen(false)}><X size={28} /></button>
             </div>
             <textarea className="w-full h-64 p-6 bg-slate-50 border rounded-[2rem] outline-none font-mono text-xs resize-none" placeholder="08-11-2025 | 200 | 0 | Description..." value={ledgerImportData} onChange={e => setLedgerImportData(e.target.value)} />
             <div className="flex items-center justify-end mt-6"><button onClick={handleLedgerBulkImport} disabled={isLedgerImporting} className="px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 active:scale-95 disabled:opacity-50 flex items-center space-x-2">{isLedgerImporting && <Loader2 className="animate-spin" size={18} />}<span>Start Import</span></button></div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {isTransactionOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsTransactionOpen(false); setEditingTransactionId(null); }} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
             <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingTransactionId ? 'Edit Entry' : 'Post Entry'}</h3><button onClick={() => { setIsTransactionOpen(false); setEditingTransactionId(null); }} className="text-slate-400 hover:text-red-500"><X size={24} /></button></div>
             <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-lg" placeholder="Given" value={newTrans.amountGiven || ''} onChange={e => setNewTrans({...newTrans, amountGiven: Number(e.target.value)})} />
                  <input type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-lg" placeholder="Received" value={newTrans.amountReceived || ''} onChange={e => setNewTrans({...newTrans, amountReceived: Number(e.target.value)})} />
                </div>
                <input type="date" className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} />
                <textarea className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-28 resize-none" placeholder="Description..." value={newTrans.comment} onChange={e => setNewTrans({...newTrans, comment: e.target.value})} />
                <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center space-x-2 active:scale-95"><CheckCircle2 size={20} /><span className="uppercase tracking-widest">{editingTransactionId ? 'Update' : 'Execute'}</span></button>
             </form>
          </div>
        </div>
      )}

      {/* NEW/EDIT CUSTOMER MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsAddCustomerOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[95vh]">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingCustomerId ? 'Update Profile' : 'Register Client'}</h3>
               <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
             </div>
             <form onSubmit={handleSaveCustomer} className="space-y-6">
                {/* IMAGE PICKER SECTION */}
                <div className="flex flex-col items-center space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all overflow-hidden group shadow-inner"
                  >
                    {newCust.imageUrl ? (
                      <img src={newCust.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Upload size={32} />
                        <span className="text-[10px] font-black uppercase mt-2">Pick Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera size={24} />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click box to upload picture</p>
                </div>

                <div className="space-y-4">
                  <input required placeholder="Name" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                  <input required placeholder="Phone" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newCust.number} onChange={e => setNewCust({...newCust, number: e.target.value})} />
                  <input required placeholder="Address" className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} />
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl transition-all flex items-center justify-center space-x-2">
                  {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                  <span>{editingCustomerId ? 'Update Changes' : 'Register Customer'}</span>
                </button>
             </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isImporting && setIsImportModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 overflow-hidden border border-slate-100">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-4"><div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><ClipboardPaste size={24} /></div><div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Customer Import</h3><p className="text-xs text-slate-400 font-bold uppercase">Name,Phone,Address,Due</p></div></div>
               <button onClick={() => setIsImportModalOpen(false)}><X size={28} /></button>
             </div>
             <textarea className="w-full h-64 p-6 bg-slate-50 border rounded-[2rem] outline-none font-mono text-xs resize-none" placeholder="Name,Phone,Address,Due..." value={importData} onChange={e => setImportData(e.target.value)} />
             <button onClick={handleBulkImport} disabled={isImporting} className="w-full mt-6 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs active:scale-95 shadow-xl">{isImporting ? <Loader2 className="animate-spin mx-auto" /> : 'Execute Import'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDuePage;
