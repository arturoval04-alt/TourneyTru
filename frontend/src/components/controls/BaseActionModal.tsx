import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

interface BaseActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseOrigin: 'first' | 'second' | 'third';
    runnerName: string;
}

export default function BaseActionModal({ isOpen, onClose, baseOrigin, runnerName }: BaseActionModalProps) {
    const { executeBaseAction, executeRunnerAdvanceByEvent, bases } = useGameStore();
    const [action, setAction] = useState('StolenBase');
    const nextBaseOccupied =
        (baseOrigin === 'first' && Boolean(bases.second)) ||
        (baseOrigin === 'second' && Boolean(bases.third));

    useEffect(() => {
        if (nextBaseOccupied && ['StolenBase', 'WildPitch', 'PassedBall'].includes(action)) {
            setAction('CaughtStealing');
        }
    }, [action, nextBaseOccupied]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let desc = '';
        let isOut = false;
        let dest: null | 'second' | 'third' | 'home' = null;

        if (nextBaseOccupied && ['StolenBase', 'WildPitch', 'PassedBall'].includes(action)) return;

        if (action === 'StolenBase') {
            desc = `SB|${runnerName} roba la base`;
            dest = baseOrigin === 'first' ? 'second' : (baseOrigin === 'second' ? 'third' : 'home');
            executeBaseAction(baseOrigin, dest, isOut, desc);
        } else if (action === 'WildPitch') {
            executeRunnerAdvanceByEvent(baseOrigin, 'wildPitch');
        } else if (action === 'PassedBall') {
            executeRunnerAdvanceByEvent(baseOrigin, 'passedBall');
        } else if (action === 'CaughtStealing') {
            desc = `CS|${runnerName} es out intentando robar`;
            isOut = true;
            executeBaseAction(baseOrigin, dest, isOut, desc);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl">
                <h2 className="text-xl font-black text-sky-400 mb-2 uppercase tracking-wide">Acción de Corredor</h2>
                <p className="text-xs text-slate-400 mb-4 tracking-wide font-bold">{runnerName} (Corredor en {baseOrigin === 'first' ? '1ra' : baseOrigin === 'second' ? '2da' : '3ra'})</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="flex items-center space-x-3 bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-700">
                            <input type="radio" value="StolenBase" checked={action === 'StolenBase'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" disabled={nextBaseOccupied} />
                            <span className="text-white font-bold text-sm">Robo de Base Exitoso</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-700">
                            <input type="radio" value="WildPitch" checked={action === 'WildPitch'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" disabled={nextBaseOccupied} />
                            <span className="text-white font-bold text-sm">Avanza por Wild Pitch</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-700">
                            <input type="radio" value="PassedBall" checked={action === 'PassedBall'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" disabled={nextBaseOccupied} />
                            <span className="text-white font-bold text-sm">Avanza por Passed Ball</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-red-900/40 p-3 rounded border border-red-900/50 cursor-pointer hover:bg-red-900/60">
                            <input type="radio" value="CaughtStealing" checked={action === 'CaughtStealing'} onChange={e => setAction(e.target.value)} className="form-radio text-red-500" />
                            <span className="text-white font-bold text-sm">Out Intentando Robar (CS/PO)</span>
                        </label>
                    </div>

                    {nextBaseOccupied && (
                        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            La base siguiente está ocupada. Primero mueve al corredor de adelante si esa jugada también avanzó.
                        </p>
                    )}

                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition">Cancelar</button>
                        <button type="submit" className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-sky-400 hover:bg-sky-300 transition">Confirmar Acción</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
