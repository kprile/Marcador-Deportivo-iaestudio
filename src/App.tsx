import React, { useEffect, useState, useCallback } from 'react';
import { MatchConfig, MatchState } from './types/sports';
import { createInitialMatchState, addPoint, undoLastPoint } from './logic/scoreEngine';
import { bluetoothListener } from './logic/bluetoothListener';
import { voiceAnnouncer } from './services/voiceAnnouncer';
import { CourtScoreboard } from './components/CourtScoreboard';
import { DiagnosticScreen } from './components/DiagnosticScreen';
import { FlutterExportView } from './components/FlutterExportView';
import { MatchSetupModal } from './components/MatchSetupModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { MatchHistoryModal } from './components/MatchHistoryModal';
import {
  X,
  Play,
  RotateCcw,
  Radio,
  Smartphone,
  Volume2,
  History,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_CONFIG: MatchConfig = {
  sport: 'padel',
  mode: 'singles',
  player1: { name: 'Jugador 1' },
  player2: { name: 'Jugador 2' },
  setsToWin: 2,
  gamesPerSet: 6,
  tiebreakPoints: 7,
  superTiebreak: false,
  padelDeuceRule: 'golden_point',
  tennisDeuceRule: 'advantage',
  pingPongPointsToWin: 11,
  pingPongServeChangePoints: 2,
  initialServer: 1,
};

export default function App() {
  const [matchState, setMatchState] = useState<MatchState>(() =>
    createInitialMatchState(DEFAULT_CONFIG)
  );

  const [currentView, setCurrentView] = useState<'scoreboard' | 'diagnostic' | 'flutter'>('scoreboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Global Bluetooth Remote Action Dispatcher
  const handleBluetoothAction = useCallback(
    (action: 'p1_point' | 'p2_point' | 'undo') => {
      setMatchState((prevState) => {
        if (action === 'p1_point') {
          const { nextState, announcement } = addPoint(prevState, 1);
          if (announcement) voiceAnnouncer.speak(announcement);
          return nextState;
        } else if (action === 'p2_point') {
          const { nextState, announcement } = addPoint(prevState, 2);
          if (announcement) voiceAnnouncer.speak(announcement);
          return nextState;
        } else if (action === 'undo') {
          const { state: restored, announcement } = undoLastPoint(prevState);
          if (announcement) voiceAnnouncer.speak(announcement);
          return restored;
        }
        return prevState;
      });
    },
    []
  );

  useEffect(() => {
    bluetoothListener.setActionHandler(handleBluetoothAction);
    bluetoothListener.start();

    return () => {
      bluetoothListener.stop();
      bluetoothListener.setActionHandler(null);
    };
  }, [handleBluetoothAction]);

  const handleStartNewMatch = (newConfig: MatchConfig) => {
    const freshState = createInitialMatchState(newConfig);
    setMatchState(freshState);
    setCurrentView('scoreboard');
    setIsMenuOpen(false);
  };

  const handleManualUndo = () => {
    const { state: restored, announcement } = undoLastPoint(matchState);
    setMatchState(restored);
    if (announcement) voiceAnnouncer.speak(announcement);
    setIsMenuOpen(false);
  };

  return (
    <div className="w-screen h-screen bg-[#070b12] text-white select-none overflow-hidden flex flex-col">
      {/* Non-scoreboard Views Header with Back Button */}
      {currentView !== 'scoreboard' && (
        <header className="flex items-center justify-between px-4 py-3 bg-[#0b0f17] border-b border-slate-800 shrink-0 z-30">
          <button
            onClick={() => setCurrentView('scoreboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Marcador
          </button>
          <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
            {currentView === 'diagnostic' ? 'Diagnóstico de Control' : 'Proyecto Flutter'}
          </span>
          <div className="w-20" />
        </header>
      )}

      {/* Main Content Views */}
      <main className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
        {currentView === 'scoreboard' && (
          <CourtScoreboard
            state={matchState}
            onStateChange={setMatchState}
            onOpenMenu={() => setIsMenuOpen(true)}
          />
        )}

        {currentView === 'diagnostic' && (
          <div className="flex-1 overflow-y-auto">
            <DiagnosticScreen
              onBackToScoreboard={() => setCurrentView('scoreboard')}
            />
          </div>
        )}

        {currentView === 'flutter' && (
          <div className="flex-1 overflow-y-auto">
            <FlutterExportView />
          </div>
        )}
      </main>

      {/* Options & Settings Slide-Over Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-black text-white">Menú de Opciones</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSetupOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-2xl text-xs font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar Nuevo Partido
                </span>
                <ChevronRight className="w-4 h-4 text-yellow-400/60" />
              </button>

              <button
                onClick={handleManualUndo}
                disabled={matchState.history.length === 0}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition ${
                  matchState.history.length > 0
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-950/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4" />
                  Deshacer Último Punto (Undo)
                </span>
                <span className="text-[10px] text-amber-400/60 font-mono">3 clics BT</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsVoiceOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-xs font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  Configurar Voz y Parlante (Yolanda)
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setCurrentView('diagnostic');
                }}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-xs font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Probar Señales Control Bluetooth
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsHistoryOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-xs font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-sky-400" />
                  Historial de Partidos
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setCurrentView('flutter');
                }}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-xs font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  Descargar Proyecto Flutter / APK
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MatchSetupModal
        currentConfig={matchState.config}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartMatch={handleStartNewMatch}
      />

      <VoiceSettingsModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />

      <MatchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
