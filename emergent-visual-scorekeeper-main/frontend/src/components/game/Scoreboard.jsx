import React from 'react';

export const Scoreboard = ({ 
  homeTeam, 
  awayTeam, 
  homeScore, 
  awayScore, 
  inning, 
  topOfInning, 
  balls, 
  strikes, 
  outs 
}) => {
  const renderIndicatorDots = (count, max, activeColor) => {
    return Array.from({ length: max }, (_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full transition-all duration-200 ${i < count ? 'shadow-lg' : ''}`}
        style={{
          backgroundColor: i < count ? activeColor : '#334155',
          boxShadow: i < count ? `0 0 8px ${activeColor}` : 'none'
        }}
        data-testid={`indicator-${i < count ? 'active' : 'inactive'}-${i}`}
      />
    ));
  };

  return (
    <div className="game-card p-4 lg:p-6" data-testid="scoreboard">
      <div className="flex items-center justify-between flex-wrap gap-4 lg:gap-8">
        {/* Teams and Score Section */}
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Home Team */}
          <div className="flex items-center gap-3" data-testid="home-team-section">
            <div className="w-12 h-12 rounded-full bg-amber-800/60 flex items-center justify-center border-2 border-amber-600/50">
              <span role="img" aria-label="taco" className="text-2xl">🌮</span>
            </div>
            <span className="font-heading font-bold text-base lg:text-xl text-white">{homeTeam.name}</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 lg:gap-6 px-4 lg:px-8" data-testid="score-display">
            <span className="score-number text-4xl lg:text-6xl text-white" data-testid="home-score">{homeScore}</span>
            <span className="text-2xl lg:text-4xl text-slate-600 font-light">-</span>
            <span className="score-number text-4xl lg:text-6xl text-white" data-testid="away-score">{awayScore}</span>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3" data-testid="away-team-section">
            <div className="w-12 h-12 rounded-full bg-blue-800/60 flex items-center justify-center border-2 border-blue-600/50">
              <span className="text-[10px] font-bold text-white leading-tight">SNTE<br/>53</span>
            </div>
            <span className="font-heading font-bold text-base lg:text-xl text-white">{awayTeam.name}</span>
          </div>
        </div>

        {/* Game Status Indicators */}
        <div className="flex items-center gap-6 lg:gap-10">
          {/* Inning */}
          <div className="text-center" data-testid="inning-display">
            <div className="stat-label mb-2">Inning</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-sm font-bold ${topOfInning ? 'text-emerald-400' : 'text-slate-500'}`}>
                {topOfInning ? '↑' : '↓'}
              </span>
              <span className="stat-value text-2xl lg:text-3xl">{inning}</span>
            </div>
          </div>

          {/* Outs */}
          <div className="text-center" data-testid="outs-display">
            <div className="stat-label mb-2">Outs</div>
            <div className="flex items-center justify-center gap-1.5">
              {renderIndicatorDots(outs, 3, '#EF4444')}
            </div>
          </div>

          {/* Balls */}
          <div className="text-center" data-testid="balls-display">
            <div className="stat-label mb-2">Balls</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="stat-value text-2xl lg:text-3xl mr-2">{balls}</span>
              {renderIndicatorDots(balls, 4, '#10B981')}
            </div>
          </div>

          {/* Strikes */}
          <div className="text-center" data-testid="strikes-display">
            <div className="stat-label mb-2">Strikes</div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="stat-value text-2xl lg:text-3xl mr-2">{strikes}</span>
              {renderIndicatorDots(strikes, 3, '#EF4444')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
