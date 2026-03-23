import React from 'react';
import { ScrollArea } from '../ui/scroll-area';

export const PlayLog = ({ plays = [] }) => {
  return (
    <div className="game-card h-full flex flex-col" data-testid="play-log">
      <div className="p-3 border-b border-slate-800">
        <h3 className="section-title">Play by Play Log</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="divide-y divide-slate-800/50">
          {plays.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No hay jugadas registradas
            </div>
          ) : (
            plays.map((play, index) => (
              <div 
                key={play.id || index} 
                className="play-log-item"
                data-testid={`play-log-item-${index}`}
              >
                <span className="text-cyan-400 font-medium">
                  Inning {play.inning}:
                </span>{' '}
                <span className="text-slate-300">
                  {play.description}
                </span>
                {play.code && (
                  <span className="text-slate-500 ml-1">({play.code})</span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlayLog;
