import React, { useState, useCallback } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { Users, Settings } from "lucide-react";
import { Button } from "./components/ui/button";
import { Scoreboard } from "./components/game/Scoreboard";
import { FieldVisualization } from "./components/game/FieldVisualization";
import { PlayerCard } from "./components/game/PlayerCard";
import { PlayLog } from "./components/game/PlayLog";
import { ActionGrid } from "./components/controls/ActionGrid";
import { TeamManager } from "./components/admin/TeamManager";

// Initial game state
const initialGameState = {
  homeTeam: { id: '1', name: 'Tacos El Zurdo', logo: '🌮' },
  awayTeam: { id: '2', name: 'SNTE 53', logo: 'SNTE' },
  homeScore: 0,
  awayScore: 1,
  inning: 2,
  topOfInning: true,
  balls: 0,
  strikes: 0,
  outs: 0,
  bases: { first: false, second: false, third: false },
  currentBatterIndex: 0,
  plays: [],
  history: []
};

// Initial lineup data
const initialHomeLineup = [
  { id: '1', name: 'Paul Gamboa M.', position: 'CF', battingOrder: 1, stats: { avg: '.000', hits: 0, rbi: 0, so: 0, ab: 3 } },
  { id: '2', name: 'O. Mayorquin E.', position: 'LF', battingOrder: 2, stats: { avg: '.250', hits: 1, rbi: 0, so: 1, ab: 4 } },
  { id: '3', name: 'S. Vanansio', position: 'SS', battingOrder: 3, stats: { avg: '.333', hits: 2, rbi: 1, so: 0, ab: 6 } },
  { id: '4', name: 'E. Avcesada R.', position: '3B', battingOrder: 4, stats: { avg: '.200', hits: 1, rbi: 2, so: 1, ab: 5 } },
  { id: '5', name: 'D. Mayorquin', position: 'RF', battingOrder: 5, stats: { avg: '.000', hits: 0, rbi: 0, so: 2, ab: 3 } },
  { id: '6', name: 'Hernetsin', position: '2B', battingOrder: 6, stats: { avg: '.500', hits: 2, rbi: 0, so: 0, ab: 4 } },
  { id: '7', name: 'J. Valenzuela', position: 'C', battingOrder: 7, stats: { avg: '.100', hits: 1, rbi: 1, so: 2, ab: 10 } },
  { id: '8', name: 'Luis Mexía', position: 'P', battingOrder: 8, stats: { avg: '.000', hits: 0, rbi: 0, so: 1, ab: 2 } },
  { id: '9', name: 'J. Valenzuela', position: '1B', battingOrder: 9, stats: { avg: '.150', hits: 1, rbi: 0, so: 1, ab: 7 } },
];

const initialAwayLineup = [
  { id: '10', name: 'Manuel Cota Rábago', position: 'CF', battingOrder: 1, stats: { avg: '.300', hits: 3, rbi: 1, so: 2, ab: 10 } },
  { id: '11', name: 'Luis Mexía Félix', position: 'P', battingOrder: 2, stats: { avg: '.000', hits: 0, rbi: 0, so: 0, ab: 1 }, pitchingStats: { ip: '0.1', k: 0, bb: 0 } },
];

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [homeLineup, setHomeLineup] = useState(initialHomeLineup);
  const [awayLineup, setAwayLineup] = useState(initialAwayLineup);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [managingTeam, setManagingTeam] = useState('home');

  // Get current batter and pitcher
  const currentBatter = gameState.topOfInning 
    ? homeLineup[gameState.currentBatterIndex % homeLineup.length]
    : awayLineup[gameState.currentBatterIndex % awayLineup.length];

  const currentPitcher = gameState.topOfInning
    ? awayLineup.find(p => p.position === 'P') || awayLineup[0]
    : homeLineup.find(p => p.position === 'P') || homeLineup[0];

  // Get today's performance string
  const getTodayPerformance = (player) => {
    if (!player?.stats) return '0-0';
    const { hits, ab, so } = player.stats;
    const ks = so > 0 ? ` // ${Array(so).fill('KS').join(' // ')}` : '';
    return `${hits}-${ab}${ks}`;
  };

  // Save state to history for undo
  const saveToHistory = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      history: [...prev.history, {
        ...prev,
        history: [] // Don't nest history
      }]
    }));
  }, []);

  // Add play to log
  const addPlay = useCallback((description, code) => {
    const play = {
      id: Date.now(),
      inning: gameState.inning,
      description,
      code,
      timestamp: new Date()
    };
    setGameState(prev => ({
      ...prev,
      plays: [play, ...prev.plays]
    }));
  }, [gameState.inning]);

  // Handle strike
  const handleStrike = useCallback(() => {
    saveToHistory();
    setGameState(prev => {
      const newStrikes = prev.strikes + 1;
      if (newStrikes >= 3) {
        // Strikeout
        const newOuts = prev.outs + 1;
        if (newOuts >= 3) {
          // Change sides
          return {
            ...prev,
            strikes: 0,
            balls: 0,
            outs: 0,
            topOfInning: !prev.topOfInning,
            inning: prev.topOfInning ? prev.inning : prev.inning + 1,
            currentBatterIndex: 0,
            bases: { first: false, second: false, third: false }
          };
        }
        return {
          ...prev,
          strikes: 0,
          balls: 0,
          outs: newOuts,
          currentBatterIndex: prev.currentBatterIndex + 1
        };
      }
      return { ...prev, strikes: newStrikes };
    });
    addPlay(`${currentBatter?.name} Strike`, 'S');
    toast.success('Strike!', { duration: 1500 });
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle ball
  const handleBall = useCallback(() => {
    saveToHistory();
    setGameState(prev => {
      const newBalls = prev.balls + 1;
      if (newBalls >= 4) {
        // Walk - advance runner
        const newBases = { ...prev.bases };
        if (prev.bases.third && prev.bases.second && prev.bases.first) {
          // Score a run
          return {
            ...prev,
            balls: 0,
            strikes: 0,
            homeScore: prev.topOfInning ? prev.homeScore + 1 : prev.homeScore,
            awayScore: !prev.topOfInning ? prev.awayScore + 1 : prev.awayScore,
            currentBatterIndex: prev.currentBatterIndex + 1
          };
        }
        if (prev.bases.second && prev.bases.first) newBases.third = true;
        if (prev.bases.first) newBases.second = true;
        newBases.first = true;
        return {
          ...prev,
          balls: 0,
          strikes: 0,
          bases: newBases,
          currentBatterIndex: prev.currentBatterIndex + 1
        };
      }
      return { ...prev, balls: newBalls };
    });
    addPlay(`${currentBatter?.name} Bola`, 'B');
    toast.info('Bola', { duration: 1500 });
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle foul
  const handleFoul = useCallback(() => {
    saveToHistory();
    setGameState(prev => {
      if (prev.strikes < 2) {
        return { ...prev, strikes: prev.strikes + 1 };
      }
      return prev; // No change if already 2 strikes
    });
    addPlay(`${currentBatter?.name} Foul`, 'F');
    toast.info('Foul', { duration: 1500 });
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle hit
  const handleHit = useCallback((bases) => {
    saveToHistory();
    const hitTypes = { 1: 'Sencillo', 2: 'Doble', 3: 'Triple', 4: 'Home Run' };
    
    setGameState(prev => {
      let runsScored = 0;
      const newBases = { first: false, second: false, third: false };
      
      // Advance runners
      if (prev.bases.third) runsScored++;
      if (prev.bases.second) {
        if (bases >= 2) runsScored++;
        else newBases.third = true;
      }
      if (prev.bases.first) {
        if (bases >= 3) runsScored++;
        else if (bases === 2) newBases.third = true;
        else newBases.second = true;
      }
      
      // Place batter
      if (bases === 4) {
        runsScored++; // Home run
      } else if (bases === 3) {
        newBases.third = true;
      } else if (bases === 2) {
        newBases.second = true;
      } else {
        newBases.first = true;
      }
      
      return {
        ...prev,
        balls: 0,
        strikes: 0,
        bases: newBases,
        homeScore: prev.topOfInning ? prev.homeScore + runsScored : prev.homeScore,
        awayScore: !prev.topOfInning ? prev.awayScore + runsScored : prev.awayScore,
        currentBatterIndex: prev.currentBatterIndex + 1
      };
    });
    
    addPlay(`${currentBatter?.name} ${hitTypes[bases]}`, `H${bases}`);
    toast.success(`${hitTypes[bases]}!`, { duration: 2000 });
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle out
  const handleOut = useCallback((type) => {
    saveToHistory();
    const outTypes = {
      rola: 'Rolando',
      fly: 'Fly',
      linea: 'Línea',
      ponche: 'Ponchado Sin Tirar',
      k_swing: 'Ponchado Tirando',
      doble_play: 'Doble Play',
      doble_play_2: 'Doble Play'
    };
    
    setGameState(prev => {
      const outsToAdd = type.includes('doble') ? 2 : 1;
      const newOuts = Math.min(prev.outs + outsToAdd, 3);
      
      if (newOuts >= 3) {
        return {
          ...prev,
          strikes: 0,
          balls: 0,
          outs: 0,
          topOfInning: !prev.topOfInning,
          inning: prev.topOfInning ? prev.inning : prev.inning + 1,
          currentBatterIndex: 0,
          bases: { first: false, second: false, third: false }
        };
      }
      
      return {
        ...prev,
        strikes: 0,
        balls: 0,
        outs: newOuts,
        currentBatterIndex: prev.currentBatterIndex + 1,
        bases: type.includes('doble') ? { first: false, second: false, third: false } : prev.bases
      };
    });
    
    addPlay(`${currentBatter?.name} es ${outTypes[type] || 'Out'}`, type === 'ponche' || type === 'k_swing' ? 'K' : 'O');
    toast.error('Out!', { duration: 1500 });
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle other actions
  const handleOther = useCallback((type) => {
    saveToHistory();
    
    if (type === 'error') {
      setGameState(prev => ({
        ...prev,
        balls: 0,
        strikes: 0,
        bases: { ...prev.bases, first: true },
        currentBatterIndex: prev.currentBatterIndex + 1
      }));
      addPlay(`Error - ${currentBatter?.name} en base`, 'E');
      toast.warning('Error', { duration: 1500 });
    } else if (type === 'fly_sac' || type === 'toque_sac') {
      setGameState(prev => {
        const newOuts = prev.outs + 1;
        let runsScored = 0;
        const newBases = { ...prev.bases };
        
        if (prev.bases.third && prev.outs < 2) {
          runsScored = 1;
          newBases.third = false;
          if (prev.bases.second) {
            newBases.third = true;
            newBases.second = false;
          }
        }
        
        if (newOuts >= 3) {
          return {
            ...prev,
            strikes: 0,
            balls: 0,
            outs: 0,
            topOfInning: !prev.topOfInning,
            inning: prev.topOfInning ? prev.inning : prev.inning + 1,
            homeScore: prev.topOfInning ? prev.homeScore + runsScored : prev.homeScore,
            awayScore: !prev.topOfInning ? prev.awayScore + runsScored : prev.awayScore,
            currentBatterIndex: 0,
            bases: { first: false, second: false, third: false }
          };
        }
        
        return {
          ...prev,
          strikes: 0,
          balls: 0,
          outs: newOuts,
          bases: newBases,
          homeScore: prev.topOfInning ? prev.homeScore + runsScored : prev.homeScore,
          awayScore: !prev.topOfInning ? prev.awayScore + runsScored : prev.awayScore,
          currentBatterIndex: prev.currentBatterIndex + 1
        };
      });
      addPlay(`${currentBatter?.name} Sacrificio`, 'SAC');
      toast.info('Sacrificio', { duration: 1500 });
    } else if (type === 'wp_pb') {
      setGameState(prev => {
        const newBases = { ...prev.bases };
        let runsScored = 0;
        if (prev.bases.third) { runsScored++; newBases.third = false; }
        if (prev.bases.second) { newBases.third = true; newBases.second = false; }
        if (prev.bases.first) { newBases.second = true; newBases.first = false; }
        
        return {
          ...prev,
          bases: newBases,
          homeScore: prev.topOfInning ? prev.homeScore + runsScored : prev.homeScore,
          awayScore: !prev.topOfInning ? prev.awayScore + runsScored : prev.awayScore
        };
      });
      addPlay('Wild Pitch / Passed Ball', 'WP');
      toast.warning('WP/PB', { duration: 1500 });
    } else if (type === 'bola_ocupada') {
      addPlay('Bola Ocupada', 'BO');
      toast.info('Bola Ocupada', { duration: 1500 });
    } else if (type === 'matriz') {
      addPlay('Matriz', 'M');
      toast.info('Matriz', { duration: 1500 });
    }
  }, [saveToHistory, addPlay, currentBatter]);

  // Handle action from ActionGrid
  const handleAction = useCallback((actionId) => {
    switch (actionId) {
      case 'strike': handleStrike(); break;
      case 'ball': handleBall(); break;
      case 'foul': handleFoul(); break;
      case 'h1': handleHit(1); break;
      case 'h2': handleHit(2); break;
      case 'h3': handleHit(3); break;
      case 'h4': handleHit(4); break;
      case 'rola':
      case 'fly':
      case 'linea':
      case 'ponche':
      case 'k_swing':
      case 'doble_play':
      case 'doble_play_2':
        handleOut(actionId);
        break;
      default:
        handleOther(actionId);
    }
  }, [handleStrike, handleBall, handleFoul, handleHit, handleOut, handleOther]);

  // Undo last action
  const handleUndo = useCallback(() => {
    setGameState(prev => {
      if (prev.history.length === 0) return prev;
      const lastState = prev.history[prev.history.length - 1];
      return {
        ...lastState,
        history: prev.history.slice(0, -1),
        plays: prev.plays.slice(1) // Remove last play
      };
    });
    toast.info('Acción deshecha', { duration: 1500 });
  }, []);

  // Advance runner
  const handleAdvanceRunner = useCallback((base) => {
    saveToHistory();
    setGameState(prev => {
      const newBases = { ...prev.bases };
      let runsScored = 0;
      
      if (base === 'third' && prev.bases.third) {
        runsScored = 1;
        newBases.third = false;
      } else if (base === 'second' && prev.bases.second) {
        newBases.second = false;
        newBases.third = true;
      } else if (base === 'first' && prev.bases.first) {
        newBases.first = false;
        newBases.second = true;
      }
      
      return {
        ...prev,
        bases: newBases,
        homeScore: prev.topOfInning ? prev.homeScore + runsScored : prev.homeScore,
        awayScore: !prev.topOfInning ? prev.awayScore + runsScored : prev.awayScore
      };
    });
    addPlay(`Corredor avanza desde ${base}`, 'ADV');
    toast.success('Corredor avanza', { duration: 1500 });
  }, [saveToHistory, addPlay]);

  // Open team manager
  const openTeamManager = (team) => {
    setManagingTeam(team);
    setShowTeamManager(true);
  };

  // Get fielders for field visualization
  const getFielders = () => {
    const lineup = gameState.topOfInning ? awayLineup : homeLineup;
    const fielders = {};
    const defaultPositions = {
      P: { x: 200, y: 280 },
      C: { x: 200, y: 380 },
      '1B': { x: 310, y: 260 },
      '2B': { x: 260, y: 200 },
      SS: { x: 140, y: 200 },
      '3B': { x: 90, y: 260 },
      LF: { x: 70, y: 120 },
      CF: { x: 200, y: 60 },
      RF: { x: 330, y: 120 },
    };
    
    lineup.forEach(player => {
      if (player.position && defaultPositions[player.position]) {
        fielders[player.position] = {
          name: player.name,
          ...defaultPositions[player.position]
        };
      }
    });
    
    return fielders;
  };

  return (
    <div className="scorekeeper-container min-h-screen" data-testid="scorekeeper-app">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl text-white tracking-wider">
            Scorekeeper
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openTeamManager('home')}
              className="text-slate-400 hover:text-white"
              data-testid="manage-home-team-btn"
            >
              <Users className="w-4 h-4 mr-2" />
              {gameState.homeTeam.name}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openTeamManager('away')}
              className="text-slate-400 hover:text-white"
              data-testid="manage-away-team-btn"
            >
              <Users className="w-4 h-4 mr-2" />
              {gameState.awayTeam.name}
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-4">
        {/* Scoreboard */}
        <Scoreboard
          homeTeam={gameState.homeTeam}
          awayTeam={gameState.awayTeam}
          homeScore={gameState.homeScore}
          awayScore={gameState.awayScore}
          inning={gameState.inning}
          topOfInning={gameState.topOfInning}
          balls={gameState.balls}
          strikes={gameState.strikes}
          outs={gameState.outs}
        />

        {/* Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* Field Visualization */}
          <div className="lg:col-span-5">
            <FieldVisualization
              bases={gameState.bases}
              fielders={getFielders()}
              onAdvanceRunner={handleAdvanceRunner}
            />
          </div>

          {/* Player Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <PlayerCard
              player={currentBatter}
              type="batter"
              stats={currentBatter?.stats}
              todayPerformance={getTodayPerformance(currentBatter)}
            />
            <PlayerCard
              player={currentPitcher}
              type="pitcher"
              stats={currentPitcher?.pitchingStats || { ip: '0.0', k: 0, bb: 0 }}
            />
          </div>

          {/* Play Log */}
          <div className="lg:col-span-3 h-[400px]">
            <PlayLog plays={gameState.plays} />
          </div>
        </div>

        {/* Action Grid */}
        <div className="mt-4">
          <ActionGrid
            onAction={handleAction}
            onUndo={handleUndo}
            canUndo={gameState.history.length > 0}
          />
        </div>
      </main>

      {/* Team Manager Modal */}
      <TeamManager
        isOpen={showTeamManager}
        onClose={() => setShowTeamManager(false)}
        teams={{ home: gameState.homeTeam, away: gameState.awayTeam }}
        activeTeam={managingTeam === 'home' ? gameState.homeTeam : gameState.awayTeam}
        currentLineup={managingTeam === 'home' ? homeLineup : awayLineup}
        onUpdateLineup={(lineup) => {
          if (managingTeam === 'home') {
            setHomeLineup(lineup);
          } else {
            setAwayLineup(lineup);
          }
        }}
      />
    </div>
  );
}

export default App;
