"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Plus, Trash2, Droplet, Search, X, ChevronDown, Scale, Camera, Link as LinkIcon, ExternalLink, Loader2, Sparkles, Zap, Settings as SettingsIcon, ShieldAlert, Save } from 'lucide-react';

// ---------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------
const INITIAL_DATA = [
  {
    id: 1,
    name: "Äthiopien Yirgacheffe",
    roaster: "Good Coffee Co.",
    machine: "Rocket Appartamento",
    grind: "14 Klicks",
    method: "V60",
    tasteProfile: 50,
    notes: "Blaubeere, Jasmin, sehr klarer Körper.",
    date: "2023-10-25",
    gramsIn: "18",
    gramsOut: "300",
    link: "",
    image: null
  }
];

const BrewingMethods = ["Alle", "Siebträger", "V60", "French Press", "Aeropress", "Mokka Kanne", "Chemex", "Cold Brew"];
const Machines = ["Rocket Appartamento", "Sage Barista Express", "La Marzocco Linea Mini", "Gaggia Classic", "DeLonghi Dedica", "Handfilter", "AeroPress Go"];

export default function CoffeeAppAI() {
  // --- STATE ---
  const [coffees, setCoffees] = useState(() => {
    const saved = localStorage.getItem('coffee_log_data_v3');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  // API Key State (Lokal gespeichert, nicht im Code!)
  const [userApiKey, setUserApiKey] = useState(() => {
    return localStorage.getItem('user_gemini_key') || '';
  });

  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState("Alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [cooldown, setCooldown] = useState(0); // Rate Limit Schutz
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    roaster: '',
    machine: '',
    grind: '',
    method: 'Siebträger',
    tasteProfile: 50,
    notes: '',
    gramsIn: '',
    gramsOut: '',
    link: '',
    image: null
  });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('coffee_log_data_v3', JSON.stringify(coffees));
  }, [coffees]);

  useEffect(() => {
    localStorage.setItem('user_gemini_key', userApiKey);
  }, [userApiKey]);

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // --- HANDLERS ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- GEMINI API INTEGRATION (CLIENT SIDE) ---
  // HINWEIS FÜR VERCEL:
  // Wenn du dies auf Vercel hostest, verschiebe diesen Fetch-Aufruf in eine 
  // API Route (z.B. /api/analyze), damit der Key auf dem Server bleibt.
  const analyzeImageWithGemini = async (base64Image) => {
    if (!userApiKey) {
      setAiError("Bitte erst API Key in den Einstellungen (Zahnrad) hinterlegen.");
      setIsAnalyzing(false);
      return;
    }

    if (cooldown > 0) {
      setAiError(`Bitte warte noch ${cooldown}s (Spam Schutz).`);
      setIsAnalyzing(false);
      return;
    }

    try {
      const base64Data = base64Image.split(',')[1]; 

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: base64Image.split(',')[1] }) // Wir senden nur die Bilddaten
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API Fehler");
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonString = textResponse.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonString);

      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        roaster: result.roaster || prev.roaster,
        notes: result.notes || prev.notes
      }));

      // Setze Cooldown (Client-Side Rate Limit)
      setCooldown(15); 

    } catch (error) {
      console.error("Gemini Error:", error);
      setAiError(`Fehler: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAiError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setFormData(prev => ({ ...prev, image: base64 }));
        setIsAnalyzing(true);
        analyzeImageWithGemini(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newCoffee = {
      id: Date.now(),
      ...formData,
      date: new Date().toISOString().split('T')[0]
    };
    setCoffees([newCoffee, ...coffees]);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      roaster: '',
      machine: '',
      grind: '',
      method: 'Siebträger',
      tasteProfile: 50,
      notes: '',
      gramsIn: '',
      gramsOut: '',
      link: '',
      image: null
    });
    setIsAnalyzing(false);
    setAiError(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Eintrag löschen?")) {
      setCoffees(coffees.filter(c => c.id !== id));
    }
  };

  const calculateRatio = (gn, gout) => {
    if (!gn || !gout) return null;
    return `1:${(gout / gn).toFixed(1)}`;
  };

  const filteredCoffees = coffees.filter(coffee => {
    return (filter === "Alle" || coffee.method === filter) &&
           (coffee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            coffee.roaster.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // --- COMPONENTS ---

  const TasteBar = ({ value }) => {
    let label = "Optimal";
    let colorClass = "bg-green-500";
    if (value < 35) { label = "Sauer"; colorClass = "bg-yellow-400"; }
    else if (value > 65) { label = "Bitter"; colorClass = "bg-stone-600"; }
    return (
      <div className="w-full">
        <div className="flex justify-between text-[10px] text-stone-400 uppercase font-bold mb-1">
          <span>Sauer</span><span>Optimal</span><span>Bitter</span>
        </div>
        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden relative">
          <div className={`h-full absolute transition-all duration-500 ${colorClass}`}
            style={{ left: `${value}%`, width: '8px', transform: 'translateX(-50%)', borderRadius: '4px' }} />
        </div>
        <div className="text-center mt-1 text-xs font-bold text-stone-600">{label} ({value})</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800 pb-24">
      {/* Header */}
      <header className="bg-stone-900 text-amber-50 sticky top-0 z-10 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Coffee size={24} color="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide leading-none">Barista Log</h1>
              <span className="text-xs text-stone-400 font-normal flex items-center gap-1">
                <ShieldAlert size={10} className="text-green-400" /> Secure Edition
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
              title="Einstellungen & API Key"
            >
              <SettingsIcon size={20} />
            </button>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold shadow-sm active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Eintrag</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input type="text" placeholder="Suche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
          </div>
          <div className="relative min-w-[150px]">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="w-full appearance-none px-4 py-2 rounded-lg border border-stone-200 bg-white cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none">
              {BrewingMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Settings Hint if no Key */}
        {!userApiKey && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
             <div className="bg-amber-100 p-2 rounded-full text-amber-600 mt-1"><Zap size={18} /></div>
             <div>
               <h3 className="font-bold text-amber-900 text-sm">AI Features aktivieren</h3>
               <p className="text-xs text-amber-800 mt-1">
                 Um die automatische Foto-Erkennung zu nutzen, klicke oben auf das Zahnrad <SettingsIcon size={10} className="inline"/> und gib deinen eigenen API Key ein.
               </p>
             </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-5">
          {filteredCoffees.map((coffee) => (
            <div key={coffee.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 relative">
              <div className="flex flex-col sm:flex-row">
                {coffee.image && (
                  <div className="h-32 sm:h-auto sm:w-32 bg-stone-200 flex-shrink-0 relative overflow-hidden">
                     <img src={coffee.image} alt="Coffee" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex-grow flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">{coffee.method}</span>
                        <span className="text-xs text-stone-400">{coffee.date}</span>
                      </div>
                      <h3 className="text-lg font-bold text-stone-800 leading-tight">{coffee.name}</h3>
                      <p className="text-sm text-stone-500 font-medium">{coffee.roaster}</p>
                    </div>
                    {coffee.machine && (
                       <div className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded border border-stone-200 max-w-[100px] truncate">{coffee.machine}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                     <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <SettingsIcon size={14} className="text-amber-600" />
                          <span className="truncate">Mahlgrad: <b>{coffee.grind}</b></span>
                        </div>
                        {(coffee.gramsIn || coffee.gramsOut) && (
                          <div className="flex items-center gap-2">
                            <Scale size={14} className="text-amber-600" />
                            <span>{coffee.gramsIn || "-"}g <span className="text-stone-300">/</span> {coffee.gramsOut || "-"}g 
                              <span className="ml-1 text-amber-600 font-bold">({calculateRatio(coffee.gramsIn, coffee.gramsOut)})</span>
                            </span>
                          </div>
                        )}
                     </div>
                     <div className="flex items-center justify-center">
                        <TasteBar value={coffee.tasteProfile} />
                     </div>
                  </div>
                  {coffee.notes && <div className="text-sm text-stone-600 italic">"{coffee.notes}"</div>}
                  {coffee.link && (
                    <a href={coffee.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> Zum Shop
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(coffee.id)} className="absolute top-2 right-2 p-2 text-stone-300 hover:text-red-500 rounded-full hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </main>

      {/* API KEY SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                <SettingsIcon size={20} className="text-stone-500"/> Einstellungen
              </h3>
              <button onClick={() => setShowSettings(false)}><X size={24} className="text-stone-400" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Google Gemini API Key</label>
                <input 
                  type="password" 
                  value={userApiKey} 
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="w-full p-3 bg-stone-50 rounded-lg border border-stone-200 focus:border-amber-500 outline-none text-sm font-mono"
                  placeholder="AIza..."
                />
                <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                  Der Key wird <strong>nur in deinem Browser</strong> (LocalStorage) gespeichert. 
                  Wenn du die App auf Vercel hostest, nutze Environment Variables.
                </p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Save size={16} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">Neuer Eintrag</h2>
              <button onClick={() => {setShowForm(false); resetForm();}}><X size={24} className="text-stone-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* AI Upload Section */}
                <div className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${formData.image ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-stone-50'}`}>
                  <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                  
                  {isAnalyzing ? (
                    <div className="py-4 flex flex-col items-center text-amber-600">
                      <Loader2 size={32} className="animate-spin mb-2" />
                      <span className="font-bold text-sm">Gemini analysiert...</span>
                    </div>
                  ) : formData.image ? (
                    <div className="relative w-full">
                      <img src={formData.image} alt="Preview" className="h-32 w-full object-cover rounded-lg mx-auto" />
                      <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-2 right-2 bg-black/70 text-white p-1.5 rounded-full text-xs flex items-center gap-1"><Camera size={14} /> Neu</button>
                    </div>
                  ) : (
                     <button type="button" onClick={() => fileInputRef.current.click()} className="w-full py-4 flex flex-col items-center gap-2 text-stone-500">
                        <div className="bg-white p-3 rounded-full shadow-sm"><Camera size={24} className="text-amber-600" /></div>
                        <span className="font-bold text-stone-700 text-sm">Foto scannen (AI)</span>
                        {cooldown > 0 && <span className="text-xs text-amber-600 font-bold">Wartezeit: {cooldown}s</span>}
                     </button>
                  )}
                  {aiError && <div className="mt-2 text-xs text-red-500 font-bold max-w-[200px] mx-auto">{aiError}</div>}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bohne</label>
                    <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white rounded-lg border border-stone-200 focus:border-amber-500 outline-none" placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Röster</label>
                    <input name="roaster" value={formData.roaster} onChange={handleInputChange} className="w-full p-3 bg-white rounded-lg border border-stone-200 focus:border-amber-500 outline-none" placeholder="Rösterei" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Maschine</label>
                    <input list="machines" name="machine" value={formData.machine} onChange={handleInputChange} className="w-full p-3 bg-white rounded-lg border border-stone-200 focus:border-amber-500 outline-none" placeholder="z.B. Rocket" />
                    <datalist id="machines">{Machines.map(m => <option key={m} value={m} />)}</datalist>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-bold text-stone-500 uppercase">Geschmacksprofil</label>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.tasteProfile < 35 ? "Sauer / Fruchtig" : formData.tasteProfile > 65 ? "Bitter / Dunkel" : "Ausgewogen"}
                    </span>
                  </div>
                  <input type="range" min="0" max="100" name="tasteProfile" value={formData.tasteProfile} 
                    onChange={(e) => setFormData(prev => ({...prev, tasteProfile: parseInt(e.target.value)}))}
                    className="w-full h-2 bg-gradient-to-r from-yellow-300 via-green-400 to-stone-700 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Mahlgrad</label>
                    <input name="grind" value={formData.grind} onChange={handleInputChange} className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm" placeholder="Stufe..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Methode</label>
                    <select name="method" value={formData.method} onChange={handleInputChange} className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm">
                      {BrewingMethods.filter(m => m !== "Alle").map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">In (g)</label><input type="number" name="gramsIn" value={formData.gramsIn} onChange={handleInputChange} className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm" placeholder="18" /></div>
                  <div><label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Out (g)</label><input type="number" name="gramsOut" value={formData.gramsOut} onChange={handleInputChange} className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm" placeholder="36" /></div>
                   <div className="h-9 self-end flex items-center justify-center bg-amber-100 rounded-lg text-amber-700 text-xs font-bold border border-amber-200">{calculateRatio(formData.gramsIn, formData.gramsOut) || "Ratio"}</div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Produkt Link</label>
                   <div className="relative">
                      <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/>
                      <input type="url" name="link" value={formData.link} onChange={handleInputChange} className="w-full p-2 pl-9 bg-white rounded-lg border border-stone-200 text-sm text-blue-600" placeholder="https://..." />
                   </div>
                </div>

                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full p-3 bg-white rounded-lg border border-stone-200 outline-none text-sm resize-none" placeholder="Notizen..." />
                <button type="submit" className="w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2">Eintrag Speichern</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}