'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAction: (actionType: string) => void;
}

export default function EspecialesMenuModal({ isOpen, onClose, onAction }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4 transition-opacity">
            <div className="bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-black text-amber-500 uppercase tracking-wide">
                        Otros - Bases
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => { onAction('HBP'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🤕</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">HBP</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Golpe</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('BB_INT'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🤝</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">BB INT</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Intencional</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('K_LLEGA'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🏃</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">K + Llega</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Wild Pitch</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('FLY_SAC'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🚀</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">Fly Sacrificio</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Anota Runner</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('BUNT_SAC'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🏏</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">Toque Sacrificio</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Avanzan Base</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('BK'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">🚫</span>
                        <div className="leading-tight">
                            <span className="text-amber-500 block">Balk</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Corredores Avanzan</span>
                        </div>
                    </button>
                    <button onClick={() => { onAction('MATRIZ'); onClose(); }} className="flex items-center gap-3 p-4 rounded-xl font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500 transition-all active:scale-95 text-left">
                        <span className="text-2xl shrink-0">⚙️</span>
                        <div className="leading-tight">
                            <span className="text-emerald-400 block">Matriz Avanzada</span>
                            <span className="text-[10px] text-emerald-500 uppercase font-black tracking-wider">Jugada Compleja</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
