
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  User, 
  Phone, 
  Lock, 
  CreditCard, 
  Calendar, 
  Info, 
  X, 
  Eye, 
  EyeOff,
  Filter,
  Save,
  RotateCcw,
  MapPin
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
import { CustomerAccountRecord } from '../types';

const SERVICES = ["Bkash", "Nagad", "Rocket", "Gp", "Robi", "Airtel", "BL"];
const STATUS_OPTIONS = ["New Sim", "Sim Owner", "Sim Others", "Replace"];

const DataCollectPage: React.FC = () => {
  const [records, setRecords] = useState<CustomerAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  
  const [formState, setFormState] = useState<Partial<CustomerAccountRecord>>({
    name: '',
    address: '',
    service: 'Bkash',
    number: '',
    pin: '',
    nid: '',
    dob: '',
    status: 'New Sim',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'customer_accounts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as CustomerAccountRecord[];
      setRecords(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.number.includes(searchTerm) || 
    r.nid.includes(searchTerm)
  );

  const togglePin = (id: string) => {
    setShowPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formState,
        slNumber: editingId ? (records.find(r => r.id === editingId)?.slNumber || records.length + 1) : records.length + 1,
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'customer_accounts', editingId), data);
      } else {
        await addDoc(collection(db, 'customer_accounts'), data);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data. Please try again.");
    }
  };

  const handleEditStart = (record: CustomerAccountRecord) => {
    setEditingId(record.id);
    setFormState({
      name: record.name,
      address: record.address || '',
      service: record.service,
      number: record.number,
      pin: record.pin,
      nid: record.nid,
      dob: record.dob,
      status: record.status,
      date: record.date
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormState({
      name: '',
      address: '',
      service: 'Bkash',
      number: '',
      pin: '',
      nid: '',
      dob: '',
      status: 'New Sim',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Database size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Data Collection</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Customer Account Database v2.2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-3 hover:bg-indigo-700 transition-all font-black shadow-xl whitespace-nowrap"
          >
            <Plus size={20} />
            <span className="uppercase tracking-widest text-xs">Add Record</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-16 text-center">SL</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Info</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">NID/DOB</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-500" size={40} />
                  </td>
                </tr>
              ) : filteredRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 text-center">
                     <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-400">
                       {index + 1}
                     </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-400">{record.date}</td>
                  <td className="px-8 py-6">
                     <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                         <User size={20} />
                       </div>
                       <div>
                         <p className="font-black text-slate-800">{record.name}</p>
                         <p className="text-[10px] text-slate-400">{record.address}</p>
                       </div>
                     </div>
                  </td>
                  <td className="px-8 py-6 font-black text-xs uppercase">{record.service}</td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-700">{record.number}</p>
                      <div className="flex items-center space-x-2">
                         <span className="text-xs font-mono text-indigo-500 font-black">
                           {showPins[record.id] ? record.pin : '••••'}
                         </span>
                         <button onClick={() => togglePin(record.id)}>
                           {showPins[record.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-600">{record.nid || 'N/A'}</p>
                    <p className="text-[10px] font-bold text-slate-400">{record.dob || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6">
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                       {record.status}
                     </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                     <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleEditStart(record)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                       <button onClick={async () => { if(confirm(`Delete?`)) await deleteDoc(doc(db, 'customer_accounts', record.id)); }} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18} /></button>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-3xl font-black uppercase">{editingId ? 'Edit' : 'Add'} Record</h3>
               <button onClick={handleCloseModal}><X size={24} /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Full Name</label>
                    <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Address</label>
                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={formState.address} onChange={e => setFormState({...formState, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Service</label>
                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.service} onChange={e => setFormState({...formState, service: e.target.value})}>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Number</label>
                    <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.number} onChange={e => setFormState({...formState, number: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">PIN</label>
                    <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.pin} onChange={e => setFormState({...formState, pin: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Status</label>
                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.status} onChange={e => setFormState({...formState, status: e.target.value})}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">NID</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" value={formState.nid} onChange={e => setFormState({...formState, nid: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">DOB</label>
                    <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black" placeholder="DD-MM-YYYY" value={formState.dob} onChange={e => setFormState({...formState, dob: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={handleCloseModal} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-xs">Discard</button>
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                    <Save size={18} />
                    <span>{editingId ? 'Save Changes' : 'Save Record'}</span>
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCollectPage;
