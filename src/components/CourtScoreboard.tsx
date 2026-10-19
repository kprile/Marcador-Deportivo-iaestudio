import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  MatchState,
  SportType,
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
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trophy,
  Play,
  Rotate3d,
} from 'lucide-react';

interface CourtScoreboardProps {
  state: MatchState;
  onStateChange: (newState: MatchState) => void;
  onOpenSetup: () => void;
  onOpenDiagnostic: () => void;
}

export const CourtScoreboard: React.FC<CourtScoreboardProps> = ({
  state,
  onStateChange,
  onOpenSetup,
  onOpenDiagnostic,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [swappedEnds, setSwappedEnds] = useState(false);
  const [lastActionVisual, setLastActionVisual] = useState<{ player: 1 | 2; text: string } | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAnnouncer.getSettings().enabled);

  // Initialize screen wake lock
  useEffect(() => {
    screenWakeLock.requestWakeLock().then((active) => {
      setWakeLockActive(active);
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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

    setLastActionVisual({ player, text: '+1 Punto' });
    setTimeout(() => setLastActionVisual(null), 700);

    const { nextState, announcement } = addPoint(state, player);
    onStateChange(nextState);

    if (announcement && voiceEnabled) {
      voiceAnnouncer.speak(announcement);
    }
  };

  const handleUndo = () => {
    const { state: restoredState, announcement } = undoLastPoint(state);
    onStateChange(restoredState);
    if (voiceEnabled) {
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleVoice = () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    voiceAnnouncer.saveSettings({ enabled: nextVal });
    if (nextVal) {
      voiceAnnouncer.speak('Anuncios de voz activados.');
    }
  };

  const currentSet = state.sets[state.currentSetIndex] || state.sets[0];

  // Visual layout sides (taking swap ends into account)
  const leftPlayerNum = swappedEnds ? 2 : 1;
  const rightPlayerNum = swappedEnds ? 1 : 2;

  const getScoreDisplay = (playerNum: 1 | 2) => {
    return playerNum === 1 ? state.displayScoreP1 : state.displayScoreP2;
  };

  const getSportBadgeTitle = (sport: SportType) => {
    switch (sport) {
      case 'padel':
        return state.config.padelDeuceRule === 'golden_point' ? 'PÁDEL · PUNTO DE ORO' : 'PÁDEL · VENTAJAS';
      case 'tennis':
        return 'TENIS OFICIAL';
      case 'pingpong':
        return 'PING-PONG · A 11 PTS';
    }
  };

  return (
    <div className="relative flex flex-col flex-1 w-full h-[calc(100dvh-57px)] max-h-[calc(100dvh-57px)] bg-[#0b0f17] text-white select-none overflow-hidden">
      {/* Top Court Information Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
            {getSportBadgeTitle(state.config.sport)}
          </span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-[11px] text-slate-400 font-medium">
            Set {state.currentSetIndex + 1}
          </span>
          {state.isGoldenPoint && (
            <span className="px-2 py-0.5 text-[10px] font-black text-amber-950 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full animate-pulse">
              PUNTO DE ORO
            </span>
          )}
          {state.isBreakPoint && !state.isGoldenPoint && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-600/50 rounded">
              Quiebre
            </span>
          )}
          {state.isSetPoint && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold text-sky-300 bg-sky-950/80 border border-sky-600/50 rounded">
              Set Point
            </span>
          )}
          {state.isMatchPoint && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold text-white bg-red-600 rounded animate-bounce">
              Match Point
            </span>
          )}
        </div>

        {/* Previous & Current Sets Summary */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Sets:</span>
          {state.sets.map((set, idx) => (
            <div
              key={idx}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                idx === state.currentSetIndex
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <span className="text-yellow-400">{set.gamesP1}</span>
              <span className="text-slate-500 mx-0.5">-</span>
              <span className="text-sky-400">{set.gamesP2}</span>
              {set.tiebreakP1 !== undefined && (
                <span className="text-[9px] text-slate-400 ml-0.5">
                  ({set.tiebreakP1}-{set.tiebreakP2})
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Court Controls Bar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRepeatScore}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
            title="Repetir puntuación por voz"
          >
            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
          </button>

          <button
            onClick={() => setSwappedEnds(!swappedEnds)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
            title="Invertir posiciones (Izquierda / Derecha)"
          >
            <Rotate3d className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Invertir Lados</span>
          </button>

          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              voiceEnabled ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/40' : 'bg-slate-800 text-slate-500'
            }`}
            title={voiceEnabled ? 'Voz activada' : 'Voz silenciada'}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Scoreboard: VERTICAL DIVISION LINE (Jugador 1 a la Izquierda, Jugador 2 a la Derecha) */}
      <div className="flex-1 flex flex-row w-full h-full min-h-0 overflow-hidden relative">
        {/* Left Court Half - JUGADOR 1 (Izquierda) */}
        <ScoreboardSide
          playerNumber={leftPlayerNum}
          name={getPlayerDisplayName(state.config, leftPlayerNum)}
          score={getScoreDisplay(leftPlayerNum)}
          gamesWon={currentSet ? (leftPlayerNum === 1 ? currentSet.gamesP1 : currentSet.gamesP2) : 0}
          setsWon={state.sets.filter((s) => s.winner === leftPlayerNum).length}
          isServing={state.currentServer === leftPlayerNum}
          serverSide={state.serverSide}
          sport={state.config.sport}
          isTiebreak={state.isTiebreak}
          colorTheme={leftPlayerNum === 1 ? 'yellow' : 'cyan'}
          onTap={() => handleScorePoint(leftPlayerNum)}
        />

        {/* VERTICAL Net Center Divider (Línea Vertical en el Medio) */}
        <div className="w-1.5 sm:w-2 h-full bg-gradient-to-b from-slate-800 via-slate-600 to-slate-800 flex items-center justify-center shrink-0 z-10 pointer-events-none shadow-md">
          <div className="px-1.5 sm:px-2 py-1 bg-slate-900 border border-slate-700 rounded-full text-[9px] sm:text-[10px] font-mono text-slate-400 rotate-90 sm:rotate-0 tracking-wider">
            VS
          </div>
        </div>

        {/* Right Court Half - JUGADOR 2 (Derecha) */}
        <ScoreboardSide
          playerNumber={rightPlayerNum}
          name={getPlayerDisplayName(state.config, rightPlayerNum)}
          score={getScoreDisplay(rightPlayerNum)}
          gamesWon={currentSet ? (rightPlayerNum === 1 ? currentSet.gamesP1 : currentSet.gamesP2) : 0}
          setsWon={state.sets.filter((s) => s.winner === rightPlayerNum).length}
          isServing={state.currentServer === rightPlayerNum}
          serverSide={state.serverSide}
          sport={state.config.sport}
          isTiebreak={state.isTiebreak}
          colorTheme={rightPlayerNum === 1 ? 'yellow' : 'cyan'}
          onTap={() => handleScorePoint(rightPlayerNum)}
        />

        {/* Floating Visual Feedback when point scored */}
        {lastActionVisual && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="px-4 sm:px-6 py-2 sm:py-3 bg-black/90 border border-amber-400/80 rounded-2xl text-lg sm:text-2xl font-black text-amber-300 shadow-2xl backdrop-blur-md animate-score-pulse text-center">
              {lastActionVisual.text} para {getPlayerDisplayName(state.config, lastActionVisual.player)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Court Ergonomic Quick Action Dock */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2">
          {/* Big Ergonomic Undo Button */}
          <button
            onClick={handleUndo}
            disabled={state.history.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all active:scale-95 ${
              state.history.length > 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Deshacer</span>
            <span className="hidden sm:inline text-[10px] text-amber-400/70 font-mono">(3 clics BT)</span>
          </button>

          {/* Bluetooth Remote Hint */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>1 clic = Izquierda (J1) | 2 clics = Derecha (J2)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDiagnostic}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            Probar Control
          </button>
          <button
            onClick={onOpenSetup}
            className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-lg transition-colors shadow-sm"
          >
            Nuevo Partido
          </button>
        </div>
      </div>

      {/* Match Completed Victory Modal */}
      {state.status === 'completed' && state.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-lg">
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest text-yellow-400 uppercase">JUEGO, SET Y PARTIDO</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                ¡{getWinnerName(state)} ha ganado!
              </h2>
            </div>

            {/* Final Sets Score */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400 mb-2">Resultado Final por Sets</p>
              <div className="flex justify-center gap-3">
                {state.sets.map((set, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono">
                    <span className="text-yellow-400 font-bold">{set.gamesP1}</span>
                    <span className="text-slate-500 mx-1.5">-</span>
                    <span className="text-sky-400 font-bold">{set.gamesP2}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={handleRepeatScore}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <Volume2 className="w-4 h-4 text-yellow-400" />
                Escuchar Resumen
              </button>
              <button
                onClick={onOpenSetup}
                className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 rounded-xl shadow-lg transition"
              >
                <Play className="w-4 h-4" />
                Iniciar Nuevo Partido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ScoreboardSideProps {
  playerNumber: 1 | 2;
  name: string;
  score: string;
  gamesWon: number;
  setsWon: number;
  isServing: boolean;
  serverSide: 'deuce' | 'ad';
  sport: SportType;
  isTiebreak: boolean;
  colorTheme: 'yellow' | 'cyan';
  onTap: () => void;
}

const ScoreboardSide: React.FC<ScoreboardSideProps> = ({
  playerNumber,
  name,
  score,
  gamesWon,
  setsWon,
  isServing,
  serverSide,
  sport,
  isTiebreak,
  colorTheme,
  onTap,
}) => {
  const isYellow = colorTheme === 'yellow';
  const textColor = isYellow ? 'text-[#E2F952]' : 'text-[#38BDF8]';
  const glowShadow = isYellow ? 'drop-shadow-[0_0_20px_rgba(226,249,82,0.3)]' : 'drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]';
  const bgGradient = isYellow
    ? 'from-[#0e1626] to-[#090e18] hover:from-[#131d33] hover:to-[#0b121e]'
    : 'from-[#0b1320] to-[#070b14] hover:from-[#101b2e] hover:to-[#090f1a]';

  return (
    <div
      onClick={onTap}
      className={`relative flex-1 min-h-0 min-w-0 flex flex-col justify-between p-2 sm:p-5 cursor-pointer select-none transition-all duration-150 bg-gradient-to-b ${bgGradient} active:brightness-125 group overflow-hidden`}
    >
      {/* Tap hint overlay */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded pointer-events-none">
        Toca para sumar punto
      </div>

      {/* Player Header with Server Ball Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 shrink-0">
        <div className="flex flex-col truncate">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
            {playerNumber === 1 ? 'Izquierda (1 Clic)' : 'Derecha (2 Clics)'}
          </span>
          <h2 className="text-sm sm:text-xl lg:text-2xl font-black text-white tracking-tight truncate">
            {name}
          </h2>
        </div>

        {/* Server Indicator */}
        {isServing && (
          <div className="self-start sm:self-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold animate-pulse shadow-md shadow-emerald-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SAQUE</span>
            {sport !== 'pingpong' && (
              <span className="text-[8px] text-emerald-400/80 uppercase font-mono">
                ({serverSide === 'deuce' ? 'Der.' : 'Izq.'})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Giant Score Display - Scaled to fit in vertical split column without scrolling */}
      <div className="my-auto flex flex-col items-center justify-center shrink min-h-0 py-2">
        <div
          className={`font-athletic font-black leading-none tracking-tighter tabular-nums ${textColor} ${glowShadow} transition-transform group-active:scale-[1.03] text-[clamp(4.2rem,13vw,12rem)]`}
        >
          {score}
        </div>
        <p className="text-[9px] sm:text-xs font-semibold text-slate-400 tracking-widest uppercase">
          {sport === 'pingpong' || isTiebreak ? 'PUNTOS' : 'TANTEO'}
        </p>
      </div>

      {/* Sub-Metrics: Sets and Games Won */}
      <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-800/60 text-center shrink-0">
        <div>
          <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-500 uppercase truncate">
            {sport === 'pingpong' ? 'Sets' : 'Juegos'}
          </p>
          <p className="text-base sm:text-2xl font-black text-white tabular-nums">
            {gamesWon}
          </p>
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-500 uppercase truncate">
            Sets
          </p>
          <p className="text-base sm:text-2xl font-black text-amber-400 tabular-nums">
            {setsWon}
          </p>
        </div>
      </div>
    </div>
  );
};
