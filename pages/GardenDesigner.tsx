
import React, { useState, useRef } from 'react';
import { 
  Leaf, 
  Sparkles, 
  Upload, 
  Link as LinkIcon, 
  ImageIcon, 
  Loader2, 
  Download, 
  Wand2, 
  Trash2,
  Share2,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const GARDEN_STYLES = [
  { id: 'modern', name: 'Modern Minimalist', description: 'Clean lines, structural plants, and open space.' },
  { id: 'tropical', name: 'Tropical Paradise', description: 'Lush greenery, exotic flowers, and high humidity vibes.' },
  { id: 'japanese', name: 'Zen Japanese', description: 'Tranquil rocks, water features, and mossy paths.' },
  { id: 'english', name: 'English Cottage', description: 'Romantic flowers, winding paths, and wild charm.' },
  { id: 'mediterranean', name: 'Mediterranean', description: 'Terra cotta, olive trees, and sun-loving herbs.' },
];

const GardenDesigner: React.FC = () => {
  const [size, setSize] = useState('');
  const [style, setStyle] = useState('modern');
  const [preferences, setPreferences] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ text: string, image: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large for processing. Please use a file under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateGarden = async () => {
    if (!size || !preferences) {
      alert("Please enter garden size and preferences first!");
      return;
    }

    // Always use process.env.API_KEY directly as per guidelines.
    // Prohibited: openSelectKey() is removed as these models do not require mandatory user-selected keys.

    setIsGenerating(true);
    setResult(null);

    try {
      // Create a new GoogleGenAI instance right before making an API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Helper to prepare image part for Gemini if a base64 string is present
      let imagePart: any = null;
      if (imageUrl && imageUrl.startsWith('data:')) {
        const [header, base64Data] = imageUrl.split(';base64,');
        const mimeType = header.split(':')[1];
        imagePart = {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        };
      }

      const textPrompt = `Act as a world-class landscape architect. Design a ${style} garden for a space of ${size}. 
        User preferences: ${preferences}. 
        Provide a structured layout description and a list of 5 specific plants that would thrive in this setup. 
        Keep it professional and inspiring. ${imagePart ? 'Use the attached reference photo of the current space to inform your design.' : ''}`;

      // 1. Generate text layout using Gemini 3 Pro
      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: imagePart ? { parts: [imagePart, { text: textPrompt }] } : textPrompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 } // Enable reasoning for complex design
        }
      });

      // 2. Generate a visual representation using Gemini 2.5 Flash Image
      const imageGenerationPrompt = `A high-quality 3D architectural render of a ${style} garden for a ${size} space. 
      Features: ${preferences}. Professional landscaping, cinematic lighting, high-end design. ${imagePart ? 'The layout should be inspired by the environment shown in the reference image.' : ''}`;
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: imagePart ? { parts: [imagePart, { text: imageGenerationPrompt }] } : { parts: [{ text: imageGenerationPrompt }] },
        config: {
          imageConfig: { 
            aspectRatio: "16:9"
          }
        }
      });

      let genImageUrl = '';
      // Correct extraction: Iterate through candidates and parts to find the image part
      const parts = imageResponse.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            genImageUrl = `data:image/png;base64,${base64EncodeString}`;
            break;
          }
        }
      }

      setResult({
        text: textResponse.text || "Layout generated successfully.",
        image: genImageUrl
      });

    } catch (error: any) {
      console.error("Generation error:", error);
      alert("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-10 rounded-[3rem] shadow-xl shadow-emerald-100 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Leaf size={160} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="text-emerald-200" size={24} />
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">AI Architect</h2>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-6">
            Design Your <br /> Dream Sanctuary
          </h1>
          <p className="text-emerald-50/80 font-medium text-lg leading-relaxed">
            Upload your space, select a style, and let Gemini 3 Pro create a professional landscaping plan tailored to your preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
                <Wand2 size={20} className="text-emerald-500" />
                <span>Space Details</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Garden Dimensions (e.g. 20x30 ft)</label>
                  <input 
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="Describe the area size..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Preferred Style</label>
                  <div className="grid grid-cols-1 gap-2">
                    {GARDEN_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`text-left p-4 rounded-2xl border transition-all ${
                          style === s.id 
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm ring-1 ring-emerald-200' 
                            : 'bg-white border-slate-100 hover:border-emerald-100'
                        }`}
                      >
                        <p className={`font-black text-sm ${style === s.id ? 'text-emerald-700' : 'text-slate-700'}`}>{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{s.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Plant & Feature Preferences</label>
                  <textarea 
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="e.g. Lavender, sitting area, low maintenance, small fountain..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold h-32 resize-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Reference Space Photo</label>
                  <div className="flex flex-col space-y-3">
                    <div 
                      className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imageUrl ? (
                        <div className="w-full h-40 rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-white">
                          <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                            <Upload size={24} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-black text-slate-700 uppercase">Click to Select Photo</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Converts to link instantly</p>
                          </div>
                        </>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </div>

                    <div className="relative group">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500" size={16} />
                      <input 
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Image URL will appear here or paste one..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-[10px] font-mono text-slate-500 truncate"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              disabled={isGenerating}
              onClick={generateGarden}
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span className="uppercase tracking-widest">Generating with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span className="uppercase tracking-widest">Craft My Garden</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-8">
          {result ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="aspect-video w-full bg-slate-900 relative group">
                  {result.image ? (
                    <img src={result.image} className="w-full h-full object-cover" alt="Generated Vision" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-800">
                      <ImageIcon size={48} className="opacity-20" />
                      <p className="ml-4 font-black uppercase text-xs">Visual Render Unavailable</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                    <button className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all"><Maximize2 size={24} /></button>
                    {result.image && <a href={result.image} download="my-dream-garden.png" className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/40 transition-all"><Download size={24} /></a>}
                  </div>
                </div>
                
                <div className="p-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Landscaping Vision</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">AI Generated Design & Strategy</p>
                    </div>
                    <div className="flex space-x-2">
                       <button className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"><Share2 size={20} /></button>
                       <button onClick={() => setResult(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-slate-600 font-medium leading-relaxed">
                      {result.text}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Powered by Gemini 3 Pro & 2.5 Flash</span>
                    <button className="text-emerald-600 font-black text-sm flex items-center space-x-1 group">
                      <span>Refine with Chat</span>
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6">
                <ImageIcon size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-300 tracking-tight">Awaiting Your Inspiration</h3>
              <p className="mt-4 text-slate-400 max-w-sm font-medium">
                Fill out the details in the panel to the left and click "Craft My Garden" to generate your personalized landscaping plan using Gemini.
              </p>
              
              <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-50 flex flex-col items-center space-y-2 opacity-50">
                  <Leaf size={24} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">Planting Map</p>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-50 flex flex-col items-center space-y-2 opacity-50">
                  <Maximize2 size={24} className="text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">3D Visuals</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GardenDesigner;
