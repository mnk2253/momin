
import React from 'react';
import { Construction } from 'lucide-react';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 h-[500px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
      <Construction size={64} className="mb-4 opacity-20" />
      <h3 className="text-2xl font-bold text-slate-700">{title}</h3>
      <p className="mt-2 text-slate-500 max-w-sm">This module is part of the Sinthiya Telecom ecosystem and is currently being optimized for your workflow.</p>
      <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-md">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-2/3"></div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-full"></div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
