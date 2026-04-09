import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';

interface SacrificeModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'fly' | 'bunt';
}

const DEST_OPTIONS = [
    { value: 'out',  label: '🚫 Out' },
    { value: '1B',   label: '1ra Base' },
    { value: '2B',   label: '2da Base' },
    { value: '3B',   label: '3ra Base' },
    { value: 'home', label: '🏠 Anota' },
];

export default function SacrificeModal({ isOpen, onClose, type }: SacrificeModalProps) {
    const executeSacrifice = useGameStore(s => s.executeSacrifice);
    const bases            = useGameStore(s => s.bases);
    const baseIds          = useGameStore(s => s.baseIds);

    const [mounted, setMounted] = useState(false);
    const [dests, setDests] = useState<Record<string, string>>({});

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!isOpen) {
            setDests({});
            return;
        }
        const d: Record<string, string> = {};
        if (bases.third)  d['third']  = type === 'fly' ? 'home' : 'third';
        if (bases.second) d['second'] = type === 'bunt' ? '3B' : 'second';
        if (bases.first)  d['first']  = type === 'bunt' ? '2B' : 'first';
        
        // Ensure defaults match available options if someone overrides
        if (bases.third && !d['third']) d['third'] = '3B';
        if (bases.second && !d['second']) d['second'] = '2B';
        if (bases.first && !d['first']) d['first'] = '1B';
        setDests(d);
    }, [isOpen, bases, type]);

    if (!isOpen || !mounted) return null;

    const currentRunners = [
        ...(bases.third  ? [{ key: 'third',  name: bases.third,  id: baseIds.third,  baseLabel: '3ra Base', startBase: '3B' }] : []),
        ...(bases.second ? [{ key: 'second', name: bases.second, id: baseIds.second, baseLabel: '2da Base', startBase: '2B' }] : []),
        ...(bases.first  ? [{ key: 'first',  name: bases.first,  id: baseIds.first,  baseLabel: '1ra Base', startBase: '1B' }] : []),
    ];

    const getOptionsForRunner = (startBase: string) => {
        return DEST_OPTIONS.filter(o => {
            if (startBase === '3B') return ['3B', 'home', 'out'].includes(o.value);
            if (startBase === '2B') return ['2B', '3B', 'home', 'out'].includes(o.value);
            if (startBase === '1B') return ['1B', '2B', '3B', 'home', 'out'].includes(o.value);
            return true;
        });
    };

    const handleConfirm = () => {
        if (currentRunners.length === 0) {
            executeSacrifice(type); // Safe fallback (although normally executed with dests if runners exist)
        } else {
            executeSacrifice(type, dests);
        }
        onClose();
    };

    const title = type === 'fly' ? 'Fly de Sacrificio' : 'Toque de Sacrificio';

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-2 sm:p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 sm:p-6 shadow-2xl max-h-[100dvh] overflow-y-auto">
                <h2 className="text-xl font-black text-sky-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span className="text-2xl">{type === 'fly' ? '🦅' : '⚾'}</span> {title}
                </h2>
                
                {currentRunners.length === 0 ? (
                    <p className="text-sm text-slate-400 mb-6 border border-amber-500/30 bg-amber-500/10 p-3 rounded-lg text-amber-200">
                        <strong>Atención:</strong> No hay corredores en base. Esto se registrará únicamente como un out de reglamento para el bateador.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-slate-400 mb-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
                            El bateador es <strong className="text-red-400">OUT</strong>. Por favor, confirma el destino de cada corredor:
                        </p>
                        <div className="space-y-2 mb-6">
                            {currentRunners.map(r => (
                                <div key={r.key} className="flex items-center justify-between gap-3 bg-slate-800/80 rounded-lg px-3 py-2.5 border border-slate-700 hover:border-slate-600 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{r.baseLabel}</p>
                                        <p className="text-sm font-bold text-white truncate">{r.name}</p>
                                    </div>
                                    <select
                                        value={dests[r.key] ?? r.startBase}
                                        onChange={e => setDests(prev => ({ ...prev, [r.key]: e.target.value }))}
                                        className="bg-slate-700 border border-slate-500 rounded-lg text-sm text-white px-2 py-1.5 focus:outline-none focus:border-sky-500 shrink-0 font-bold"
                                    >
                                        {getOptionsForRunner(r.startBase).map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 text-sm transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-[2] py-2.5 rounded-lg font-black text-sm transition bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
