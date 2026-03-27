import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import AdvancedPlayModal from './AdvancedPlayModal';
import PlayLocationModal from './PlayLocationModal';
import FieldersChoiceModal from './FieldersChoiceModal';
import CambiosModal from './CambiosModal';

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
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700/50">
                <h3 className="text-white text-sm sm:text-base font-heading font-bold flex items-center gap-2">
                    <span className="text-lg">📋</span> Control de Anotación
                </h3>
                <button
                    onClick={undo}
                    disabled={history.length === 0}
                    className="text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex gap-1.5 items-center bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-lg border border-amber-500/30 transition-all active:scale-95 shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25H10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5H2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                    </svg>
                    Deshacer Última
                </button>
            </div>

            {/* Control Grid — responsive 1-col mobile, 4-col desktop */}
            <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

                    {/* ─── PITCHEOS ─── */}
                    <div className="flex flex-col gap-2">
                        <h4 className="section-title">Pitcheos</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => addStrike()} className="action-btn-lift bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 sm:py-7 rounded-lg shadow-md shadow-red-900/30 text-sm min-h-[48px] min-w-[48px]">
                                STRIKE
                            </button>
                            <button onClick={addBall} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 sm:py-7 rounded-lg shadow-md shadow-emerald-900/30 active:scale-95 transition-all text-sm min-h-[48px] min-w-[48px]">
                                BOLA
                            </button>
                            <button onClick={addFoul} className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-4 rounded-lg active:scale-95 transition-all border border-slate-600 min-h-[48px] min-w-[48px]">
                                FOUL
                            </button>
                            <button onClick={() => executeWildPitchOrPassedBall("WP / PB")} className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-4 rounded-lg active:scale-95 transition-all border border-slate-600 min-h-[48px] min-w-[48px]">
                                WP/PB
                            </button>
                        </div>
                    </div>

                    {/* ─── HITS (CONTACTO BUENO) ─── */}
                    <div className="flex flex-col gap-2">
                        <h4 className="section-title">Hits (Contacto Bueno)</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => openLocationModal('Hit', 'Sencillo', 1)} className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xl sm:text-2xl py-3 sm:py-4 rounded-lg shadow-md shadow-sky-900/30 active:scale-95 transition-all min-h-[48px] min-w-[48px]">
                                H1
                            </button>
                            <button onClick={() => openLocationModal('Hit', 'Doble', 2)} className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xl sm:text-2xl py-3 sm:py-4 rounded-lg shadow-md shadow-sky-900/30 active:scale-95 transition-all min-h-[48px] min-w-[48px]">
                                H2
                            </button>
                            <button onClick={() => openLocationModal('Hit', 'Triple', 3)} className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xl sm:text-2xl py-3 sm:py-4 rounded-lg shadow-md shadow-sky-900/30 active:scale-95 transition-all min-h-[48px] min-w-[48px]">
                                H3
                            </button>
                            <button onClick={() => openLocationModal('Hit', 'Jonrón', 4)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl sm:text-2xl py-3 sm:py-4 rounded-lg shadow-md shadow-indigo-900/30 active:scale-95 transition-all min-h-[48px] min-w-[48px]">
                                H4
                            </button>

                        </div>
                    </div>

                    {/* ─── OUTS (EN JUEGO) ─── */}
                    <div className="flex flex-col gap-2">
                        <h4 className="section-title">Outs (En Juego)</h4>
                        <div className="grid grid-cols-3 gap-1.5">
                            <button onClick={() => openLocationModal('Out', 'Rola')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-6 rounded-lg active:scale-95 transition-all shadow-sm min-h-[48px] min-w-[48px]">
                                ROLA
                            </button>
                            <button onClick={() => openLocationModal('Out', 'Elevado')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-6 rounded-lg active:scale-95 transition-all shadow-sm min-h-[48px] min-w-[48px]">
                                FLY
                            </button>
                            <button onClick={() => openLocationModal('Out', 'Línea')} className="bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold py-6 rounded-lg active:scale-95 transition-all shadow-sm min-h-[48px] min-w-[48px]">
                                LINEA
                            </button>
                            <button onClick={() => {
                                const batter = useGameStore.getState().currentBatter;
                                addOut(`KS|${batter} es Ponchado Tirándole (K)`);
                            }} className="bg-red-900 hover:bg-red-800 text-white text-[10px] font-bold py-4 rounded-lg active:scale-95 transition-all border border-red-500/30 min-h-[48px] min-w-[48px]">
                                PONCHE (K)
                            </button>
                            <button onClick={() => {
                                const batter = useGameStore.getState().currentBatter;
                                addOut(`K|${batter} es Ponchado Sin Tirar (ꓘ)`);
                            }} className="bg-red-900 hover:bg-red-800 text-white text-[10px] font-bold py-6 rounded-lg active:scale-95 transition-all border border-red-500/30 min-h-[48px] min-w-[48px]">
                                K SWING
                            </button>
                            <button onClick={() => openLocationModal('Out', 'Doble Play')} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black py-6 rounded-lg active:scale-95 transition-all border border-orange-400/50 shadow-sm min-h-[48px] min-w-[48px]">
                                DOBLE PLAY
                            </button>
                        </div>
                    </div>

                    {/* ─── OTROS / ERRORES ─── */}
                    <div className="flex flex-col gap-2">
                        <h4 className="section-title">Otros / Errores</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => useGameStore.getState().executeSacrifice('fly')} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-3 rounded-lg active:scale-95 transition-all">
                                Fly/Toque Sac
                            </button>
                            <button onClick={() => useGameStore.getState().executeSacrifice('bunt')} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold py-3 rounded-lg active:scale-95 transition-all">
                                Fly/Toque Sac
                            </button>
                            <button onClick={() => openLocationModal('Error', 'Error')} className="bg-yellow-600 hover:bg-yellow-500 text-amber-50 text-[11px] font-bold py-3 rounded-lg active:scale-95 transition-all shadow-sm">
                                Error
                            </button>
                            <button onClick={() => setIsFieldersChoiceModalOpen(true)} className="bg-yellow-700 hover:bg-yellow-600 text-amber-50 text-[11px] font-bold py-3 rounded-lg active:scale-95 transition-all border border-yellow-500/30">
                                Bola Ocupada
                            </button>
                            <button onClick={() => openLocationModal('Out', 'Doble Play')} className="bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold py-3 rounded-lg active:scale-95 transition-all border border-orange-400/50">
                                Doble Play
                            </button>
                            <button onClick={() => setIsAdvancedModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-[10px] uppercase tracking-widest font-black py-3 rounded-lg active:scale-95 transition-all shadow-sm">
                                Matriz
                            </button>
                        </div>

                    </div>
                </div>
                <div className="text-center mt-4">
                    {/* Cambios */}
                    <button
                        onClick={() => setIsLineupChangeOpen(true)}
                        className="w-100 h-10 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg active:scale-95 transition-all mt-1"
                    >
                        Cambios
                    </button>
                </div>
            </div>

            <AdvancedPlayModal isOpen={isAdvancedModalOpen} onClose={() => setIsAdvancedModalOpen(false)} />
            <FieldersChoiceModal isOpen={isFieldersChoiceModalOpen} onClose={() => setIsFieldersChoiceModalOpen(false)} />
            <CambiosModal isOpen={isLineupChangeOpen} onClose={() => setIsLineupChangeOpen(false)} />

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
