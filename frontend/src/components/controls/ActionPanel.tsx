import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import AdvancedPlayModal from './AdvancedPlayModal';
import PlayLocationModal from './PlayLocationModal';
import FieldersChoiceModal from './FieldersChoiceModal';
import LineupChangeModal from './LineupChangeModal';

export default function ActionPanel() {
    const { addBall, addStrike, addFoul, addOut, executeWildPitchOrPassedBall, history, undo } = useGameStore();

    // Estado del mini-mapa modal
    const [isLocationModalOpen, setLocationModalOpen] = useState(false);
    const [playType, setPlayType] = useState<'Hit' | 'Out' | 'Error' | null>(null);
    const [hitType, setHitType] = useState<number | undefined>(undefined);
    const [playName, setPlayName] = useState('');

    // Estado de modales especiales
    const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
    const [isFieldersChoiceModalOpen, setIsFieldersChoiceModalOpen] = useState(false);
    const [isLineupChangeOpen, setIsLineupChangeOpen] = useState(false);

    const openLocationModal = (type: 'Hit' | 'Out' | 'Error', name: string, hitNum?: number) => {
        setPlayType(type);
        setPlayName(name);
        setHitType(hitNum);
        setLocationModalOpen(true);
    };

    return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1 bg-slate-800/50 rounded px-2 py-1.5 border border-slate-700">
                <h3 className="text-white text-base font-bold">Control de Anotación</h3>
                <button
                    onClick={undo}
                    disabled={history.length === 0}
                    className="text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:hover:text-amber-400 text-xs font-bold flex gap-1 items-center bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-md border border-amber-500/30 transition-all active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                    </svg>
                    Deshacer Acción
                </button>
            </div>

            {/* PITCHEOS */}
            <div>
                <h4 className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Pitcheos</h4>
                <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={addBall} className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-md shadow-md active:scale-95">Bola</button>
                    <button onClick={addStrike} className="col-span-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-md shadow-md active:scale-95">Strike</button>
                    <button onClick={addFoul} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold py-1.5 rounded-md active:scale-95">Foul</button>
                    <button onClick={() => executeWildPitchOrPassedBall("WP / PB")} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold py-1.5 rounded-md active:scale-95">WP / PB</button>
                </div>
            </div>

            {/* HITS */}
            <div>
                <h4 className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Hits (Contacto Bueno)</h4>
                <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => openLocationModal('Hit', 'Sencillo', 1)} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold py-2 rounded-md active:scale-95">1B</button>
                    <button onClick={() => openLocationModal('Hit', 'Doble', 2)} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold py-2 rounded-md active:scale-95">2B</button>
                    <button onClick={() => openLocationModal('Hit', 'Triple', 3)} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold py-2 rounded-md active:scale-95">3B</button>
                    <button onClick={() => openLocationModal('Hit', 'Jonrón', 4)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 rounded-md active:scale-95">HR</button>
                </div>
            </div>

            {/* OUTS */}
            <div>
                <h4 className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">En Juego (Outs)</h4>
                <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => openLocationModal('Out', 'Rola')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95">Rola</button>
                    <button onClick={() => openLocationModal('Out', 'Elevado')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95">Fly / Elevado</button>
                    <button onClick={() => openLocationModal('Out', 'Línea')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95">Línea</button>

                    <button onClick={() => {
                        const batter = useGameStore.getState().currentBatter;
                        addOut(`KS|${batter} es Ponchado Tirándole (K)`);
                    }} className="bg-red-900 hover:bg-red-800 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95 border border-red-500/30">Ponche (K)</button>

                    <button onClick={() => {
                        const batter = useGameStore.getState().currentBatter;
                        addOut(`KL|${batter} es Ponchado Sin Tirar (ꓘ)`);
                    }} className="bg-red-900 hover:bg-red-800 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95 border border-red-500/30">Ponche (ꓘ)</button>
                    <button onClick={() => openLocationModal('Out', 'Doble Play')} className="bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95 border border-orange-400/50">Doble Play</button>
                </div>
            </div>

            {/* OTROS / BASES / ERRORES */}
            <div>
                <h4 className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Otros / Errores</h4>
                <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => openLocationModal('Error', 'Error')} className="col-span-2 bg-yellow-600 hover:bg-yellow-500 text-amber-50 text-[11px] font-bold py-1.5 rounded-md active:scale-95">Error</button>
                    <button onClick={() => setIsFieldersChoiceModalOpen(true)} className="col-span-2 bg-yellow-700 hover:bg-yellow-600 text-amber-50 text-[11px] font-bold py-1.5 rounded-md active:scale-95 border border-yellow-500/30">Bola Ocupada</button>
                    <button onClick={() => useGameStore.getState().executeSacrifice('fly')} className="col-span-1 bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded-md active:scale-95">Fly Sac.</button>
                    <button onClick={() => useGameStore.getState().executeSacrifice('bunt')} className="col-span-1 bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded-md active:scale-95">Toque Sac.</button>
                    <button onClick={() => setIsAdvancedModalOpen(true)} className="col-span-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] uppercase tracking-widest font-black py-1.5 rounded-md active:scale-95">
                        Matriz ⚙️
                    </button>
                </div>
            </div>

            {/* LINEUP */}
            <div>
                <h4 className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Lineup</h4>
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        onClick={() => setIsLineupChangeOpen(true)}
                        className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1.5 rounded-md active:scale-95"
                    >
                        Cambio de Lineup
                    </button>
                </div>
            </div>

            <AdvancedPlayModal isOpen={isAdvancedModalOpen} onClose={() => setIsAdvancedModalOpen(false)} />
            <FieldersChoiceModal isOpen={isFieldersChoiceModalOpen} onClose={() => setIsFieldersChoiceModalOpen(false)} />
            <LineupChangeModal isOpen={isLineupChangeOpen} onClose={() => setIsLineupChangeOpen(false)} />

            {isLocationModalOpen && (
                <PlayLocationModal
                    isOpen={isLocationModalOpen}
                    onClose={() => setLocationModalOpen(false)}
                    playType={playType}
                    hitType={hitType}
                    playName={playName}
                />
            )}
        </div>
    );
}
