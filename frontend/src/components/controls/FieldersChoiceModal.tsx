import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';

interface FieldersChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FieldersChoiceModal({ isOpen, onClose }: FieldersChoiceModalProps) {
    const { bases, executeFieldersChoice } = useGameStore();
    const [selectedOut, setSelectedOut] = useState<'first' | 'second' | 'third' | null>(null);

    const [mounted, setMounted] = useState(false);

    // Resetear el estado al abrir
    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            // Removing the setSelectedOut(null) call here, as initializing state should be handled differently
            // or we clear it after a confirmed submission.
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const baserunners = [
        { id: 'first', name: bases.first, label: '1ra Base' },
        { id: 'second', name: bases.second, label: '2da Base' },
        { id: 'third', name: bases.third, label: '3ra Base' },
    ].filter(r => r.name !== null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Si no se eligió out (y había corredores disponibles), bloquear. 
        if (!selectedOut && baserunners.length > 0) return;

        if (selectedOut) {
            executeFieldersChoice(selectedOut);
        }

        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl relative z-[10000]">
                <h2 className="text-xl font-black text-amber-500 mb-2 uppercase tracking-wide">Bola Ocupada <span className="text-sm font-bold text-slate-400 capitalize">(Fielder&apos;s Choice)</span></h2>

                {baserunners.length > 0 ? (
                    <>
                        <p className="text-sm text-slate-300 mb-4">El bateador se embasa legalmente. ¿Quién fue el corredor puesto Out en la jugada?</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                {baserunners.map((runner) => (
                                    <label key={runner.id} className={`flex items-center space-x-3 p-3 rounded border cursor-pointer transition-colors ${selectedOut === runner.id ? 'bg-amber-900/40 border-amber-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                                        <input
                                            type="radio"
                                            name="outRunner"
                                            value={runner.id}
                                            checked={selectedOut === runner.id}
                                            onChange={() => setSelectedOut(runner.id as 'first' | 'second' | 'third')}
                                            className="form-radio text-amber-500 bg-slate-900 border-slate-600"
                                        />
                                        <span className="text-white font-bold text-sm">
                                            Out en {runner.label}: <span className="text-slate-300 font-mono text-xs">{runner.name}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 justify-end pt-2 border-t border-slate-700 mt-4">
                                <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition">Cancelar</button>
                                <button type="submit" disabled={!selectedOut} className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-amber-500 hover:bg-amber-400 focus:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition">Registrar Jugada</button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-slate-300 mb-4">⚠️ No hay corredores en base para hacer un Fielder&apos;s Choice.</p>
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded font-bold text-sm text-slate-900 bg-amber-500 hover:bg-amber-400 transition w-full">Entendido</button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
