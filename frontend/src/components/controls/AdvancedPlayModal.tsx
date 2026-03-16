import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

interface AdvancedPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdvancedPlayModal({ isOpen, onClose }: AdvancedPlayModalProps) {
    const { bases, currentBatter, executeAdvancedPlay } = useGameStore();

    // Estado local para el formulario del destino de cada jugador
    const [batterDest, setBatterDest] = useState('1B');
    const [runner1Dest, setRunner1Dest] = useState(bases.first ? '2B' : '');
    const [runner2Dest, setRunner2Dest] = useState(bases.second ? '3B' : '');
    const [runner3Dest, setRunner3Dest] = useState(bases.third ? 'Home' : '');
    const [playDescription, setPlayDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Calcular carreras anotadas y nuevas bases
        let runsScored = 0;
        let outsRecorded = 0;
        const newBases = { first: null as string | null, second: null as string | null, third: null as string | null };

        const processRunner = (dest: string, name: string | null) => {
            if (!name) return;
            if (dest === 'Home') runsScored++;
            else if (dest === 'Out') outsRecorded++;
            else if (dest === '1B') newBases.first = name;
            else if (dest === '2B') newBases.second = name;
            else if (dest === '3B') newBases.third = name;
        };

        // Procesar todos los involucrados (El orden evalúa conflictos de base asumiendo inputs válidos del scorekeeper)
        processRunner(runner3Dest, bases.third);
        processRunner(runner2Dest, bases.second);
        processRunner(runner1Dest, bases.first);
        processRunner(batterDest, currentBatter);

        const desc = playDescription || 'Jugada Avanzada / Error';

        // 2. Enviar actualización al Store
        executeAdvancedPlay(newBases, runsScored, outsRecorded, desc);

        // 3. Reset y cerrar
        setPlayDescription('');
        setBatterDest('1B');
        setRunner1Dest(bases.first ? '2B' : '');
        setRunner2Dest(bases.second ? '3B' : '');
        setRunner3Dest(bases.third ? 'Home' : '');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
                <h2 className="text-xl font-black text-amber-400 mb-4 border-b border-slate-700 pb-2 uppercase tracking-wide">Resolutor de Jugadas</h2>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Tabla de Jugadores y Destinos */}
                    <div className="bg-slate-800 p-4 rounded-lg space-y-3 border border-slate-600">
                        {/* Bateador */}
                        <div className="flex justify-between items-center">
                            <span className="text-white text-sm font-bold w-1/3 text-emerald-400">Bat: {currentBatter}</span>
                            <select value={batterDest} onChange={e => setBatterDest(e.target.value)} className="bg-slate-700 text-white rounded p-2 text-sm w-2/3 focus:outline-none focus:ring-1 focus:ring-amber-500">
                                <option value="Out">Out</option>
                                <option value="1B">Llega a 1ra Base</option>
                                <option value="2B">Llega a 2da Base (Doble)</option>
                                <option value="3B">Llega a 3ra Base (Triple)</option>
                                <option value="Home">Home (HR/Anota)</option>
                            </select>
                        </div>

                        {/* Corredores */}
                        {bases.first && (
                            <div className="flex justify-between items-center bg-slate-850 p-2 rounded -mx-2">
                                <span className="text-slate-300 text-sm w-1/3">1B: {bases.first}</span>
                                <select value={runner1Dest} onChange={e => setRunner1Dest(e.target.value)} className="bg-slate-700 text-white rounded p-2 text-sm w-2/3">
                                    <option value="Out">Out</option>
                                    <option value="2B">Llega a 2da Base</option>
                                    <option value="3B">Llega a 3ra Base</option>
                                    <option value="Home">Anota (Home)</option>
                                </select>
                            </div>
                        )}
                        {bases.second && (
                            <div className="flex justify-between items-center bg-slate-850 p-2 rounded -mx-2">
                                <span className="text-slate-300 text-sm w-1/3">2B: {bases.second}</span>
                                <select value={runner2Dest} onChange={e => setRunner2Dest(e.target.value)} className="bg-slate-700 text-white rounded p-2 text-sm w-2/3">
                                    <option value="Out">Out</option>
                                    <option value="3B">Llega a 3ra Base</option>
                                    <option value="Home">Anota (Home)</option>
                                </select>
                            </div>
                        )}
                        {bases.third && (
                            <div className="flex justify-between items-center bg-slate-850 p-2 rounded -mx-2">
                                <span className="text-slate-300 text-sm w-1/3">3B: {bases.third}</span>
                                <select value={runner3Dest} onChange={e => setRunner3Dest(e.target.value)} className="bg-slate-700 text-white rounded p-2 text-sm w-2/3">
                                    <option value="Out">Out</option>
                                    <option value="Home">Anota (Home)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Descripción de Play by Play Pública */}
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-2 block tracking-wider uppercase">Descripción Pública (Play-by-Play)</label>
                        <textarea
                            value={playDescription}
                            onChange={e => setPlayDescription(e.target.value)}
                            placeholder="Ej. Rola a segunda, doble play del 4 al 6 al 3. O 'Lopex se embasa por error de tiro del SS'."
                            className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-sm text-white focus:outline-none focus:border-amber-500 min-h-[80px]"
                            required
                        />
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition">Cancelar</button>
                        <button type="submit" className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-amber-400 hover:bg-amber-300 transition">Guardar Jugada Completa</button>
                    </div>

                </form>
            </div>
        </div>
    );
}
