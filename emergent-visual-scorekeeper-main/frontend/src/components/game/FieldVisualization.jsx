import React from 'react';

export const FieldVisualization = ({ bases, fielders, onAdvanceRunner }) => {
  // Default fielder positions matching the reference image exactly
  const defaultFielders = {
    CF: { name: 'J. Valenzuela', x: 200, y: 45 },
    LF: { name: 'O. Mayorquin E.', x: 55, y: 95 },
    RF: { name: 'D. Mayorquin', x: 345, y: 95 },
    SS: { name: 'S. Vanansio', x: 125, y: 185 },
    '2B': { name: 'Hernetsin', x: 275, y: 185 },
    '3B': { name: 'E. Avcesada R.', x: 70, y: 275 },
    P: { name: 'Luis Mexía', x: 200, y: 275 },
    '1B': { name: '', x: 330, y: 275 },
    H: { name: 'J. Valenzuela', x: 200, y: 400 },
  };

  const positions = fielders && Object.keys(fielders).length > 0 ? fielders : defaultFielders;

  // Base positions for diamond
  const basePositions = {
    first: { x: 290, y: 290 },
    second: { x: 200, y: 200 },
    third: { x: 110, y: 290 },
    home: { x: 200, y: 380 }
  };

  return (
    <div className="field-container relative" data-testid="field-visualization">
      <svg viewBox="0 0 400 440" className="w-full h-full">
        {/* Outfield grass */}
        <path
          d="M 200 420 L 0 150 Q 200 -50 400 150 Z"
          fill="#2d5a3d"
          className="field-grass"
        />
        
        {/* Infield dirt */}
        <path
          d="M 200 380 L 110 290 L 200 200 L 290 290 Z"
          fill="#c4a44a"
          className="field-dirt"
        />
        
        {/* Pitcher's mound */}
        <circle cx="200" cy="280" r="22" fill="#c4a44a" />
        <circle cx="200" cy="280" r="8" fill="#ffffff" opacity="0.4" />
        
        {/* Base paths */}
        <line x1="200" y1="380" x2="290" y2="290" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        <line x1="290" y1="290" x2="200" y2="200" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        <line x1="200" y1="200" x2="110" y2="290" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        <line x1="110" y1="290" x2="200" y2="380" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
        
        {/* Foul lines */}
        <line x1="200" y1="380" x2="0" y2="150" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
        <line x1="200" y1="380" x2="400" y2="150" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
        
        {/* Home plate */}
        <polygon 
          points="200,388 188,378 188,368 212,368 212,378" 
          fill="#ffffff" 
          data-testid="field-base-home"
        />
        
        {/* First base */}
        <rect 
          x={basePositions.first.x - 12} 
          y={basePositions.first.y - 12} 
          width="24" 
          height="24" 
          className={`${bases?.first ? 'fill-blue-500' : 'fill-white'}`}
          style={{ 
            stroke: '#1E293B', 
            strokeWidth: 2,
            filter: bases?.first ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
          }}
          transform={`rotate(45 ${basePositions.first.x} ${basePositions.first.y})`}
          data-testid="field-base-1"
        />
        
        {/* Second base */}
        <rect 
          x={basePositions.second.x - 12} 
          y={basePositions.second.y - 12} 
          width="24" 
          height="24" 
          className={`${bases?.second ? 'fill-blue-500' : 'fill-white'}`}
          style={{ 
            stroke: '#1E293B', 
            strokeWidth: 2,
            filter: bases?.second ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
          }}
          transform={`rotate(45 ${basePositions.second.x} ${basePositions.second.y})`}
          data-testid="field-base-2"
        />
        
        {/* Third base */}
        <rect 
          x={basePositions.third.x - 12} 
          y={basePositions.third.y - 12} 
          width="24" 
          height="24" 
          className={`${bases?.third ? 'fill-blue-500' : 'fill-white'}`}
          style={{ 
            stroke: '#1E293B', 
            strokeWidth: 2,
            filter: bases?.third ? 'drop-shadow(0 0 8px #3B82F6)' : 'none'
          }}
          transform={`rotate(45 ${basePositions.third.x} ${basePositions.third.y})`}
          data-testid="field-base-3"
        />
      </svg>

      {/* Player position labels */}
      {Object.entries(positions).map(([pos, data]) => (
        <div
          key={pos}
          className="absolute text-center player-marker"
          style={{
            left: `${(data.x / 400) * 100}%`,
            top: `${(data.y / 440) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
          data-testid={`fielder-${pos}`}
        >
          <div className="bg-slate-900/95 border border-slate-600 px-2 py-1 rounded text-[10px] font-medium text-slate-100 whitespace-nowrap shadow-lg backdrop-blur-sm">
            <span className="text-cyan-400 font-bold mr-1">{pos}</span>
            <span className="text-slate-300">{data.name}</span>
          </div>
        </div>
      ))}

      {/* Avanza badges for runners */}
      {bases?.first && (
        <button
          className="avanza-badge absolute"
          style={{ left: '75%', top: '62%' }}
          onClick={() => onAdvanceRunner?.('first')}
          data-testid="avanza-btn-1"
        >
          AVANZA
        </button>
      )}
      {bases?.second && (
        <button
          className="avanza-badge absolute"
          style={{ left: '50%', top: '40%', transform: 'translateX(-50%)' }}
          onClick={() => onAdvanceRunner?.('second')}
          data-testid="avanza-btn-2"
        >
          AVANZA
        </button>
      )}
      {bases?.third && (
        <button
          className="avanza-badge absolute"
          style={{ left: '20%', top: '62%' }}
          onClick={() => onAdvanceRunner?.('third')}
          data-testid="avanza-btn-3"
        >
          AVANZA
        </button>
      )}
    </div>
  );
};

export default FieldVisualization;
