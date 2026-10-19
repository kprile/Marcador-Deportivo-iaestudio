import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  MatchState,
} from '../types/sports';
import {
  addPoint,
  undoLastPoint,
  getPlayerDisplayName,
  getWinnerName,
} from '../logic/scoreEngine';
import { voiceAnnouncer } from '../services/voiceAnnouncer';
import { screenWakeLock } from '../services/wakeLock';
import { saveMatchRecord } from '../services/matchStorage';
import {
  Settings,
  Trophy,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react';

interface CourtScoreboardProps {
  state: MatchState;
  onStateChange: (newState: MatchState) => void;
  onOpenMenu: () => void;
}

export const CourtScoreboard: React.FC<CourtScoreboardProps> = ({
  state,
  onStateChange,
  onOpenMenu,
}) => {
  const [swappedEnds, setSwappedEnds] = useState(false);
  const [lastActionVisual, setLastActionVisual] = useState<{ player: 1 | 2; text: string } | null>(null);

  // Initialize screen wake lock
  useEffect(() => {
    screenWakeLock.requestWakeLock();
  }, []);

  // Trigger confetti and match record on completion
  useEffect(() => {
    if (state.status === 'completed' && state.winner) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E2F952', '#38BDF8', '#F59E0B', '#10B981'],
        });
      } catch {
        // ignore
      }

      // Save match to local history
      const durationMin = Math.max(1, Math.round((Date.now() - state.startTime) / 60000));
      const setsStr = state.sets.map((s) => `${s.gamesP1}-${s.gamesP2}`).join(', ');
      saveMatchRecord({
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        sport: state.config.sport,
        mode: state.config.mode,
        player1: getPlayerDisplayName(state.config, 1),
        player2: getPlayerDisplayName(state.config, 2),
        durationMinutes: durationMin,
        setsSummary: setsStr,
        winner: state.winner,
        winnerName: getWinnerName(state),
        totalPointsP1: state.pointsP1,
        totalPointsP2: state.pointsP2,
      });
    }
  }, [state.status, state.winner]);

  const handleScorePoint = (player: 1 | 2) => {
    if (state.status === 'completed') return;

    setLastActionVisual({ player, text: '+1' });
    setTimeout(() => setLastActionVisual(null), 600);

    const { nextState, announcement } = addPoint(state, player);
    onStateChange(nextState);

    if (announcement) {
      voiceAnnouncer.speak(announcement);
    }
  };

  const handleRepeatScore = () => {
    if (state.config.sport === 'pingpong') {
      const serverName = getPlayerDisplayName(state.config, state.currentServer);
      voiceAnnouncer.speak(`${state.pointsP1} a ${state.pointsP2}. Saca ${serverName}.`, true);
    } else {
      const s1 = state.displayScoreP1;
      const s2 = state.displayScoreP2;
      const serverName = getPlayerDisplayName(state.config, state.currentServer);
      voiceAnnouncer.speak(`Marcador: ${s1} a ${s2}. Saca ${serverName}.`, true);
    }
  };

  const currentSet = state.sets[state.currentSetIndex] || state.sets[0];
  const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
  const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;

  const leftPlayerNum = swappedEnds ? 2 : 1;
  const rightPlayerNum = swappedEnds ? 1 : 2;

  const getScoreDisplay = (playerNum: 1 | 2) => {
    return playerNum === 1 ? state.displayScoreP1 : state.displayScoreP2;
  };

  return (
    <div className="relative w-screen h-screen max-h-screen bg-[#070b12] text-white select-none overflow-hidden flex flex-col justify-between">
      {/* Top Center: Minimal Sets & Match Header (SOLO SETS Y QUIÉN SACA) */}
      <div className="absolute top-2 left-0 right-0 z-20 flex items-center justify-center pointer-events-none px-4">
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            SETS
          </span>
          <span className="text-sm font-black font-mono text-yellow-400">
            {setsWonP1}
          </span>
          <span className="text-slate-600 font-bold">-</span>
          <span className="text-sm font-black font-mono text-sky-400">
            {setsWonP2}
          </span>

          {state.sets.length > 1 && (
            <span className="text-[10px] text-slate-500 font-mono ml-1">
              (Set {state.currentSetIndex + 1})
            </span>
          )}

          {state.isGoldenPoint && (
            <span className="ml-1 px-2 py-0.5 text-[9px] font-black text-amber-950 bg-yellow-400 rounded-full animate-pulse">
              PUNTO DE ORO
            </span>
          )}
        </div>
      </div>

      {/* Discrete Floating Settings Trigger in Corner (20% opacity, doesn't obstruct court) */}
      <button
        onClick={onOpenMenu}
        className="fixed top-2.5 right-2.5 z-30 p-2 rounded-full bg-slate-900/40 hover:bg-slate-900 text-slate-500 hover:text-white border border-slate-800/40 hover:border-slate-700 transition opacity-30 hover:opacity-100 shadow-md pointer-events-auto"
        title="Opciones y Menú (Nuevo partido, diagnóstico, configuración)"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Main Screen: ONLY THE SCOREBOARD IN VERTICAL DIVISION (Left vs Right) */}
      <div className="flex-1 flex flex-row w-full h-full min-h-0 overflow-hidden relative">
        {/* Left Side: JUGADOR 1 */}
        <ScoreColumn
          playerNumber={leftPlayerNum}
          name={getPlayerDisplayName(state.config, leftPlayerNum)}
          score={getScoreDisplay(leftPlayerNum)}
          gamesWon={currentSet ? (leftPlayerNum === 1 ? currentSet.gamesP1 : currentSet.gamesP2) : 0}
          setsWon={leftPlayerNum === 1 ? setsWonP1 : setsWonP2}
          isServing={state.currentServer === leftPlayerNum}
          serverSide={state.serverSide}
          sport={state.config.sport}
          colorTheme={leftPlayerNum === 1 ? 'yellow' : 'cyan'}
          onTap={() => handleScorePoint(leftPlayerNum)}
        />

        {/* Vertical Center Net Line */}
        <div className="w-1.5 sm:w-2 h-full bg-gradient-to-b from-slate-800 via-slate-600 to-slate-800 flex items-center justify-center shrink-0 z-10 pointer-events-none shadow-md">
          <div className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded-full text-[9px] font-mono text-slate-400 rotate-90 sm:rotate-0 tracking-wider font-bold">
            VS
          </div>
        </div>

        {/* Right Side: JUGADOR 2 */}
        <ScoreColumn
          playerNumber={rightPlayerNum}
          name={getPlayerDisplayName(state.config, rightPlayerNum)}
          score={getScoreDisplay(rightPlayerNum)}
          gamesWon={currentSet ? (rightPlayerNum === 1 ? currentSet.gamesP1 : currentSet.gamesP2) : 0}
          setsWon={rightPlayerNum === 1 ? setsWonP1 : setsWonP2}
          isServing={state.currentServer === rightPlayerNum}
          serverSide={state.serverSide}
          sport={state.config.sport}
          colorTheme={rightPlayerNum === 1 ? 'yellow' : 'cyan'}
          onTap={() => handleScorePoint(rightPlayerNum)}
        />

        {/* Point scored feedback */}
        {lastActionVisual && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="px-6 py-3 bg-black/95 border border-amber-400 rounded-2xl text-3xl font-black text-amber-300 shadow-2xl animate-score-pulse">
              {lastActionVisual.text}
            </div>
          </div>
        )}
      </div>

      {/* Match Completed Victory Modal */}
      {state.status === 'completed' && state.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center space-y-5">
            <div className="inline-flex p-3 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <p className="text-[11px] font-bold tracking-widest text-yellow-400 uppercase font-mono">
                JUEGO, SET Y PARTIDO
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                ¡{getWinnerName(state)} ha ganado!
              </h2>
            </div>

            {/* Sets Summary */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 mr-2">Resultado:</span>
              <span className="text-white font-bold">
                {state.sets.map((s) => `${s.gamesP1}-${s.gamesP2}`).join(' / ')}
              </span>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={handleRepeatScore}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                Repetir Voz
              </button>
              <button
                onClick={onOpenMenu}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-xl shadow-lg transition"
              >
                <Play className="w-3.5 h-3.5" />
                Nuevo Partido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ScoreColumnProps {
  playerNumber: 1 | 2;
  name: string;
  score: string;
  gamesWon: number;
  setsWon: number;
  isServing: boolean;
  serverSide: 'deuce' | 'ad';
  sport: string;
  colorTheme: 'yellow' | 'cyan';
  onTap: () => void;
}

const ScoreColumn: React.FC<ScoreColumnProps> = ({
  playerNumber,
  name,
  score,
  gamesWon,
  setsWon,
  isServing,
  serverSide,
  sport,
  colorTheme,
  onTap,
}) => {
  const isYellow = colorTheme === 'yellow';
  const textColor = isYellow ? 'text-[#E2F952]' : 'text-[#38BDF8]';
  const glowShadow = isYellow ? 'drop-shadow-[0_0_30px_rgba(226,249,82,0.35)]' : 'drop-shadow-[0_0_30px_rgba(56,189,248,0.35)]';
  const bgGradient = isYellow
    ? 'from-[#0e1626] to-[#070b13] hover:from-[#111c30] hover:to-[#090f1a]'
    : 'from-[#0b1320] to-[#05080e] hover:from-[#0e1829] hover:to-[#070b14]';

  return (
    <div
      onClick={onTap}
      className={`relative flex-1 min-h-0 min-w-0 flex flex-col justify-between p-3 sm:p-6 cursor-pointer select-none transition-all duration-150 bg-gradient-to-b ${bgGradient} active:brightness-125 overflow-hidden group`}
    >
      {/* Top Header: Player Name + Server Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-6 sm:pt-4 shrink-0">
        <div className="flex flex-col truncate">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
            {playerNumber === 1 ? 'Lado 1' : 'Lado 2'}
          </span>
          <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
            {name}
          </h2>
        </div>

        {/* Server Indicator (QUIÉN SACA) */}
        {isServing && (
          <div className="self-start sm:self-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-[11px] font-black animate-pulse shadow-lg shadow-emerald-500/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>SAQUE</span>
            {sport !== 'pingpong' && (
              <span className="text-[9px] text-emerald-300/80 uppercase font-mono">
                ({serverSide === 'deuce' ? 'Der' : 'Izq'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Giant Score Display (SOLO EL PUNTAJE) */}
      <div className="my-auto flex flex-col items-center justify-center shrink min-h-0 py-2">
        <div
          className={`font-athletic font-black leading-none tracking-tighter tabular-nums ${textColor} ${glowShadow} transition-transform group-active:scale-[1.03] text-[clamp(5.5rem,24vw,22rem)]`}
        >
          {score}
        </div>
      </div>

      {/* Bottom Sub-Metrics: SOLO JUEGOS Y SETS */}
      <div className="grid grid-cols-2 gap-2 pt-2 pb-1 border-t border-slate-800/60 text-center shrink-0">
        <div>
          <p className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
            {sport === 'pingpong' ? 'Sets' : 'Juegos'}
          </p>
          <p className="text-xl sm:text-3xl font-black text-white tabular-nums">
            {gamesWon}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
            Sets
          </p>
          <p className="text-xl sm:text-3xl font-black text-amber-400 tabular-nums">
            {setsWon}
          </p>
        </div>
      </div>
    </div>
  );
};
