import React from 'react';
import { Undo2 } from 'lucide-react';

export const ActionGrid = ({ onAction, onUndo, canUndo }) => {
  const buttonGroups = [
    {
      title: 'PITCHEOS',
      buttons: [
        { id: 'strike', label: 'STRIKE', color: 'bg-red-600 hover:bg-red-500' },
        { id: 'ball', label: 'BOLA', color: 'bg-emerald-600 hover:bg-emerald-500' },
        { id: 'foul', label: 'FOUL', color: 'bg-slate-600 hover:bg-slate-500' },
        { id: 'wp_pb', label: 'WP/PB', color: 'bg-slate-600 hover:bg-slate-500' },
      ]
    },
    {
      title: 'HITS (CONTACTO BUENO)',
      buttons: [
        { id: 'h1', label: 'H1', color: 'bg-blue-600 hover:bg-blue-500', large: true },
        { id: 'h2', label: 'H2', color: 'bg-blue-600 hover:bg-blue-500', large: true },
        { id: 'h3', label: 'H3', color: 'bg-blue-700 hover:bg-blue-600', large: true },
        { id: 'h4', label: 'H4', color: 'bg-blue-700 hover:bg-blue-600', large: true },
      ]
    },
    {
      title: 'OUTS (EN JUEGO)',
      buttons: [
        { id: 'rola', label: 'ROLA', color: 'bg-red-700 hover:bg-red-600' },
        { id: 'fly', label: 'FLY', color: 'bg-red-700 hover:bg-red-600' },
        { id: 'linea', label: 'LINEA', color: 'bg-red-700 hover:bg-red-600' },
        { id: 'ponche', label: 'PONCHE (K)', color: 'bg-red-700 hover:bg-red-600' },
        { id: 'k_swing', label: 'K SWING', color: 'bg-red-700 hover:bg-red-600' },
        { id: 'doble_play', label: 'DOBLE PLAY', color: 'bg-yellow-600 hover:bg-yellow-500 text-black' },
      ]
    },
    {
      title: 'OTROS / ERRORES',
      buttons: [
        { id: 'fly_sac', label: 'Fly/Toque Sac', color: 'bg-purple-600 hover:bg-purple-500' },
        { id: 'toque_sac', label: 'Fly/Toque Sac', color: 'bg-purple-600 hover:bg-purple-500' },
        { id: 'error', label: 'Error', color: 'bg-orange-600 hover:bg-orange-500' },
        { id: 'bola_ocupada', label: 'Bola Ocupada', color: 'bg-orange-600 hover:bg-orange-500' },
        { id: 'doble_play_2', label: 'Doble Play', color: 'bg-yellow-600 hover:bg-yellow-500 text-black' },
        { id: 'matriz', label: 'Matriz', color: 'bg-yellow-600 hover:bg-yellow-500 text-black' },
      ]
    }
  ];

  return (
    <div className="control-deck p-4" data-testid="action-grid">
      {/* Header with Undo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
            <div className="bg-slate-600 rounded-sm"></div>
            <div className="bg-slate-600 rounded-sm"></div>
            <div className="bg-slate-600 rounded-sm"></div>
            <div className="bg-slate-600 rounded-sm"></div>
          </div>
          <h3 className="font-heading font-semibold text-white text-lg">Control de Anotación</h3>
        </div>
        
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-semibold transition-all
            ${canUndo 
              ? 'bg-slate-700 hover:bg-slate-600 text-white' 
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          data-testid="undo-btn"
        >
          <Undo2 className="w-4 h-4" />
          Deshacer Última
        </button>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {buttonGroups.map((group) => (
          <div key={group.title}>
            <div className="section-title mb-2">{group.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {group.buttons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => onAction(btn.id)}
                  className={`action-btn ${btn.color} px-3 py-3 rounded-lg text-white ${btn.large ? 'text-2xl font-extrabold' : 'text-sm'}`}
                  data-testid={`action-btn-${btn.id}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionGrid;
