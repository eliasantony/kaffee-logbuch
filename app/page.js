"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Plus, Trash2, Droplet, Search, X, ChevronDown, Scale, Camera, Link as LinkIcon, ExternalLink, Loader2, Sparkles, Zap, Settings as SettingsIcon, ShieldAlert, Save } from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_DATA = [
  {
    id: 1,
    name: "Äthiopien Yirgacheffe",
    roaster: "Good Coffee Co.",
    link: "",
    image: null,
    shots: [
      {
        id: 101,
        date: "2023-10-25",
        machine: "Rocket Appartamento",
        grind: "14 Klicks",
        method: "V60",
        tasteProfile: 50,
        notes: "Blaubeere, Jasmin, sehr klarer Körper.",
        gramsIn: "18",
        gramsOut: "300",
        time: "150",
        advice: null
      }
    ]
  }
];

const BrewingMethods = ["Alle", "Siebträger", "French Press", "Filter", "Mokka Kanne", "Cold Brew"];
const Machines = ["Rocket Appartamento", "Sage Barista Express", "Philips Baristina", "Bialetti", "Handfilter"];

export default function CoffeeAppAI() {
  // --- STATE ---
  const [coffees, setCoffees] = useState(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedCoffee, setSelectedCoffee] = useState(null);
  const [selectedShot, setSelectedShot] = useState(null);
  const [editingId, setEditingId] = useState(null); // Product ID
  const [editingShotId, setEditingShotId] = useState(null); // Shot ID
  const [addingShotToId, setAddingShotToId] = useState(null); // Product ID to add shot to
  const [filter, setFilter] = useState("Alle");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
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
    time: '',
    link: '',
    image: null
  });

  // --- EFFECTS ---
  useEffect(() => {
    const saved = localStorage.getItem('coffee_log_data_v3');
    if (saved) {
      let parsed = JSON.parse(saved);
      // Migration: Convert old flat structure to new nested structure
      if (parsed.length > 0 && !parsed[0].shots) {
        parsed = parsed.map(c => ({
          id: c.id,
          name: c.name,
          roaster: c.roaster,
          link: c.link,
          image: c.image,
          shots: [{
            id: Date.now() + Math.random(),
            date: c.date,
            machine: c.machine,
            grind: c.grind,
            method: c.method,
            tasteProfile: c.tasteProfile,
            notes: c.notes,
            gramsIn: c.gramsIn,
            gramsOut: c.gramsOut,
            time: c.time,
            advice: c.advice
          }]
        }));
      }
      setCoffees(parsed);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('coffee_log_data_v3', JSON.stringify(coffees));
    }
  }, [coffees, isLoaded]);

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

  // --- GEMINI API INTEGRATION (SERVER SIDE ROUTE) ---
  const analyzeImageWithGemini = async (base64Image) => {
    // Spam Schutz
    if (cooldown > 0) {
      setAiError(`Bitte warte noch ${cooldown}s.`);
      setIsAnalyzing(false);
      return;
    }

    try {
      // Wir senden das Bild an DEINE eigene API Route (/app/api/analyze/route.js)
      // Der API Key wird dort auf dem Server sicher genutzt.
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: base64Image.split(',')[1] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server Fehler");
      }

      const data = await response.json();
      
      // Die Antwort kommt hier direkt als JSON vom Server-Teil an
      // Wir müssen nur noch den Text aus der Gemini-Struktur holen
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error("Keine Antwort von AI erhalten");

      const jsonString = textResponse.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonString);

      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        roaster: result.roaster || prev.roaster,
        notes: result.notes || prev.notes
      }));

      setCooldown(15); // 15 Sekunden Pause erzwingen

    } catch (error) {
      console.error("Analysis Error:", error);
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
    
    if (addingShotToId) {
      // Add new shot to existing product
      const newShot = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        machine: formData.machine,
        grind: formData.grind,
        method: formData.method,
        tasteProfile: formData.tasteProfile,
        notes: formData.notes,
        gramsIn: formData.gramsIn,
        gramsOut: formData.gramsOut,
        time: formData.time,
        advice: null
      };
      
      setCoffees(coffees.map(c => {
        if (c.id === addingShotToId) {
          return { ...c, shots: [newShot, ...c.shots] };
        }
        return c;
      }));
      
      // Update selected coffee view if open
      if (selectedCoffee && selectedCoffee.id === addingShotToId) {
         const updated = coffees.find(c => c.id === addingShotToId);
         if(updated) {
             const newShots = [newShot, ...updated.shots];
             setSelectedCoffee({...updated, shots: newShots});
             setSelectedShot(newShot);
         }
      }

    } else if (editingShotId) {
       // Edit existing shot
       setCoffees(coffees.map(c => {
         if (c.id === editingId) {
           const updatedShots = c.shots.map(s => s.id === editingShotId ? {
             ...s,
             machine: formData.machine,
             grind: formData.grind,
             method: formData.method,
             tasteProfile: formData.tasteProfile,
             notes: formData.notes,
             gramsIn: formData.gramsIn,
             gramsOut: formData.gramsOut,
             time: formData.time,
             advice: null // Reset advice on edit
           } : s);
           return { ...c, ...formData, shots: updatedShots }; // Also update product info if changed (name/roaster)
         }
         return c;
       }));
       
       // Update selected view
       if (selectedCoffee && selectedCoffee.id === editingId) {
           const updatedShots = selectedCoffee.shots.map(s => s.id === editingShotId ? {
             ...s,
             machine: formData.machine,
             grind: formData.grind,
             method: formData.method,
             tasteProfile: formData.tasteProfile,
             notes: formData.notes,
             gramsIn: formData.gramsIn,
             gramsOut: formData.gramsOut,
             time: formData.time,
             advice: null
           } : s);
           
           const updatedCoffee = { ...selectedCoffee, ...formData, shots: updatedShots };
           setSelectedCoffee(updatedCoffee);
           
           const updatedShot = updatedShots.find(s => s.id === editingShotId);
           setSelectedShot(updatedShot);
       }

    } else {
      // New Product with initial shot
      const newShot = {
        id: Date.now() + 1,
        date: new Date().toISOString().split('T')[0],
        machine: formData.machine,
        grind: formData.grind,
        method: formData.method,
        tasteProfile: formData.tasteProfile,
        notes: formData.notes,
        gramsIn: formData.gramsIn,
        gramsOut: formData.gramsOut,
        time: formData.time,
        advice: null
      };

      const newCoffee = {
        id: Date.now(),
        name: formData.name,
        roaster: formData.roaster,
        link: formData.link,
        image: formData.image,
        shots: [newShot]
      };
      setCoffees([newCoffee, ...coffees]);
    }
    
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
      time: '',
      link: '',
      image: null
    });
    setEditingId(null);
    setEditingShotId(null);
    setAddingShotToId(null);
    setIsAnalyzing(false);
    setAiError(null);
  };

  const handleEditShot = (coffee, shot) => {
    setFormData({
      name: coffee.name,
      roaster: coffee.roaster,
      machine: shot.machine,
      grind: shot.grind,
      method: shot.method,
      tasteProfile: shot.tasteProfile,
      notes: shot.notes,
      gramsIn: shot.gramsIn,
      gramsOut: shot.gramsOut,
      time: shot.time || '',
      link: coffee.link,
      image: coffee.image
    });
    setEditingId(coffee.id);
    setEditingShotId(shot.id);
    // setSelectedCoffee(null); // Don't close detail view, just open form on top? 
    // Actually the form is a modal, so it will cover.
    setShowForm(true);
  };

  const handleAddShot = (coffee) => {
      // Pre-fill product info but clear shot info
      // Use the machine from the most recent shot (first in array) if available
      const lastMachine = coffee.shots && coffee.shots.length > 0 ? coffee.shots[0].machine : '';

      setFormData({
        name: coffee.name,
        roaster: coffee.roaster,
        machine: lastMachine,
        grind: '',
        method: 'Siebträger',
        tasteProfile: 50,
        notes: '',
        gramsIn: '',
        gramsOut: '',
        time: '',
        link: coffee.link,
        image: coffee.image
      });
      setAddingShotToId(coffee.id);
      setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Produkt und alle Einträge löschen?")) {
      setCoffees(coffees.filter(c => c.id !== id));
      if (selectedCoffee && selectedCoffee.id === id) setSelectedCoffee(null);
    }
  };
  
  const handleDeleteShot = (coffeeId, shotId) => {
      if (window.confirm("Diesen Eintrag löschen?")) {
          const coffee = coffees.find(c => c.id === coffeeId);
          if (coffee.shots.length === 1) {
              handleDelete(coffeeId); // Delete product if last shot
          } else {
              setCoffees(coffees.map(c => {
                  if (c.id === coffeeId) {
                      return { ...c, shots: c.shots.filter(s => s.id !== shotId) };
                  }
                  return c;
              }));
              // Update view
              if (selectedCoffee && selectedCoffee.id === coffeeId) {
                  const updatedShots = selectedCoffee.shots.filter(s => s.id !== shotId);
                  setSelectedCoffee({...selectedCoffee, shots: updatedShots});
                  if (selectedShot && selectedShot.id === shotId) {
                      setSelectedShot(updatedShots[0]);
                  }
              }
          }
      }
  };

  const getBestShot = (coffee) => {
      if (!coffee.shots || coffee.shots.length === 0) return null;
      // Best is closest to 50
      return coffee.shots.reduce((prev, curr) => {
          return (Math.abs(curr.tasteProfile - 50) < Math.abs(prev.tasteProfile - 50) ? curr : prev);
      });
  };

  const calculateRatio = (gn, gout) => {
    if (!gn || !gout) return null;
    return `1:${(gout / gn).toFixed(1)}`;
  };

  const filteredCoffees = coffees.filter(coffee => {
    // Check if any shot matches filter
    const hasMatchingShot = filter === "Alle" || coffee.shots.some(s => s.method === filter);
    return hasMatchingShot &&
           (coffee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            coffee.roaster.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // --- COMPONENTS ---
  const getTasteColor = (value) => {
    // Interpolate color to match the gradient: yellow-300 -> green-400 -> stone-700
    const c1 = [253, 224, 71];  // yellow-300
    const c2 = [74, 222, 128];  // green-400
    const c3 = [68, 64, 60];    // stone-700

    const interpolate = (start, end, factor) => {
        const r = Math.round(start[0] + (end[0] - start[0]) * factor);
        const g = Math.round(start[1] + (end[1] - start[1]) * factor);
        const b = Math.round(start[2] + (end[2] - start[2]) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    };

    if (value <= 50) {
        return interpolate(c1, c2, value / 50);
    } else {
        return interpolate(c2, c3, (value - 50) / 50);
    }
  };

  const TasteBar = ({ value }) => {
    let label = "Optimal";
    if (value < 35) { label = "Sauer"; }
    else if (value > 65) { label = "Bitter"; }
    return (
      <div className="w-full">
        <div className="flex justify-between text-[10px] text-stone-400 uppercase font-bold mb-1">
          <span>Sauer</span><span>Optimal</span><span>Bitter</span>
        </div>
        <div className="h-2 w-full bg-gradient-to-r from-yellow-300 via-green-400 to-stone-700 rounded-full overflow-hidden relative">
          <div className="h-full absolute bg-white border-2 border-stone-500 rounded-full shadow-sm transition-all duration-500"
            style={{ left: `${value}%`, width: '12px', height: '12px', top: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <div className="text-center mt-1 text-xs font-bold text-stone-600">{label} ({value})</div>
      </div>
    );
  };

  const getAdvice = async (coffee, shot) => {
    setIsGettingAdvice(true);
    try {
      // Construct payload from coffee + shot
      const payload = {
          name: coffee.name,
          roaster: coffee.roaster,
          ...shot
      };
      
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Fehler beim Abrufen des Ratschlags");

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Update state
      setCoffees(coffees.map(c => {
          if (c.id === coffee.id) {
              return {
                  ...c,
                  shots: c.shots.map(s => s.id === shot.id ? { ...s, advice: text } : s)
              };
          }
          return c;
      }));
      
      // Update view
      if (selectedShot && selectedShot.id === shot.id) {
          setSelectedShot(prev => ({ ...prev, advice: text }));
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const formatAdvice = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-indigo-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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

        {/* List */}
        <div className="space-y-5">
          {filteredCoffees.map((coffee) => {
            const bestShot = getBestShot(coffee);
            if (!bestShot) return null;

            return (
            <div key={coffee.id} 
                 onClick={() => { setSelectedCoffee(coffee); setSelectedShot(bestShot); }}
                 className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 relative hover:shadow-md transition-all cursor-pointer group">
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
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">{bestShot.method}</span>
                        <span className="text-xs text-stone-400">{bestShot.date}</span>
                      </div>
                      <h3 className="text-lg font-bold text-stone-800 leading-tight">{coffee.name}</h3>
                      <p className="text-sm text-stone-500 font-medium">{coffee.roaster}</p>
                    </div>
                    {bestShot.machine && (
                       <div className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 rounded border border-stone-200 max-w-[100px] truncate">{bestShot.machine}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                     <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <SettingsIcon size={14} className="text-amber-600" />
                          <span className="truncate">Mahlgrad: <b>{bestShot.grind}</b></span>
                        </div>
                        {(bestShot.gramsIn || bestShot.gramsOut) && (
                          <div className="flex items-center gap-2">
                            <Scale size={14} className="text-amber-600" />
                            <span>{bestShot.gramsIn || "-"}g <span className="text-stone-300">/</span> {bestShot.gramsOut || "-"}g 
                              {bestShot.time && <span className="ml-1 text-stone-400">in {bestShot.time}s</span>}
                            </span>
                          </div>
                        )}
                     </div>
                     <div className="flex items-center justify-center">
                        <TasteBar value={bestShot.tasteProfile} />
                     </div>
                  </div>
                  {bestShot.notes && <div className="text-sm text-stone-600 italic">"{bestShot.notes}"</div>}
                  {coffee.link && (
                    <a href={coffee.link} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> Zum Shop
                    </a>
                  )}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(coffee.id); }} className="absolute bottom-2 right-2 p-2 text-stone-300 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
            </div>
          );
          })}
        </div>
      </main>

      {/* MAIN FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">{editingId ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>
              <button onClick={() => {setShowForm(false); resetForm();}}><X size={24} className="text-stone-400" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* AI Upload Section - Only show for new products or if editing product details (not just adding shot) */}
                {!addingShotToId && (
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
                )}

                <div className="space-y-3">
                  {!addingShotToId ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bohne</label>
                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-white rounded-lg border border-stone-200 focus:border-amber-500 outline-none" placeholder="Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Röster</label>
                        <input name="roaster" value={formData.roaster} onChange={handleInputChange} className="w-full p-3 bg-white rounded-lg border border-stone-200 focus:border-amber-500 outline-none" placeholder="Rösterei" />
                      </div>
                    </>
                  ) : (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
                       <div className="text-xs text-amber-600 font-bold uppercase mb-1">Neuer Shot für</div>
                       <div className="font-bold text-stone-800">{formData.name}</div>
                       <div className="text-sm text-stone-500">{formData.roaster}</div>
                    </div>
                  )}
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
                  <div><label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Zeit (s)</label><input type="number" name="time" value={formData.time} onChange={handleInputChange} className="w-full p-2 bg-white rounded-lg border border-stone-200 text-sm" placeholder="25" /></div>
                </div>
                <div className="flex justify-end">
                   <div className="px-3 py-1 bg-amber-100 rounded-lg text-amber-700 text-xs font-bold border border-amber-200 inline-block">{calculateRatio(formData.gramsIn, formData.gramsOut) || "Ratio: -"}</div>
                </div>

                {!addingShotToId && (
                  <div>
                     <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Produkt Link</label>
                     <div className="relative">
                        <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/>
                        <input type="url" name="link" value={formData.link} onChange={handleInputChange} className="w-full p-2 pl-9 bg-white rounded-lg border border-stone-200 text-sm text-blue-600" placeholder="https://..." />
                     </div>
                  </div>
                )}

                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full p-3 bg-white rounded-lg border border-stone-200 outline-none text-sm resize-none" placeholder="Notizen..." />
                <button type="submit" className="w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2">{editingId ? "Änderungen Speichern" : "Eintrag Speichern"}</button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* DETAIL MODAL */}
      {selectedCoffee && selectedShot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCoffee(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            
            <div className="relative h-48 bg-stone-200 group cursor-pointer" onClick={() => selectedCoffee.image && setShowFullImage(true)}>
              {selectedCoffee.image ? (
                <>
                  <img src={selectedCoffee.image} alt={selectedCoffee.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Search className="text-white drop-shadow-md" size={32} />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <Coffee size={48} />
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); setSelectedCoffee(null); }} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10">
                <X size={20} />
              </button>
              <div className="absolute bottom-4 left-4 flex gap-2">
                 <span className="px-2 py-1 rounded text-xs bg-white/90 text-stone-800 font-bold uppercase tracking-wider shadow-sm">{selectedShot.method}</span>
                 <span className="px-2 py-1 rounded text-xs bg-white/90 text-stone-800 font-bold shadow-sm">{selectedShot.date}</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-stone-800 leading-tight mb-1">{selectedCoffee.name}</h2>
              <p className="text-lg text-stone-500 font-medium mb-6">{selectedCoffee.roaster}</p>

              {/* SHOT HISTORY SELECTOR */}
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {selectedCoffee.shots.map(shot => (
                      <button 
                        key={shot.id}
                        onClick={() => setSelectedShot(shot)}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${selectedShot.id === shot.id ? 'bg-stone-50 text-stone-900 border-stone-800 ring-1 ring-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                      >
                          {shot.date}
                          <div className="h-1.5 w-full mt-1 rounded-full" style={{ backgroundColor: getTasteColor(shot.tasteProfile) }}></div>
                      </button>
                  ))}
                  <button onClick={() => handleAddShot(selectedCoffee)} className="flex-shrink-0 px-3 py-2 rounded-lg border border-dashed border-stone-300 text-stone-400 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50 transition-all flex flex-col items-center justify-center min-w-[60px]">
                      <Plus size={16} />
                      <span className="text-[10px] font-bold">Neu</span>
                  </button>
              </div>

              <div className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-xs text-stone-400 uppercase font-bold mb-1">Maschine</div>
                    <div className="font-medium text-stone-700">{selectedShot.machine || "-"}</div>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="text-xs text-stone-400 uppercase font-bold mb-1">Mahlgrad</div>
                    <div className="font-medium text-stone-700">{selectedShot.grind || "-"}</div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                   <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-stone-400 uppercase font-bold">Geschmack</div>
                      <div className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                        {selectedShot.tasteProfile < 35 ? "Sauer / Fruchtig" : selectedShot.tasteProfile > 65 ? "Bitter / Dunkel" : "Ausgewogen"}
                      </div>
                   </div>
                   <TasteBar value={selectedShot.tasteProfile} />
                </div>

                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-100">
                   <div>
                      <div className="text-xs text-stone-400 uppercase font-bold mb-1">Rezept</div>
                      <div className="flex items-center gap-2 font-medium text-stone-700">
                        <span>{selectedShot.gramsIn}g In</span>
                        <span className="text-stone-300">/</span>
                        <span>{selectedShot.gramsOut}g Out</span>
                        {selectedShot.time && <span className="text-stone-400">in {selectedShot.time}s</span>}
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-xs text-stone-400 uppercase font-bold mb-1">Ratio</div>
                      <div className="font-bold text-amber-600 text-lg">{calculateRatio(selectedShot.gramsIn, selectedShot.gramsOut)}</div>
                   </div>
                </div>

                {/* AI ADVICE SECTION */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-indigo-400 uppercase font-bold flex items-center gap-1"><Sparkles size={12}/> AI Barista</div>
                  </div>
                  
                  {!selectedShot.advice ? (
                    <button onClick={() => getAdvice(selectedCoffee, selectedShot)} disabled={isGettingAdvice} className="w-full py-2 bg-white text-indigo-600 font-bold text-sm rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                      {isGettingAdvice ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                      {isGettingAdvice ? "Analysiere..." : "Tipps zur Optimierung"}
                    </button>
                  ) : (
                    <div className="text-sm text-indigo-800 bg-white p-3 rounded-lg border border-indigo-100">
                      {formatAdvice(selectedShot.advice)}
                    </div>
                  )}
                </div>

                {selectedShot.notes && (
                  <div>
                    <div className="text-xs text-stone-400 uppercase font-bold mb-2">Notizen</div>
                    <div className="text-stone-600 italic bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                      "{selectedShot.notes}"
                    </div>
                  </div>
                )}

                {selectedCoffee.link && (
                   <a href={selectedCoffee.link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">
                      <ExternalLink size={18} /> Zum Shop
                   </a>
                )}

                <div className="flex gap-3">
                  <button onClick={() => handleEditShot(selectedCoffee, selectedShot)} className="flex-1 py-3 text-stone-700 font-bold rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                    <SettingsIcon size={18} /> Bearbeiten
                  </button>
                  <button onClick={() => { handleDeleteShot(selectedCoffee.id, selectedShot.id); }} className="flex-1 py-3 text-red-500 font-bold rounded-xl border border-red-100 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={18} /> Löschen
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      {/* FULL IMAGE MODAL */}
      {showFullImage && selectedCoffee && selectedCoffee.image && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X size={32} />
          </button>
          <img src={selectedCoffee.image} alt={selectedCoffee.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}