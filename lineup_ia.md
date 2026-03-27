import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Camera, 
  Wand2, 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';

// Posiciones estándar de Béisbol/Sóftbol
const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'DP', 'FLEX'];

// --- SIMULACIÓN DE BASE DE DATOS ---
// En tu app real, esto vendría de tu backend (ej. un useEffect que haga fetch a /teams/:id/roster)
const MOCK_TEAM_ROSTER = [
  { id: 'p_101', name: 'SERGIO GASTELUM ALMEIDA', number: '27' },
  { id: 'p_102', name: 'IVAN ROBLES GAMBOA', number: '9' },
  { id: 'p_103', name: 'ROBERTO CASTRO MORALES', number: '13' },
  { id: 'p_104', name: 'JOSE RODRIGUEZ RODRIGUEZ', number: '5' },
  { id: 'p_105', name: 'EDGAR GAMBOA ARGUELLES', number: '1' },
  { id: 'p_106', name: 'MIGUEL APODACA MENDOZA', number: '24' },
  { id: 'p_107', name: 'JORGE LOPEZ AYON', number: '10' },
  { id: 'p_108', name: 'GABRIEL ANCENO OLIVAS', number: '16' },
  { id: 'p_109', name: 'ERNESTO BOJORQUEZ ROMAN', number: '12' },
  { id: 'p_110', name: 'JESUS FLORES', number: '99' }, // Jugador de banca
];

// Algoritmo para encontrar el jugador en el roster basado en el texto de la IA
const matchPlayerToRoster = (extractedText, roster) => {
  if (!extractedText) return null;
  
  // Limpiamos el texto: mayúsculas, quitamos puntos (ej. "S. GASTELUM" -> "S GASTELUM")
  const cleanText = extractedText.toUpperCase().replace(/[^\w\s]/g, '');
  const words = cleanText.split(' ').filter(w => w.length > 2); // ignoramos iniciales como "S"

  let bestMatch = null;
  let highestScore = 0;

  for (const player of roster) {
    let score = 0;
    const playerName = player.name.toUpperCase();
    
    // Sumamos puntos por cada palabra (apellido) que coincida
    for (const word of words) {
      if (playerName.includes(word)) score++;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = player;
    }
  }

  // Si encontró al menos un apellido, lo damos por válido
  return highestScore > 0 ? bestMatch : null;
};

export default function SmartLineupConfigurator() {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' o 'manual'
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [lineup, setLineup] = useState([]);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  // Manejar la subida de imagen y prepararla para la IA
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        
        // Extraer la parte de datos base64 real y el mimeType
        const mimeType = base64String.split(';')[0].split(':')[1];
        const base64Data = base64String.split(',')[1];
        
        setImageBase64(base64Data);
        setImageMimeType(mimeType);
        
        setScanComplete(false);
        setLineup([]);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Llamada real a la IA (Gemini Vision) para analizar la foto
  const processImage = async () => {
    if (!imageBase64) return;
    
    setIsScanning(true);
    setError(null);
    
    const apiKey = ""; // La plataforma inyectará la clave automáticamente
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const prompt = "Extrae el lineup de béisbol/sóftbol de esta imagen. Devuelve una lista de jugadores. Para cada jugador, identifica su nombre ('name') y su posición ('position'). Las posiciones válidas son P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, DP, FLEX. Si no encuentras una posición clara, asigna 'P'.";

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: imageMimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              position: { type: "STRING" }
            },
            required: ["name", "position"]
          }
        }
      }
    };

    let attempt = 0;
    const delays = [1000, 2000, 4000, 8000, 16000]; // Intentos en caso de fallo de red
    let success = false;
    let resultData = null;

    while (attempt < 5 && !success) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (textResponse) {
          resultData = JSON.parse(textResponse);
          success = true;
        } else {
          throw new Error("Respuesta vacía de la API");
        }
      } catch (err) {
        attempt++;
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
        } else {
          console.error("Error al procesar la imagen:", err);
          setError("Hubo un error al analizar la imagen. Por favor, intenta de nuevo o ingresa los datos manualmente.");
          setIsScanning(false);
          return;
        }
      }
    }

    // Actualizar la interfaz con los resultados de la IA cruzados con la Base de Datos
    if (success && resultData) {
      const formattedLineup = resultData.map((player, index) => {
        // Buscamos si el nombre que leyó la IA existe en nuestro Roster oficial
        const rosterMatch = matchPlayerToRoster(player.name, MOCK_TEAM_ROSTER);
        
        return {
          id: Date.now() + index, // ID único para el renderizado de React
          rosterId: rosterMatch ? rosterMatch.id : '', // El ID real de SQL Server/Prisma
          extractedName: player.name || "Texto ilegible", // Guardamos lo que leyó la IA para referencia
          position: POSITIONS.includes(player.position?.toUpperCase()) 
            ? player.position.toUpperCase() 
            : 'P',
          isMatched: !!rosterMatch // Bandera para saber si lo encontramos automáticamente
        };
      });
      
      setLineup(formattedLineup);
      setScanComplete(true);
    }
    
    setIsScanning(false);
  };

  // Funciones para editar el lineup manualmente
  const updatePlayer = (index, field, value) => {
    const newLineup = [...lineup];
    newLineup[index][field] = value;
    // Si el usuario cambia manualmente el rosterId, quitamos la etiqueta de "Matched por IA"
    if (field === 'rosterId') newLineup[index].isMatched = false; 
    setLineup(newLineup);
  };

  const addManualPlayer = () => {
    setLineup([...lineup, { id: Date.now(), rosterId: '', extractedName: '', position: 'P', isMatched: false }]);
  };

  const removePlayer = (index) => {
    const newLineup = lineup.filter((_, i) => i !== index);
    setLineup(newLineup);
  };

  const handleSave = () => {
    // Aquí enviarías el lineup final al store de Zustand o al Backend
    console.log("Lineup guardado para el juego:", lineup);
    alert("¡Alineación guardada exitosamente en Tourney Tru!");
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="text-blue-500" />
              Configurar Alineación
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Registra el orden al bate y posiciones defensivas antes del "Playball".
            </p>
          </div>
        </div>

        {/* Tabs de Selección */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl w-full md:w-fit border border-slate-700">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ai' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Wand2 size={18} />
            Escaneo IA
          </button>
          <button
            onClick={() => {
              setActiveTab('manual');
              if (lineup.length === 0) addManualPlayer();
            }}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'manual' 
                ? 'bg-slate-700 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Users size={18} />
            Ingreso Manual
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: IA Upload o Explicación */}
          {activeTab === 'ai' && (
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Sube la hoja del Lineup</h3>
                
                {!imagePreview ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group h-64"
                  >
                    <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-blue-600 transition-colors">
                      <UploadCloud size={32} className="text-slate-400 group-hover:text-white" />
                    </div>
                    <p className="font-medium text-slate-300">Haz clic para subir imagen</p>
                    <p className="text-sm text-slate-500 mt-1">o toma una foto con la cámara</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 h-64 flex items-center justify-center">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-full max-w-full object-contain"
                      />
                      {isScanning && (
                        <div className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                          <p className="text-blue-400 font-medium animate-pulse">Analizando posiciones y nombres...</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
                        disabled={isScanning}
                      >
                        Cambiar foto
                      </button>
                      <button 
                        onClick={processImage}
                        disabled={isScanning || scanComplete}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors text-sm flex justify-center items-center gap-2"
                      >
                        {scanComplete ? (
                          <><CheckCircle2 size={18}/> Analizado</>
                        ) : (
                          <><Wand2 size={18} /> Procesar IA</>
                        )}
                      </button>
                    </div>
                    {error && (
                      <div className="text-red-400 text-sm mt-2 flex items-center gap-2 bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-4 flex items-start gap-3 bg-blue-900/20 text-blue-300 p-3 rounded-lg border border-blue-900/50">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Sube una foto clara del lineup escrito a mano o una captura de pantalla. La IA de Tourney Tru extraerá los nombres y posiciones automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Columna Derecha: El Editor de Lineup (Aparece en ambos modos) */}
          <div className={`${activeTab === 'ai' ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Jugadores y Posiciones
                </h3>
                <span className="bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium">
                  {lineup.length} Jugadores
                </span>
              </div>

              {lineup.length === 0 && activeTab === 'ai' ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p>Sube una imagen y procésala para ver los resultados aquí.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Encabezados de tabla */}
                  <div className="flex gap-3 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <div className="w-8 text-center">#</div>
                    <div className="flex-1">Jugador (Roster)</div>
                    <div className="w-24">Posición</div>
                    <div className="w-10"></div>
                  </div>

                  {/* Filas de jugadores */}
                  {lineup.map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`flex gap-3 items-start bg-slate-900/50 p-2 rounded-lg border transition-colors ${
                        player.isMatched ? 'border-emerald-900/50 bg-emerald-900/10' : 'border-slate-700/50 hover:border-slate-600'
                      } ${scanComplete && activeTab === 'ai' ? 'animate-fade-in-up' : ''}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="w-8 text-center font-bold text-slate-500 mt-2">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="relative">
                          <select
                            value={player.rosterId}
                            onChange={(e) => updatePlayer(index, 'rosterId', e.target.value)}
                            className={`w-full bg-slate-800 border ${
                              player.isMatched ? 'border-emerald-500 text-emerald-100' : 
                              player.rosterId ? 'border-slate-600 text-white' : 'border-amber-500/80 text-amber-100'
                            } text-sm rounded-md px-3 py-2 appearance-none focus:outline-none focus:border-blue-500`}
                          >
                            <option value="">-- Seleccionar jugador --</option>
                            {MOCK_TEAM_ROSTER.map(rosterPlayer => (
                              <option key={rosterPlayer.id} value={rosterPlayer.id}>
                                #{rosterPlayer.number} - {rosterPlayer.name}
                              </option>
                            ))}
                          </select>
                          {player.isMatched && (
                            <Check size={14} className="absolute right-8 top-2.5 text-emerald-500" />
                          )}
                        </div>
                        {activeTab === 'ai' && (
                          <span className="text-[10px] text-slate-500 mt-1 ml-1">
                            IA detectó: <span className="text-slate-400">"{player.extractedName}"</span>
                          </span>
                        )}
                      </div>
                      
                      <select
                        value={player.position}
                        onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                        className="w-24 bg-slate-800 border border-slate-600 text-white text-sm rounded-md px-2 py-2 focus:outline-none focus:border-blue-500 cursor-pointer h-[38px]"
                      >
                        {POSITIONS.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => removePlayer(index)}
                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {/* Botón Añadir Manual */}
                  <button
                    onClick={addManualPlayer}
                    className="w-full mt-4 py-3 border-2 border-dashed border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm"
                  >
                    <Plus size={18} />
                    Agregar jugador manualmente
                  </button>
                </div>
              )}
            </div>

            {/* Acciones Finales */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={lineup.length === 0 || lineup.some(p => !p.rosterId)}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                title={lineup.some(p => !p.rosterId) ? "Selecciona un jugador del roster para todos los campos" : ""}
              >
                <Save size={20} />
                Confirmar Alineación
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.8); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 1); 
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
}