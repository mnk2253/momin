
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  X, 
  CheckCircle2, 
  ArrowRightLeft,
  ShoppingCart,
  History,
  AlertCircle,
  BarChart3,
  DollarSign,
  Save,
  RotateCcw,
  Hash,
  Calculator
} from 'lucide-react';
// Redirected modular imports to local wrappers in firebase.ts
import { 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  updateDoc,
  runTransaction,
  limit,
  setDoc,
  getDocs,
  where,
  db
} from '../firebase';
import { Product, StockTransaction, Carrier } from '../types';
import { CARRIERS, CARRIER_LOGOS } from '../constants';

const ITEM_TYPES = [
  "Sim Normal",
  "Replacement Kit",
  "Offer Sim",
  "Minute Card 30 Tk",
  "Others"
];

const StockManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryEditModalOpen, setIsHistoryEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Transaction Form State
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [physicalEndStock, setPhysicalEndStock] = useState<number | ''>('');
  const [formState, setFormState] = useState({
    date: new Date().toISOString().split('T')[0],
    carrier: 'GP' as Carrier,
    itemType: 'Sim Normal',
    quantity: 0,
    price: 0,
    remarks: ''
  });

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormState, setEditFormState] = useState<Partial<Product>>({});

  // Edit History State
  const [editingHistory, setEditingHistory] = useState<StockTransaction | null>(null);
  const [historyEditForm, setHistoryEditForm] = useState<Partial<StockTransaction>>({});

  useEffect(() => {
    // Sync Inventory ordered by slNumber
    const qProducts = query(collection(db, 'products'), orderBy('slNumber', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
      setProducts(pData);
      setLoading(false);
    });

    // Sync Transaction History (Recent 100)
    const qHistory = query(collection(db, 'stock_history'), orderBy('createdAt', 'desc'), limit(150));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const hData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as StockTransaction[];
      setHistory(hData);
    });

    return () => {
      unsubProducts();
      unsubHistory();
    };
  }, []);

  // Helper to get current live stock for selected carrier/item in modal
  const getSelectedLiveStock = () => {
    const found = products.find(p => p.carrier === formState.carrier && p.itemType === formState.itemType);
    return found ? found.stock : 0;
  };

  const totalBuyPrice = formState.quantity * formState.price;

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState.quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const productId = `${formState.carrier}_${formState.itemType}`.replace(/\s+/g, '_');
    const productRef = doc(db, 'products', productId);

    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(productRef);
        const existingProduct = pDoc.exists() ? (pDoc.data() as Product) : null;

        if (txType === 'SELL') {
          if (!existingProduct || existingProduct.stock < formState.quantity) {
            throw new Error(`Insufficient stock for ${formState.carrier} ${formState.itemType}. Current: ${existingProduct?.stock || 0}`);
          }
        }

        const qty = Number(formState.quantity);
        const price = Number(formState.price);
        const totalPrice = qty * price;
        const now = new Date().toISOString();

        let profit = 0;
        if (txType === 'SELL' && existingProduct) {
          profit = (price - (existingProduct.buyPrice || 0)) * qty;
        }

        if (txType === 'BUY') {
          const newQty = (existingProduct?.stock || 0) + qty;
          const newBuyPrice = price;
          const updatedProduct: Partial<Product> = {
            carrier: formState.carrier,
            itemType: formState.itemType,
            name: `${formState.carrier} ${formState.itemType}`,
            stock: newQty,
            buyPrice: newBuyPrice,
            totalValue: newQty * newBuyPrice,
            remarks: formState.remarks,
            minStock: existingProduct?.minStock || 5,
            slNumber: existingProduct?.slNumber || (products.length + 1)
          };
          transaction.set(productRef, updatedProduct, { merge: true });
        } else {
          const newQty = (existingProduct?.stock || 0) - qty;
          transaction.update(productRef, {
            stock: newQty,
            totalValue: newQty * (existingProduct?.buyPrice || 0)
          });
        }

        const historyRef = doc(collection(db, 'stock_history'));
        const historyData: any = {
          id: historyRef.id,
          date: formState.date,
          type: txType,
          carrier: formState.carrier,
          itemType: formState.itemType,
          quantity: qty,
          pricePerUnit: price,
          totalPrice: totalPrice,
          remarks: formState.remarks,
          createdAt: now
        };

        if (txType === 'SELL') {
          historyData.profit = profit;
        }

        transaction.set(historyRef, historyData);
      });

      setIsModalOpen(false);
      setFormState({ ...formState, quantity: 0, price: 0, remarks: '' });
      setPhysicalEndStock('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Transaction failed.");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const productRef = doc(db, 'products', editingProduct.id);
      const buyPrice = Number(editFormState.buyPrice) || 0;
      const updatedData = {
        slNumber: Number(editFormState.slNumber),
        carrier: editFormState.carrier,
        itemType: editFormState.itemType,
        name: `${editFormState.carrier} ${editFormState.itemType}`,
        buyPrice: buyPrice,
        minStock: Number(editFormState.minStock),
        remarks: editFormState.remarks || '',
        totalValue: (editingProduct.stock || 0) * buyPrice
      };

      await updateDoc(productRef, updatedData);
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update product details.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure? This will remove the item from inventory but won't delete past history records.")) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete product.");
    }
  };

  const handleDeleteHistory = async (historyItem: StockTransaction) => {
    if (!window.confirm("Deleting this record will automatically revert the stock change. Continue?")) return;

    const productId = `${historyItem.carrier}_${historyItem.itemType}`.replace(/\s+/g, '_');
    const productRef = doc(db, 'products', productId);

    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(productRef);
        if (!pDoc.exists()) throw new Error("Product master data not found. Cannot revert stock.");
        
        const pData = pDoc.data() as Product;
        let newStock = pData.stock || 0;
        let newBuyPrice = pData.buyPrice || 0;

        if (historyItem.type === 'BUY') {
          newStock -= (historyItem.quantity || 0);
          if (newStock < 0) throw new Error("Negative stock error.");
          
          const historyQ = query(
            collection(db, 'stock_history'), 
            where('carrier', '==', historyItem.carrier),
            where('itemType', '==', historyItem.itemType),
            where('type', '==', 'BUY'),
            orderBy('createdAt', 'desc'),
            limit(2) 
          );
          const historySnap = await getDocs(historyQ);
          const remainingBuys = historySnap.docs.filter(d => d.id !== historyItem.id);
          if (remainingBuys.length > 0) {
            newBuyPrice = remainingBuys[0].data().pricePerUnit || 0;
          }
        } else {
          newStock += (historyItem.quantity || 0);
        }

        transaction.update(productRef, {
          stock: newStock,
          buyPrice: newBuyPrice,
          totalValue: newStock * newBuyPrice
        });

        transaction.delete(doc(db, 'stock_history', historyItem.id));
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete record.");
    }
  };

  const handleEditHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistory || !historyEditForm.quantity) return;

    const productId = `${editingHistory.carrier}_${editingHistory.itemType}`.replace(/\s+/g, '_');
    const productRef = doc(db, 'products', productId);

    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(productRef);
        if (!pDoc.exists()) throw new Error("Master product missing.");
        
        const pData = pDoc.data() as Product;
        let newStock = pData.stock || 0;
        let newBuyPrice = pData.buyPrice || 0;

        if (editingHistory.type === 'BUY') {
          newStock -= (editingHistory.quantity || 0);
        } else {
          newStock += (editingHistory.quantity || 0);
        }

        const newQty = Number(historyEditForm.quantity);
        const newPrice = Number(historyEditForm.pricePerUnit);
        if (editingHistory.type === 'BUY') {
          newStock += newQty;
          newBuyPrice = newPrice; 
        } else {
          newStock -= newQty;
        }

        if (newStock < 0) throw new Error("Negative stock result.");

        let profit = editingHistory.profit;
        if (editingHistory.type === 'SELL') {
          profit = (newPrice - (pData.buyPrice || 0)) * newQty;
        }

        transaction.update(productRef, {
          stock: newStock,
          buyPrice: newBuyPrice,
          totalValue: newStock * newBuyPrice
        });

        transaction.update(doc(db, 'stock_history', editingHistory.id), {
          quantity: newQty,
          pricePerUnit: newPrice,
          totalPrice: newQty * newPrice,
          profit: profit,
          remarks: historyEditForm.remarks,
          date: historyEditForm.date
        });
      });

      setIsHistoryEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Update failed.");
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormState({
      slNumber: product.slNumber,
      carrier: product.carrier,
      itemType: product.itemType,
      buyPrice: product.buyPrice,
      minStock: product.minStock || 5,
      remarks: product.remarks || ''
    });
    setIsEditModalOpen(true);
  };

  const openHistoryEditModal = (item: StockTransaction) => {
    setEditingHistory(item);
    setHistoryEditForm({
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      remarks: item.remarks,
      date: item.date
    });
    setIsHistoryEditModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.carrier.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.itemType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = history.filter(h => 
    h.type === 'SELL' && (
      h.carrier.toLowerCase().includes(historySearchTerm.toLowerCase()) || 
      h.itemType.toLowerCase().includes(historySearchTerm.toLowerCase())
    )
  );

  // Auto calculate quantity sold if physical end stock is entered
  const handlePhysicalStockChange = (val: string) => {
    const shelfQty = val === '' ? '' : Number(val);
    setPhysicalEndStock(shelfQty);
    
    if (shelfQty !== '') {
      const live = getSelectedLiveStock();
      const sold = live - shelfQty;
      if (sold >= 0) {
        setFormState(prev => ({ ...prev, quantity: sold }));
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100">
              <Package size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Stock Management</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Inventory Hub v2.8</p>
            </div>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sales Ledger
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Stock Value</p>
             <p className="text-2xl font-black text-slate-900">৳{products.reduce((acc, p) => acc + (p.totalValue || 0), 0).toLocaleString()}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-3 hover:bg-indigo-700 transition-all font-black shadow-xl shadow-indigo-100 active:scale-95"
          >
            <Plus size={20} />
            <span className="uppercase tracking-widest text-xs">Post Transaction</span>
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                 type="text" 
                 placeholder="Search by carrier or item type..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
               />
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-16 text-center">SL</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Carrier</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Type</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Buy Price</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Qty</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Value</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-indigo-500" size={40} />
                      <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing Inventory...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 text-center">
                         <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-400">
                           {String(p.slNumber || 0).padStart(2, '0')}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center space-x-3">
                           <img src={CARRIER_LOGOS[p.carrier]} alt={p.carrier} className="w-8 h-8 object-contain rounded-lg p-1 bg-white border border-slate-100" />
                           <span className="font-black text-slate-900">{p.carrier}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-700">{p.itemType}</td>
                      <td className="px-8 py-6 font-black text-slate-900">৳{(p.buyPrice || 0).toLocaleString()}</td>
                      <td className="px-8 py-6">
                         <span className={`px-4 py-1.5 rounded-xl font-black text-sm ${ (p.stock || 0) <= (p.minStock || 5) ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {p.stock || 0} Units
                         </span>
                      </td>
                      <td className="px-8 py-6 font-black text-indigo-600">৳{(p.totalValue || 0).toLocaleString()}</td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex items-center justify-end space-x-2">
                           <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEditModal(p)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                             <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                           </div>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <BarChart3 className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="font-bold text-slate-300">No stock records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* History Section: SALES ONLY with Rem. Stock */
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                 type="text" 
                 placeholder="Search sales history..." 
                 value={historySearchTerm}
                 onChange={e => setHistorySearchTerm(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
               />
             </div>
             <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Showing</p>
                <p className="text-sm font-black text-emerald-600">{filteredHistory.length} Sales Entries</p>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-16">SL</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Details</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Qty</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Rate</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Price</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Profit</th>
                  <th className="px-8 py-5 text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50/30">Rem. Stock</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((tx, index) => {
                    const product = products.find(p => p.carrier === tx.carrier && p.itemType === tx.itemType);
                    const remStock = product?.stock || 0;
                    const isLow = product && remStock <= (product.minStock || 5);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-full text-[10px] font-black text-slate-400">
                             {String(index + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-500 font-bold whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center space-x-2">
                             <img src={CARRIER_LOGOS[tx.carrier]} className="w-6 h-6 object-contain" alt="" />
                             <span className="font-black text-slate-800 text-sm tracking-tight">{tx.carrier} {tx.itemType}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 font-bold text-slate-600 text-sm">
                          {tx.quantity || 0}
                        </td>
                        <td className="px-8 py-5 font-bold text-slate-600 text-sm">
                          ৳{(tx.pricePerUnit || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900 text-sm">
                          ৳{(tx.totalPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-emerald-600 text-sm">+৳{(tx.profit || 0).toLocaleString()}</span>
                        </td>
                        <td className={`px-8 py-5 font-black text-sm bg-emerald-50/20 ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                           {remStock} Units
                        </td>
                        <td className="px-8 py-5 text-right">
                           <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openHistoryEditModal(tx)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all"><Edit2 size={16}/></button>
                              <button onClick={() => handleDeleteHistory(tx)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"><RotateCcw size={16}/></button>
                           </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-8 py-20 text-center">
                      <History size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No sales recorded yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className={`p-8 flex items-center justify-between text-white ${txType === 'BUY' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
               <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-2xl">{txType === 'BUY' ? <ShoppingCart size={24} /> : <TrendingUp size={24} />}</div>
                  <div>
                     <h3 className="text-2xl font-black tracking-tight uppercase leading-none">{txType === 'BUY' ? 'Buy Stock' : 'Record Sale'}</h3>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1.5">Sinthiya Telecom Ledger</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleTransaction} className="p-10 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl">
                <button type="button" onClick={() => setTxType('BUY')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${txType === 'BUY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Buy Mode</button>
                <button type="button" onClick={() => setTxType('SELL')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${txType === 'SELL' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Sell Mode</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Carrier</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer" value={formState.carrier} onChange={e => setFormState({...formState, carrier: e.target.value as Carrier})}>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Item Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer" value={formState.itemType} onChange={e => setFormState({...formState, itemType: e.target.value})}>
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* LIVE STOCK DISPLAY */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Inventory Stock</p>
                  <p className={`text-xl font-black ${getSelectedLiveStock() <= 5 ? 'text-rose-500' : 'text-slate-900'}`}>{getSelectedLiveStock()} Units Available</p>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Package size={20} className="text-slate-300" />
                </div>
              </div>

              {/* SELL CALCULATION HELPER */}
              {txType === 'SELL' && (
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] space-y-4">
                   <div className="flex items-center space-x-2 mb-2">
                     <Calculator size={16} className="text-emerald-600" />
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sales Calculator Helper</span>
                   </div>
                   <div>
                     <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 block ml-1">Physical End Stock (Shelf Count)</label>
                     <input 
                       type="number" 
                       onWheel={e => e.currentTarget.blur()}
                       placeholder="Enter current physical count..."
                       className="w-full px-5 py-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" 
                       value={physicalEndStock} 
                       onChange={e => handlePhysicalStockChange(e.target.value)} 
                     />
                     <p className="text-[9px] text-emerald-400 font-medium mt-1.5 ml-1 leading-tight italic">
                        Formula: {getSelectedLiveStock()} (Old Stock) - {physicalEndStock || '0'} (Shelf Stock) = {formState.quantity || '0'} (Sold)
                     </p>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Quantity {txType === 'SELL' ? 'Sold' : 'Bought'}</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={formState.quantity || ''} onChange={e => setFormState({...formState, quantity: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Price / Unit</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={formState.price || ''} onChange={e => setFormState({...formState, price: Number(e.target.value)})} />
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl text-center space-y-1 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={80} /></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Estimated Total</p>
                 <p className="text-3xl font-black text-white">৳{(totalBuyPrice || 0).toLocaleString()}</p>
              </div>

              <button type="submit" className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 shadow-xl transition-all active:scale-[0.98] text-white ${txType === 'BUY' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'}`}>
                <CheckCircle2 size={18} />
                <span>{txType === 'BUY' ? 'Execute Buy Order' : 'Finalize Sale'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit History Ledger Modal */}
      {isHistoryEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className={`p-8 flex items-center justify-between text-white ${editingHistory?.type === 'BUY' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
               <div>
                  <h3 className="text-2xl font-black tracking-tight uppercase leading-none">Modify Entry</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1.5">Adjusting Ledger Record</p>
               </div>
               <button onClick={() => setIsHistoryEditModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleEditHistory} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Quantity</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={historyEditForm.quantity || ''} onChange={e => setHistoryEditForm({...historyEditForm, quantity: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Price / Unit</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={historyEditForm.pricePerUnit || ''} onChange={e => setHistoryEditForm({...historyEditForm, pricePerUnit: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Entry Date</label>
                <input required type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={historyEditForm.date} onChange={e => setHistoryEditForm({...historyEditForm, date: e.target.value})} />
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl text-center space-y-1 shadow-2xl relative overflow-hidden group">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">New Total Flow</p>
                 <p className="text-3xl font-black text-white">৳{((Number(historyEditForm.quantity) || 0) * (Number(historyEditForm.pricePerUnit) || 0)).toLocaleString()}</p>
                 <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mt-2">Warning: Stock levels will re-balance automatically</p>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 shadow-xl transition-all active:scale-[0.98]">
                <Save size={18} />
                <span>Commit Ledger Change</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inventory Item Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 bg-indigo-600 flex items-center justify-between text-white">
               <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-2xl"><Edit2 size={24} /></div>
                  <div>
                     <h3 className="text-2xl font-black tracking-tight uppercase leading-none">Edit Item Details</h3>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1.5">Inventory Master Data</p>
                  </div>
               </div>
               <button onClick={() => setIsEditModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-10 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Serial Number (SL)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={editFormState.slNumber || ''} onChange={e => setEditFormState({...editFormState, slNumber: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Carrier</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer" value={editFormState.carrier} onChange={e => setEditFormState({...editFormState, carrier: e.target.value as Carrier})}>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Item Type</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer" value={editFormState.itemType} onChange={e => setEditFormState({...editFormState, itemType: e.target.value})}>
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Buy Price (Market Cost)</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" value={editFormState.buyPrice || ''} onChange={e => setEditFormState({...editFormState, buyPrice: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Min. Stock Alert</label>
                  <input required type="number" onWheel={e => e.currentTarget.blur()} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-black text-lg" value={editFormState.minStock || ''} onChange={e => setEditFormState({...editFormState, minStock: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Remarks / Note</label>
                <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-24 resize-none" placeholder="Additional details..." value={editFormState.remarks} onChange={e => setEditFormState({...editFormState, remarks: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 shadow-xl transition-all active:scale-[0.98]">
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
