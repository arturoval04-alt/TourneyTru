import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';
import clsx from 'clsx';

interface PlayLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    playType: 'Hit' | 'Out' | 'Error' | null;
    hitType?: number;
    playName: string;
}

const DEST_OPTIONS = [
    { value: 'out',  label: '🚫 Out' },
    { value: '1B',   label: '1ra Base' },
    { value: '2B',   label: '2da Base' },
    { value: '3B',   label: '3ra Base' },
    { value: 'home', label: '🏠 Anota' },
];

export default function PlayLocationModal({ isOpen, onClose, playType, hitType, playName }: PlayLocationModalProps) {
    const addOut             = useGameStore(s => s.addOut);
    const registerHit        = useGameStore(s => s.registerHit);
    const executeAdvancedPlay = useGameStore(s => s.executeAdvancedPlay);
    const bases              = useGameStore(s => s.bases);
    const baseIds            = useGameStore(s => s.baseIds);
    const currentBatter      = useGameStore(s => s.currentBatter);
    const currentBatterId    = useGameStore(s => s.currentBatterId);

    const [selectedPositions, setSelectedPositions] = useState<number[]>([]);
    const [mounted, setMounted] = useState(false);

    // DP Step 2 state
    const [dpStep2, setDpStep2]   = useState(false);
    const [dpCode,  setDpCode]    = useState('');
    const [dpDests, setDpDests]   = useState<Record<string, string>>({});

    useEffect(() => { setMounted(true); }, []);

    // Reset DP state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setDpStep2(false);
            setDpCode('');
            setDpDests({});
            setSelectedPositions([]);
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    // Players involved in the DP
    const dpPlayers = [
        { key: 'batter', name: currentBatter, id: currentBatterId, baseLabel: 'Al bate' },
        ...(bases.first  ? [{ key: 'first',  name: bases.first,  id: baseIds.first,  baseLabel: '1ra Base' }] : []),
        ...(bases.second ? [{ key: 'second', name: bases.second, id: baseIds.second, baseLabel: '2da Base' }] : []),
        ...(bases.third  ? [{ key: 'third',  name: bases.third,  id: baseIds.third,  baseLabel: '3ra Base' }] : []),
    ];

    const buildDpDefaults = (): Record<string, string> => {
        const d: Record<string, string> = {};
        dpPlayers.forEach((p, i) => {
            if (i === 0) { d[p.key] = 'out'; } // batter → out (most common: out at 1st)
            else if (i === 1) { d[p.key] = 'out'; } // first runner → out (e.g. runner at 1B out at 2nd)
            else {
                const advance: Record<string, string> = { second: '3B', third: 'home' };
                d[p.key] = advance[p.key] ?? '3B';
            }
        });
        return d;
    };

    const positions = [
        { id: 1, label: 'P',  top: '55%', left: '50%' },
        { id: 2, label: 'C',  top: '90%', left: '50%' },
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
            setSelectedPositions([id]);
        } else if (playType === 'Out') {
            setSelectedPositions([...selectedPositions, id]);
        }
    };

    // Count how many "out" destinations are selected in DP
    const dpOutCount = Object.values(dpDests).filter(v => v === 'out').length;

    const handleDpConfirm = () => {
        if (dpOutCount !== 2) return;
        const newBases   = { first: null as string | null, second: null as string | null, third: null as string | null };
        const newBaseIds = { first: null as string | null, second: null as string | null, third: null as string | null };
        let runs = 0;

        for (const p of dpPlayers) {
            const dest = dpDests[p.key] ?? 'out';
            if      (dest === 'home') runs++;
            else if (dest === '1B')   { newBases.first  = p.name; newBaseIds.first  = p.id; }
            else if (dest === '2B')   { newBases.second = p.name; newBaseIds.second = p.id; }
            else if (dest === '3B')   { newBases.third  = p.name; newBaseIds.third  = p.id; }
        }

        const outsList: string[] = [];
        const runnerOutIds: string[] = [];
        for (const p of dpPlayers) {
            if (dpDests[p.key] === 'out') {
                outsList.push(p.name);
                if (p.key !== 'batter' && p.id) runnerOutIds.push(p.id);
            }
        }

        const desc = `${dpCode}|Doble Play ${dpCode}: Out ${outsList.join(' y ')}`;
        executeAdvancedPlay(newBases, newBaseIds, runs, 2, desc, runnerOutIds);
        setSelectedPositions([]);
        setDpStep2(false);
        onClose();
    };

    const handleConfirm = () => {
        if (selectedPositions.length === 0 && playType !== 'Hit') return;

        let description = '';
        const sequence = selectedPositions.join('-');

        const posNames: Record<number, string> = {
            1: 'Lanzador', 2: 'Receptor', 3: 'Primera Base',
            4: 'Segunda Base', 5: 'Tercera Base', 6: 'Campo Corto',
            7: 'Jardín Izquierdo', 8: 'Jardín Central', 9: 'Jardín Derecho',
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
            if (playName === 'Rola') {
                code = selectedPositions.length > 0 ? selectedPositions.join('-') : 'GO';
            } else if (playName === 'Elevado') {
                code = selectedPositions.length === 1 ? `F${selectedPositions[0]}` : 'FO';
            } else if (playName === 'Línea') {
                code = selectedPositions.length === 1 ? `L${selectedPositions[0]}` : 'LO';
            } else if (playName === 'Doble Play') {
                // Step 1 done — build code and go to step 2
                const dpCodeBuilt = selectedPositions.length > 0 ? selectedPositions.join('-') : 'DP';
                setDpCode(dpCodeBuilt);
                setDpDests(buildDpDefaults());
                setDpStep2(true);
                return; // don't close yet
            }

            if (selectedPositions.length === 1) {
                const posNameOut = posNames[selectedPositions[0]];
                let preposition = 'a';
                if ([1, 2, 6, 7, 8, 9].includes(selectedPositions[0])) preposition = 'al';
                description = `${batter} es dominado con ${playName} ${preposition} ${posNameOut} [${selectedPositions[0]}]`;
            } else {
                description = `${batter} es dominado con ${playName}${sequence ? ` por la vía ${sequence}` : ''}`;
            }

            const isGroundout = playName === 'Rola';
            addOut(`${code}|${description}`, isGroundout);
        } else if (playType === 'Error') {
            const batter = useGameStore.getState().currentBatter;
            const posNum = selectedPositions[0] || 0;
            const posNameError = posNames[posNum] || `E${posNum}`;
            let prep = 'del';
            if ([3, 4, 5].includes(posNum)) prep = 'de la';

            description = `${batter} se embasa por Error ${prep} ${posNameError}`;
            const errorSymbol = `E${posNum}`;
            registerHit(1, errorSymbol + '|' + description);
        }

        setSelectedPositions([]);
        onClose();
    };

    // ── DP Step 2: Who got out? ──────────────────────────────────────
    if (dpStep2) {
        return createPortal(
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Paso 2/2</span>
                        <h2 className="text-xl font-black text-red-400 uppercase tracking-wide">Doble Play</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">
                        Secuencia: <span className="font-mono font-bold text-amber-400">{dpCode}</span>
                    </p>
                    <p className="text-sm text-slate-400 mb-4">
                        Selecciona el destino de cada jugador. Deben quedar exactamente <span className="font-bold text-red-400">2 Outs</span>.
                    </p>

                    <div className="space-y-2 mb-2">
                        {dpPlayers.map(p => (
                            <div key={p.key} className="flex items-center justify-between gap-3 bg-slate-800 rounded-lg px-3 py-2.5 border border-slate-700">
                                <div className="min-w-0">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{p.baseLabel}</p>
                                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                </div>
                                <select
                                    value={dpDests[p.key] ?? 'out'}
                                    onChange={e => setDpDests(prev => ({ ...prev, [p.key]: e.target.value }))}
                                    className="bg-slate-700 border border-slate-600 rounded-lg text-sm text-white px-2 py-1.5 focus:outline-none focus:border-red-500 shrink-0"
                                >
                                    {DEST_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Out counter */}
                    <div className={clsx(
                        'text-center text-sm font-bold mb-4 py-1.5 rounded',
                        dpOutCount === 2 ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                    )}>
                        {dpOutCount} / 2 outs seleccionados
                        {dpOutCount !== 2 && ' — necesitas exactamente 2'}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setDpStep2(false)}
                            className="flex-1 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 text-sm transition"
                        >
                            ← Volver
                        </button>
                        <button
                            onClick={handleDpConfirm}
                            disabled={dpOutCount !== 2}
                            className="flex-[2] py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white"
                        >
                            Registrar Doble Play
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ── Step 1: Location picker ──────────────────────────────────────
    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl flex flex-col">
                <h2 className="text-xl font-black justify-center flex text-emerald-400 mb-2 uppercase tracking-wide">
                    Dirección: {playName}
                </h2>

                <p className="text-center text-slate-400 text-sm mb-4">
                    {playType === 'Out'
                        ? playName === 'Doble Play'
                            ? 'Selecciona los fielders en orden (ej: SS, 2B, 1B → 6-4-3). Luego indicarás quién fue out.'
                            : 'Toca los jugadores en orden (Ej: SS luego 1B para un 6-3)'
                        : 'Toca la zona / jugador donde fue el batazo.'}
                </p>

                <div className="relative w-full aspect-square bg-emerald-700 rounded-t-full rounded-b-xl border-2 border-emerald-900 mb-4 overflow-hidden">
                    <div className="absolute top-[50%] left-[50%] w-[55%] h-[55%] -translate-x-1/2 -translate-y-[40%] rotate-45 flex items-center justify-center">
                        <div className="absolute inset-0 bg-amber-700 border-2 border-emerald-900" />
                        <div className="absolute inset-[15%] bg-emerald-700 rounded-sm" />
                    </div>
                    {positions.map((pos) => {
                        const isSelected = selectedPositions.includes(pos.id);
                        const order = selectedPositions.indexOf(pos.id) + 1;
                        return (
                            <button
                                key={pos.id}
                                onClick={() => handlePosClick(pos.id)}
                                className={clsx(
                                    'absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all shadow-lg active:scale-90',
                                    isSelected
                                        ? 'bg-amber-400 text-amber-900 border-amber-200 shadow-amber-500/50'
                                        : 'bg-slate-100/90 text-slate-800 border-slate-300 hover:bg-white'
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
                    <button
                        onClick={handleConfirm}
                        disabled={playName === 'Doble Play' && selectedPositions.length === 0}
                        className="w-1/2 py-3 rounded font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {playName === 'Doble Play' ? 'Siguiente →' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
