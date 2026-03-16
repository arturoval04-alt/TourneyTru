import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

interface BaseActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseOrigin: 'first' | 'second' | 'third';
    runnerName: string;
}

export default function BaseActionModal({ isOpen, onClose, baseOrigin, runnerName }: BaseActionModalProps) {
    const { executeBaseAction, executeWildPitchOrPassedBall } = useGameStore();
    const [action, setAction] = useState('StolenBase');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let desc = '';
        let isOut = false;
        let dest: null | 'second' | 'third' | 'home' = null;

        if (action === 'StolenBase') {
            desc = `${runnerName} roba la base.`;
            dest = baseOrigin === 'first' ? 'second' : (baseOrigin === 'second' ? 'third' : 'home');
            executeBaseAction(baseOrigin, dest, isOut, desc);
        } else if (action === 'WildPitch') {
            executeWildPitchOrPassedBall("Wild Pitch");
        } else if (action === 'PassedBall') {
            executeWildPitchOrPassedBall("Passed Ball");
        } else if (action === 'CaughtStealing') {
            desc = `${runnerName} es puesto Out intentando robar. Pickoff/CS.`;
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
                            <input type="radio" value="StolenBase" checked={action === 'StolenBase'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" />
                            <span className="text-white font-bold text-sm">Robo de Base Exitoso</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-700">
                            <input type="radio" value="WildPitch" checked={action === 'WildPitch'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" />
                            <span className="text-white font-bold text-sm">Avanza por Wild Pitch</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-700">
                            <input type="radio" value="PassedBall" checked={action === 'PassedBall'} onChange={e => setAction(e.target.value)} className="form-radio text-sky-500" />
                            <span className="text-white font-bold text-sm">Avanza por Passed Ball</span>
                        </label>
                        <label className="flex items-center space-x-3 bg-red-900/40 p-3 rounded border border-red-900/50 cursor-pointer hover:bg-red-900/60">
                            <input type="radio" value="CaughtStealing" checked={action === 'CaughtStealing'} onChange={e => setAction(e.target.value)} className="form-radio text-red-500" />
                            <span className="text-white font-bold text-sm">Out Intentando Robar (CS/PO)</span>
                        </label>
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition">Cancelar</button>
                        <button type="submit" className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-sky-400 hover:bg-sky-300 transition">Confirmar Acción</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
