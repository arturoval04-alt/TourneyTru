import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import clsx from 'clsx';

interface PlayLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    playType: 'Hit' | 'Out' | 'Error' | null;
    hitType?: number; // 1, 2, 3, 4
    playName: string; // Ej. "Rola", "Sencillo", "Elevado"
}

export default function PlayLocationModal({ isOpen, onClose, playType, hitType, playName }: PlayLocationModalProps) {
    const { addOut, registerHit } = useGameStore();
    const [selectedPositions, setSelectedPositions] = useState<number[]>([]);

    if (!isOpen) return null;

    const positions = [
        { id: 1, label: 'P', top: '55%', left: '50%' },
        { id: 2, label: 'C', top: '90%', left: '50%' },
        { id: 3, label: '1B', top: '65%', left: '80%' },
        { id: 4, label: '2B', top: '45%', left: '68%' },
        { id: 5, label: '3B', top: '65%', left: '20%' },
        { id: 6, label: 'SS', top: '45%', left: '32%' },
        { id: 7, label: 'LF', top: '20%', left: '15%' },
        { id: 8, label: 'CF', top: '10%', left: '50%' },
        { id: 9, label: 'RF', top: '20%', left: '85%' },
    ];

    const handlePosClick = (id: number) => {
        if (playType === 'Hit' || playType === 'Error') {
            // Un solo click basta
            setSelectedPositions([id]);
        } else if (playType === 'Out') {
            // Puede ser secuencia (6-3)
            setSelectedPositions([...selectedPositions, id]);
        }
    };

    const handleConfirm = () => {
        if (selectedPositions.length === 0 && playType !== 'Hit') return;

        let description = '';
        const sequence = selectedPositions.join('-');

        const posNames: Record<number, string> = {
            1: 'Lanzador', 2: 'Receptor', 3: 'Primera Base',
            4: 'Segunda Base', 5: 'Tercera Base', 6: 'Campo Corto',
            7: 'Jardín Izquierdo', 8: 'Jardín Central', 9: 'Jardín Derecho'
        };

        if (playType === 'Hit') {
            const loc = selectedPositions[0] ? ` al ${positions.find(p => p.id === selectedPositions[0])?.label}` : '';
            const batter = useGameStore.getState().currentBatter;
            description = `${batter} pega ${playName}${loc}`;

            if (hitType) {
                const code = hitType === 4 ? 'HR' : `H${hitType}`;
                registerHit(hitType, `${code}|${description}`);
            }
        } else if (playType === 'Out') {
            const batter = useGameStore.getState().currentBatter;
            let code = 'OUT';
            if (playName === 'Rola') code = 'GO';
            else if (playName === 'Elevado') code = 'FO';
            else if (playName === 'Línea') code = 'LO';
            else if (playName === 'Doble Play') code = 'DP';

            if (selectedPositions.length === 1) {
                // Preposiciones ajustadas para outs directos
                const posNameOut = posNames[selectedPositions[0]];
                let preposition = 'a';
                if ([1, 2, 6, 7, 8, 9].includes(selectedPositions[0])) preposition = 'al';

                // Include [posNum] so the WBSC parser can extract the fielder number
                description = `${batter} es dominado con ${playName} ${preposition} ${posNameOut} [${selectedPositions[0]}]`;
            } else {
                description = `${batter} es dominado con ${playName}${sequence ? ` por la vía ${sequence}` : ''}`;
            }

            const isGroundout = playName === 'Rola';
            addOut(`${code}|${description}`, isGroundout);

            if (playName === 'Doble Play') {
                addOut("DP|Doble Play completado", false, false); // No emite plate appearance, solo suma el out a pizarra
            }
        } else if (playType === 'Error') {
            const batter = useGameStore.getState().currentBatter;
            const posNum = selectedPositions[0] || 0;
            const posNameError = posNames[posNum] || `E${posNum}`;
            let prep = "del";
            if ([3, 4, 5].includes(posNum)) prep = "de la";

            description = `${batter} se embasa por Error ${prep} ${posNameError}`;
            // Pasar el símbolo E# como customLogText para que el backend guarde 'E6' (no '1B')
            // registerHit avanza 1 base y usa el description como label en el boxscore
            const errorSymbol = `E${posNum}`; // e.g. 'E6'
            registerHit(1, errorSymbol + '|' + description);
        }

        setSelectedPositions([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl flex flex-col">
                <h2 className="text-xl font-black justify-center flex text-emerald-400 mb-2 uppercase tracking-wide">
                    Dirección: {playName}
                </h2>

                <p className="text-center text-slate-400 text-sm mb-4">
                    {playType === 'Out' ? 'Toca los jugadores en orden (Ej: SS luego 1B para un 6-3)' : 'Toca la zona / jugador donde fue el batazo.'}
                </p>

                <div className="relative w-full aspect-square bg-emerald-700 rounded-t-full rounded-b-xl border-2 border-emerald-900 mb-4 overflow-hidden">
                    {/* Terreno Dirt Interior */}
                    <div className="absolute top-[50%] left-[50%] w-[55%] h-[55%] -translate-x-1/2 -translate-y-[40%] rotate-45 flex items-center justify-center">
                        <div className="absolute inset-0 bg-amber-700 border-2 border-emerald-900" />
                        <div className="absolute inset-[15%] bg-emerald-700 rounded-sm" />
                    </div>

                    {/* Botones de Posición */}
                    {positions.map((pos) => {
                        const isSelected = selectedPositions.includes(pos.id);
                        const order = selectedPositions.indexOf(pos.id) + 1;

                        return (
                            <button
                                key={pos.id}
                                onClick={() => handlePosClick(pos.id)}
                                className={clsx(
                                    "absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all shadow-lg active:scale-90",
                                    isSelected
                                        ? "bg-amber-400 text-amber-900 border-amber-200 shadow-amber-500/50"
                                        : "bg-slate-100/90 text-slate-800 border-slate-300 hover:bg-white"
                                )}
                                style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
                            >
                                {isSelected && playType === 'Out' ? order : pos.label}
                            </button>
                        );
                    })}
                </div>

                <div className="bg-slate-800 p-3 rounded text-center text-amber-400 font-mono font-bold text-lg mb-4 h-12 flex items-center justify-center border border-slate-700">
                    {selectedPositions.length > 0 ? selectedPositions.join(' - ') : '...'}
                </div>

                <div className="flex justify-between gap-3">
                    <button onClick={() => { setSelectedPositions([]); onClose(); }} className="w-1/2 py-3 rounded font-bold text-slate-300 bg-slate-800 hover:bg-slate-700">Cancelar</button>
                    <button onClick={handleConfirm} className="w-1/2 py-3 rounded font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400">Confirmar</button>
                </div>
            </div>
        </div>
    );
}
