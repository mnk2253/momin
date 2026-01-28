
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  FileText, 
  RefreshCcw,
  Printer,
  User,
  Phone,
  Loader2, 
  Search, 
  X, 
  ChevronRight, 
  Users,
  Calculator,
  Calendar,
  CheckCircle2,
  MapPin,
  History,
  Download,
  Edit2,
  Save
} from 'lucide-react';
// Redirected modular imports to local wrappers in firebase.ts
import { collection, getDocs, query, orderBy, db, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from '../firebase';
import { Customer } from '../types';

interface MemoItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface SavedMemo {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  items: MemoItem[];
  subtotal: number;
  createdAt: string;
}

type Language = 'en' | 'bn';

const translations = {
  en: {
    title: 'Cash Memo',
    subtitle: 'Sinthiya Telecom',
    printBtn: 'Download PDF',
    updateBtn: 'Update & Download',
    reset: 'Reset',
    custInfo: 'Customer Information',
    selectDir: 'Directory',
    clientName: 'Customer Name',
    clientAddress: 'Address',
    phone: 'Phone',
    date: 'Date',
    totalPayable: 'Total Bill',
    itemsListed: 'Items',
    billingDetails: 'Invoice Items',
    addProduct: 'Add Item',
    sl: 'SL',
    desc: 'Description',
    qty: 'Qty',
    price: 'Rate',
    amount: 'Total',
    grandTotal: 'Grand Total',
    amountInWords: 'In Words',
    placeholderName: 'General Customer',
    placeholderAddress: 'Customer Address...',
    placeholderProd: 'Item name...',
    searchClient: 'Search...',
    selectClient: 'Select Customer',
    directory: 'Directory',
    currencySuffix: 'Taka Only',
    authSign: 'Authorized Signature',
    custSign: 'Customer Signature',
    proprietor: 'Proprietor',
    owner: 'Md. Abdul Momin',
    address: 'Hat Pangashi Nahid New Market, Raigonj, Sirajganj',
    contact: '01307085310 (Imo & WhatsApp)',
    footerMsg: 'Sold items are not returnable. Thank you!',
    historyTitle: 'Memo History',
    searchHistory: 'Search history...',
    noHistory: 'No memos found in history.'
  },
  bn: {
    title: 'ক্যাশ মেমো',
    subtitle: 'সিনথিয়া টেলিকম',
    printBtn: 'মেমো ডাউনলোড করুন',
    updateBtn: 'আপডেট ও ডাউনলোড',
    reset: 'মুছে ফেলুন',
    custInfo: 'ক্রেতার তথ্য',
    selectDir: 'ডিরেক্টরি',
    clientName: 'গ্রাহকের নাম',
    clientAddress: 'ঠিকানা',
    phone: 'মোবাইল নম্বর',
    date: 'তারিখ',
    totalPayable: 'মোট বিল',
    itemsListed: 'টি আইটেম',
    billingDetails: 'মালের বিবরণ',
    addProduct: 'মাল যোগ করুন',
    sl: 'নং',
    desc: 'মালের বিবরণ',
    qty: 'পরিমাণ',
    price: 'দর',
    amount: 'মোট টাকা',
    grandTotal: 'সর্বমোট',
    amountInWords: 'কথায়',
    placeholderName: 'সাধারণ গ্রাহক',
    placeholderAddress: 'গ্রাহকের ঠিকানা...',
    placeholderProd: 'মালের নাম লিখুন...',
    searchClient: 'খুঁজুন...',
    selectClient: 'গ্রাহক নির্বাচন করুন',
    directory: 'কাস্টমার ডিরেক্টরি',
    currencySuffix: 'টাকা মাত্র',
    authSign: 'অনুমোদিত স্বাক্ষর',
    custSign: 'ক্রেতার স্বাক্ষর',
    proprietor: 'প্রোপ্রাইটর',
    owner: 'মো: আব্দুল মোমিন',
    address: 'হাট পাঙ্গাসী নাহিদ নিউ মার্কেট, রায়গঞ্জ, সিরাজগঞ্জ',
    contact: '০১৩০৭০৮৫৩১০ (ইমো ও হোয়াটসঅ্যাপ)',
    footerMsg: 'বিক্রিত মাল ফেরত নেওয়া হয় না। ধন্যবাদ।',
    historyTitle: 'মেমো ইতিহাস',
    searchHistory: 'ইতিহাস খুঁজুন...',
    noHistory: 'ইতিহাসে কোনো মেমো পাওয়া যায়নি।'
  }
};

const numberToWordsBN = (num: number): string => {
  const bnNumbers = ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁয়ত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ', 'একচল্লিশ', 'বয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষাটি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতঘটি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছেয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছেয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই', 'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছেয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'];
  if (num === 0) return bnNumbers[0];
  let output = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;
  const remaining = num;
  if (crore > 0) output += numberToWordsBN(crore) + ' কোটি ';
  if (lakh > 0) output += bnNumbers[lakh] + ' লাখ ';
  if (thousand > 0) output += bnNumbers[thousand] + ' হাজার ';
  if (hundred > 0) output += bnNumbers[hundred] + ' শত ';
  if (remaining > 0) output += bnNumbers[remaining];
  return output.trim();
};

const numberToWordsEN = (num: number): string => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (num === 0) return 'zero';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] !== '00' ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
  str += n[2] !== '00' ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
  str += n[3] !== '00' ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
  str += n[4] !== '0' ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
  str += n[5] !== '00' ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim();
};

const CashMemoPage: React.FC = () => {
  const [language, setLanguage] = useState<Language>('bn');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [memoHistory, setMemoHistory] = useState<SavedMemo[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [items, setItems] = useState<MemoItem[]>([
    { id: '1', name: '', quantity: 1, price: 0 }
  ]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const printRef = useRef<HTMLDivElement>(null);

  const t = translations[language];
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const amountInWordsText = language === 'bn' 
    ? `${numberToWordsBN(subtotal)} ${t.currencySuffix}`
    : `${numberToWordsEN(subtotal)} ${t.currencySuffix}`;

  useEffect(() => {
    if (isSelectModalOpen) fetchCustomers();
  }, [isSelectModalOpen]);

  useEffect(() => {
    const q = query(collection(db, 'memos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memos = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedMemo[];
      setMemoHistory(memos);
      setLoadingHistory(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const q = query(collection(db, 'customers'), orderBy('name'));
      const snap = await getDocs(q);
      setCustomers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Customer[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const addItem = () => setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, price: 0 }]);
  const removeItem = (id: string) => items.length > 1 && setItems(items.filter(item => item.id !== id));
  const updateItem = (id: string, field: keyof MemoItem, value: any) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setEditingMemoId(null);
    setItems([{ id: '1', name: '', quantity: 1, price: 0 }]);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const saveMemoToDatabase = async () => {
    try {
      const memoData = {
        customerName: customerName || translations[language].placeholderName,
        customerPhone: customerPhone || 'N/A',
        customerAddress: customerAddress || 'N/A',
        date: date,
        items: items.filter(i => i.name.trim() !== '' && i.price > 0),
        subtotal: subtotal,
        createdAt: new Date().toISOString()
      };
      
      if (editingMemoId) {
        await updateDoc(doc(db, 'memos', editingMemoId), memoData);
      } else {
        await addDoc(collection(db, 'memos'), memoData);
      }
    } catch (error) {
      console.error("Error saving memo to Firestore:", error);
    }
  };

  const handlePrint = async () => {
    const validItems = items.filter(item => item.name.trim() !== '' && item.price > 0);
    if (validItems.length === 0) {
      alert(language === 'bn' ? "দয়া করে অন্তত একটি মালের বিবরণ সঠিক ভাবে লিখুন।" : "Please add valid items.");
      return;
    }

    setIsProcessing(true);
    const element = printRef.current;
    if (!element) return;

    await saveMemoToDatabase();
    await new Promise(r => setTimeout(r, 400));

    const opt = {
      margin: 0,
      filename: `Memo_${customerName || 'Customer'}_${date}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        letterRendering: false,
        textRendering: 'optimizeLegibility',
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await (window as any).html2pdf().from(element).set(opt).save();
      if (!editingMemoId) resetForm();
      else setEditingMemoId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadMemoForEdit = (memo: SavedMemo) => {
    if (window.confirm(language === 'bn' ? "এই মেমোটি এডিট করতে চান? বর্তমান ফর্মের তথ্য মুছে যাবে।" : "Load this memo for editing? Current form data will be lost.")) {
      setEditingMemoId(memo.id);
      setCustomerName(memo.customerName);
      setCustomerPhone(memo.customerPhone);
      setCustomerAddress(memo.customerAddress);
      setDate(memo.date);
      setItems(memo.items.length > 0 ? memo.items : [{ id: '1', name: '', quantity: 1, price: 0 }]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const deleteMemo = async (memoId: string) => {
    if (window.confirm(language === 'bn' ? "মেমোটি ইতিহাস থেকে মুছে ফেলতে চান?" : "Delete this memo from history?")) {
      try {
        await deleteDoc(doc(db, 'memos', memoId));
        if (editingMemoId === memoId) setEditingMemoId(null);
      } catch (error) {
        console.error("Error deleting memo:", error);
      }
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.number.includes(customerSearch));
  const filteredHistory = memoHistory.filter(m => 
    m.customerName.toLowerCase().includes(historySearch.toLowerCase()) || 
    m.customerPhone.includes(historySearch) ||
    m.date.includes(historySearch)
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 max-w-6xl mx-auto px-2 sm:px-0">
      {/* 
        PDF TEMPLATE (HIDDEN)
      */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div ref={printRef} className="w-[210mm] h-[297mm] bg-white text-slate-900 overflow-hidden flex flex-col" style={{ fontFamily: '"Noto Sans Bengali", "Inter", sans-serif' }}>
          <style>{`
            .pdf-memo-container { width: 100%; height: 100%; padding: 0; margin: 0; display: flex; flex-direction: column; text-rendering: optimizeLegibility; font-variant-ligatures: normal; font-feature-settings: "liga" on, "kern" on; }
            .pdf-header { background: #4f46e5; color: white; padding: 35px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 6px solid #3730a3; }
            .pdf-header h1 { font-size: 38px; font-weight: 900; margin: 0; line-height: 1.1; }
            .pdf-customer-section { padding: 25px 50px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; }
            .pdf-table-container { flex: 1; padding: 30px 50px; overflow: hidden; }
            .pdf-table { width: 100%; border-collapse: collapse; }
            .pdf-table th { background: #1e293b; color: white; padding: 14px 15px; font-size: 13px; text-align: left; }
            .pdf-table td { padding: 14px 15px; border-bottom: 1px solid #f1f5f9; font-size: 15px; font-weight: 600; }
            .pdf-total-box { width: 38%; background: #4f46e5; color: white; padding: 25px 30px; border-radius: 12px; text-align: right; }
          `}</style>
          <div className="pdf-memo-container">
            <div className="pdf-header">
              <div><h1>{t.subtitle}</h1><p>{t.address}</p><p>{t.phone}: {t.contact}</p></div>
              <div className="pdf-memo-badge"><h2>{t.title}</h2><p>{t.date}: {date}</p></div>
            </div>
            <div className="pdf-customer-section">
              <div style={{width:'60%'}}><div className="pdf-label">{t.custInfo}</div><div className="pdf-value">{customerName || t.placeholderName}</div><div style={{marginTop:'8px'}}><div className="pdf-label">{t.clientAddress}</div><div className="pdf-value">{customerAddress || 'N/A'}</div></div></div>
              <div style={{textAlign:'right', width:'35%'}}><div className="pdf-label">{t.phone}</div><div className="pdf-value">{customerPhone || 'N/A'}</div></div>
            </div>
            <div className="pdf-table-container">
              <table className="pdf-table">
                <thead><tr><th>{t.sl}</th><th>{t.desc}</th><th>{t.qty}</th><th>{t.price}</th><th>{t.amount}</th></tr></thead>
                <tbody>{items.filter(i => i.name.trim() !== '' && i.price > 0).map((item, idx) => (<tr key={idx}><td>{idx + 1}</td><td>{item.name}</td><td>{item.quantity}</td><td>{item.price.toLocaleString()}</td><td style={{color:'#4f46e5'}}>{(item.quantity * item.price).toLocaleString()}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="pdf-footer-summary" style={{padding: '0 50px 40px', display:'flex', justifyContent:'space-between'}}>
              <div className="pdf-words-box" style={{width:'55%', background:'#f1f5f9', padding:'20px', borderRadius:'12px'}}><div className="pdf-label" style={{color:'#4f46e5'}}>{t.amountInWords}</div><div style={{fontStyle:'italic'}}>{amountInWordsText}</div></div>
              <div className="pdf-total-box"><div>{t.grandTotal}</div><h2 style={{fontSize:'32px'}}>৳{subtotal.toLocaleString()}/-</h2></div>
            </div>
            <div className="pdf-signature-area" style={{padding:'0 60px 50px', display:'flex', justifyContent:'space-between'}}><div>{t.custSign}</div><div style={{textAlign:'right'}}><div>{t.proprietor}</div><div style={{fontSize:'20px', fontWeight:900}}>{t.owner}</div><div>{t.authSign}</div></div></div>
            <div className="pdf-bottom-msg" style={{textAlign:'center', padding:'20px'}}>{t.footerMsg}</div>
          </div>
        </div>
      </div>

      {/* UI CONTROLS */}
      <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="bg-indigo-600 p-3 md:p-5 rounded-[1rem] md:rounded-[1.5rem] text-white shadow-xl shadow-indigo-100"><ShoppingBag size={24} className="md:w-7 md:h-7" /></div>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">{editingMemoId ? (language === 'bn' ? 'মেমো এডিট' : 'Edit Memo') : t.title}</h2>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
             {['bn', 'en'].map(lang => (
               <button key={lang} onClick={() => setLanguage(lang as Language)} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${language === lang ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                 {lang === 'bn' ? 'বাংলা' : 'English'}
               </button>
             ))}
          </div>
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <button onClick={resetForm} className="p-3 md:p-4 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl md:rounded-2xl transition-all" title={t.reset}><RefreshCcw size={20} /></button>
            <button onClick={handlePrint} disabled={isProcessing} className={`flex-1 md:flex-none ${editingMemoId ? 'bg-emerald-600 shadow-emerald-100' : 'bg-indigo-600 shadow-indigo-100'} text-white px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center space-x-2 md:space-x-3 hover:opacity-90 transition-all font-black shadow-xl active:scale-95 disabled:opacity-50`}>
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : (editingMemoId ? <Save size={18} /> : <Printer size={18} />)}
              <span className="uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">{editingMemoId ? t.updateBtn : t.printBtn}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Customer & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border ${editingMemoId ? 'border-emerald-200 ring-2 ring-emerald-500/10' : 'border-slate-100'} space-y-6`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                <User size={16} className={`mr-2 ${editingMemoId ? 'text-emerald-600' : 'text-indigo-600'}`} />
                {t.custInfo}
              </h3>
              <button onClick={() => setIsSelectModalOpen(true)} title={t.selectDir} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Users size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.clientName}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" placeholder={t.placeholderName} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.phone}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="01XXX-XXXXXX" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.date}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="date" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">{t.clientAddress}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" placeholder={t.placeholderAddress} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10"><Calculator size={80} className="w-16 h-16 md:w-20 md:h-20" /></div>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalPayable}</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-indigo-400">৳{subtotal.toLocaleString()}</h2>
            <div className="h-px bg-white/10 w-full my-4"></div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center"><CheckCircle2 size={12} className="mr-2 text-indigo-500" />{items.length} {t.itemsListed}</p>
          </div>
        </div>

        {/* Right Column: Items List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center"><FileText size={16} className="mr-2 text-indigo-600" />{t.billingDetails}</h3>
              <button onClick={addItem} className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-black text-[10px] md:text-xs uppercase tracking-widest"><Plus size={16} /><span>{t.addProduct}</span></button>
            </div>
            
            {/* Table Header (Desktop Only) */}
            <div className="hidden sm:grid grid-cols-12 gap-4 mb-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="col-span-1 text-center">{t.sl}</div>
              <div className="col-span-5">{t.desc}</div>
              <div className="col-span-2 text-center">{t.qty}</div>
              <div className="col-span-2 text-right">{t.price}</div>
              <div className="col-span-2 text-right">{t.amount}</div>
            </div>

            <div className="flex-1 space-y-4 sm:space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-slate-50/50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border sm:border-none border-slate-100">
                  <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                    {/* SL Number */}
                    <div className="hidden sm:block col-span-1 text-center font-black text-slate-300">{index + 1}</div>
                    
                    {/* Item Name */}
                    <div className="col-span-12 sm:col-span-5">
                      <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase mb-1">{t.desc}</div>
                      <input type="text" placeholder={t.placeholderProd} className="w-full px-4 py-2.5 md:py-3 bg-white sm:bg-slate-50 border border-slate-100 sm:border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} />
                    </div>

                    {/* Quantity & Price */}
                    <div className="col-span-5 sm:col-span-2">
                      <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase mb-1">{t.qty}</div>
                      <input type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-2 sm:px-4 py-2.5 md:py-3 bg-white sm:bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-center text-sm" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-7 sm:col-span-2">
                      <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase mb-1">{t.price}</div>
                      <input type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-2 sm:px-4 py-2.5 md:py-3 bg-white sm:bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-right text-sm" value={item.price || ''} onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))} />
                    </div>

                    {/* Total & Action */}
                    <div className="col-span-9 sm:col-span-2 text-right font-black text-sm text-slate-600 sm:pr-2 pt-2 sm:pt-0">
                       <span className="sm:hidden text-[10px] font-bold text-slate-400 mr-2 uppercase">{t.amount}:</span>
                       ৳{(item.quantity * item.price).toLocaleString()}
                    </div>
                    <div className="col-span-3 sm:col-span-1 flex justify-end pt-2 sm:pt-0">
                      <button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="p-2 text-slate-300 hover:text-rose-500 disabled:opacity-0 transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MEMO HISTORY SECTION */}
      <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner"><History size={24} /></div>
            <div>
               <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{t.historyTitle}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recent Invoices</p>
            </div>
          </div>
          <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors size={18}" />
            <input type="text" placeholder={t.searchHistory} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl md:rounded-3xl border border-slate-50">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 md:px-8 py-5 text-center w-16">{t.sl}</th>
                <th className="px-6 md:px-8 py-5">{t.date}</th>
                <th className="px-6 md:px-8 py-5">{t.clientName}</th>
                <th className="px-6 md:px-8 py-5">{t.totalPayable}</th>
                <th className="px-6 md:px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingHistory ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((memo, index) => (
                  <tr key={memo.id} className={`hover:bg-slate-50/50 transition-colors group ${editingMemoId === memo.id ? 'bg-emerald-50' : ''}`}>
                    <td className="px-6 md:px-8 py-5 text-center font-black text-slate-300 text-xs">{index + 1}</td>
                    <td className="px-6 md:px-8 py-5 text-xs font-bold text-slate-500">{memo.date}</td>
                    <td className="px-6 md:px-8 py-5">
                       <p className="font-black text-slate-800 text-sm tracking-tight">{memo.customerName}</p>
                       <p className="text-[10px] text-slate-400 font-bold">{memo.customerPhone}</p>
                    </td>
                    <td className="px-6 md:px-8 py-5"><span className="px-3 md:px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm">৳{memo.subtotal.toLocaleString()}</span></td>
                    <td className="px-6 md:px-8 py-5 text-right">
                       <div className="flex items-center justify-end space-x-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => loadMemoForEdit(memo)} title="Edit/Load Memo" className={`p-2.5 rounded-xl transition-all shadow-sm ${editingMemoId === memo.id ? 'text-white bg-emerald-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}><Edit2 size={18}/></button>
                         <button onClick={() => deleteMemo(memo.id)} title="Delete Memo" className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm"><Trash2 size={18}/></button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold text-sm">{t.noHistory}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER SELECTION MODAL */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSelectModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 md:p-8 bg-indigo-600 flex items-center justify-between text-white">
               <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-2 md:p-3 rounded-xl md:rounded-2xl"><Users size={24} /></div>
                  <h3 className="text-xl md:text-2xl font-black uppercase">{t.selectClient}</h3>
               </div>
               <button onClick={() => setIsSelectModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-4 md:p-6 border-b">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder={t.searchClient} className="w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingCustomers ? (
                <div className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-indigo-500" /></div>
              ) : filteredCustomers.map(customer => (
                <button key={customer.id} onClick={() => { setCustomerName(customer.name); setCustomerPhone(customer.number); setCustomerAddress(customer.address); setIsSelectModalOpen(false); }} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group">
                  <div className="flex items-center space-x-4">
                    <img src={customer.imageUrl} className="w-10 h-10 rounded-xl border object-cover bg-slate-100" alt="" />
                    <div className="text-left">
                      <p className="font-black text-slate-800 text-sm">{customer.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{customer.number}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashMemoPage;
