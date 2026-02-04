
import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon, 
  Info, 
  Calendar, 
  MapPin, 
  CheckCircle2,
  Building2,
  Clock,
  History,
  Timer
} from 'lucide-react';
import { auth } from '../firebase';
import { MENU_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBusinessInfoOpen, setIsBusinessInfoOpen] = useState(false);
  const location = useLocation();
  const currentUser = auth.currentUser;

  // Calculate Business Duration
  const businessDuration = useMemo(() => {
    const startDate = new Date('2019-05-06');
    const today = new Date();
    
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    if (days < 0) {
      months -= 1;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  }, []);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-56 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 border-b border-slate-50">
            <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">
              Sinthiya Telecom
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Digital Ledger v2.5</p>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-hide">
            {MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-200
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold translate-x-1' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
                  `}
                >
                  <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-50">
            <button 
              onClick={onLogout}
              className="flex items-center space-x-3 px-5 py-4 w-full rounded-2xl text-rose-600 hover:bg-rose-50 font-bold transition-all duration-200 group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Secure Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 lg:flex-none ml-4 lg:ml-0">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {MENU_ITEMS.find(item => item.path === location.pathname)?.name || 'Management'}
            </h2>
          </div>

          <div 
            className="flex items-center space-x-5 cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all group"
            onClick={() => setIsBusinessInfoOpen(true)}
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-black text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">
                {currentUser?.displayName || 'Abdul Momin'}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                {currentUser?.displayName ? 'User Account' : 'Owner & CEO'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
               <UserIcon size={24} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-50/50">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Business Info Modal */}
      {isBusinessInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBusinessInfoOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-0 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
             <div className="bg-indigo-600 p-10 text-white relative">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                  <Building2 size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black tracking-tight leading-none mb-2">Business Profile</h3>
                  <p className="text-indigo-200 text-xs font-black uppercase tracking-widest">Sinthiya Telecom</p>
                </div>
                <button 
                  onClick={() => setIsBusinessInfoOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
             </div>

             <div className="p-10 space-y-8">
                {/* Duration Counter Section */}
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                   <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <History size={60} />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center space-x-2 mb-3">
                         <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Timer size={14} className="animate-pulse" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operating Duration</p>
                      </div>
                      <div className="flex items-baseline space-x-2">
                         <span className="text-3xl font-black tracking-tighter text-white">{businessDuration.years}</span>
                         <span className="text-[10px] font-bold text-indigo-400 uppercase">Years</span>
                         <span className="text-3xl font-black tracking-tighter text-white ml-2">{businessDuration.months}</span>
                         <span className="text-[10px] font-bold text-indigo-400 uppercase">Months</span>
                         <span className="text-2xl font-black tracking-tighter text-white ml-2">{businessDuration.days}</span>
                         <span className="text-[10px] font-bold text-indigo-400 uppercase">Days</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-widest italic">Since Establishment Date</p>
                   </div>
                </div>

                <div className="flex items-start space-x-5">
                   <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner">
                      <Calendar size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Start Date</p>
                      <p className="text-lg font-black text-slate-900">06 May 2019</p>
                      <p className="text-[10px] text-emerald-500 font-bold flex items-center mt-1">
                        <CheckCircle2 size={12} className="mr-1" /> Verified Establishment
                      </p>
                   </div>
                </div>

                <div className="flex items-start space-x-5">
                   <div className="bg-amber-50 p-3 rounded-2xl text-amber-600 shadow-inner">
                      <UserIcon size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proprietor</p>
                      <p className="text-lg font-black text-slate-900">মো: আব্দুল মোমিন</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Owner & CEO</p>
                   </div>
                </div>

                <div className="flex items-start space-x-5">
                   <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shadow-inner">
                      <MapPin size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed">
                        হাট পাঙ্গাসী নাহিদ নিউ মার্কেট, রায়গঞ্জ, সিরাজগঞ্জ
                      </p>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center space-x-2">
                         <Info size={14} className="text-indigo-500" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Run 27.01.2026 </span>
                      </div>
                      <span className="text-xs font-black text-indigo-600">Main Cash 117,868</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
