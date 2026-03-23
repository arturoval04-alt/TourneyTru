import React from 'react';

export const PlayerCard = ({ player, type, stats, todayPerformance }) => {
  const isBatter = type === 'batter';

  return (
    <div className="game-card p-4" data-testid={`player-card-${type}`}>
      <div className="flex items-start gap-3">
        {/* Player Avatar */}
        <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/80" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">
            {isBatter ? 'Batting' : 'Pitching'}
          </div>
          <div className="font-heading font-bold text-lg text-white truncate" data-testid={`${type}-name`}>
            {player?.name || 'Sin Jugador'}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
            {isBatter ? (
              <>
                <span className="text-slate-400">
                  AVG: <span className="stat-value text-white" data-testid="batter-avg">{stats?.avg || '.000'}</span>
                </span>
                <span className="text-slate-400">
                  H: <span className="stat-value text-white" data-testid="batter-hits">{stats?.hits || 0}</span>
                </span>
                <span className="text-slate-400">
                  RBI: <span className="stat-value text-white" data-testid="batter-rbi">{stats?.rbi || 0}</span>
                </span>
                <span className="text-slate-400">
                  SO: <span className="stat-value text-white" data-testid="batter-so">{stats?.so || 0}</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400">
                  IP: <span className="stat-value text-white" data-testid="pitcher-ip">{stats?.ip || '0.0'}</span>
                </span>
                <span className="text-slate-400">
                  K: <span className="stat-value text-white" data-testid="pitcher-k">{stats?.k || 0}</span>
                </span>
                <span className="text-slate-400">
                  BB: <span className="stat-value text-white" data-testid="pitcher-bb">{stats?.bb || 0}</span>
                </span>
              </>
            )}
          </div>

          {/* Today's Performance (Batter only) */}
          {isBatter && todayPerformance && (
            <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
              <span className="text-slate-400">HOY: </span>
              <span className="stat-value text-white" data-testid="today-performance">{todayPerformance}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
