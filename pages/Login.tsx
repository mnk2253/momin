
import React, { useState } from 'react';
// Redirected modular imports to local wrappers in firebase.ts
import { signInWithEmailAndPassword, auth } from '../firebase';
import { AlertCircle, Lock, Mail } from 'lucide-react';

const Login: React.FC<{ onLogin: any }> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login error code:", err.code);
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. This account has been temporarily disabled. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('An unexpected authentication error occurred. Please contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100 overflow-hidden border border-slate-100">
          <div className="p-10 sm:p-14">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] mb-6 text-white shadow-2xl shadow-indigo-200">
                <span className="text-3xl font-black italic tracking-tighter">ST</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sinthiya Telecom</h1>
              <p className="text-slate-400 mt-2 font-bold tracking-widest uppercase text-[10px]">Cloud Synced Ledger</p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Terminal</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="admin@sinthiya.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Code</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black hover:bg-indigo-700 active:scale-[0.97] transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center space-x-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="uppercase tracking-widest text-xs">Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span className="uppercase tracking-widest text-xs">Access Cloud Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[10px] text-slate-300 font-black uppercase tracking-tighter">
                Any device. Any location. Always synced.
              </p>
            </div>
          </div>
        </div>
        <p className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Sinthiya Telecom © 2025</p>
      </div>
    </div>
  );
};

export default Login;
