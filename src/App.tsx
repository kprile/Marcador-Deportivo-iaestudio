import React, { useEffect, useState, useCallback } from 'react';
import { MatchConfig, MatchState } from './types/sports';
import { createInitialMatchState, addPoint, undoLastPoint } from './logic/scoreEngine';
import { bluetoothListener } from './logic/bluetoothListener';
import { voiceAnnouncer } from './services/voiceAnnouncer';
import { Navbar } from './components/Navbar';
import { CourtScoreboard } from './components/CourtScoreboard';
import { DiagnosticScreen } from './components/DiagnosticScreen';
import { FlutterExportView } from './components/FlutterExportView';
import { MatchSetupModal } from './components/MatchSetupModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { MatchHistoryModal } from './components/MatchHistoryModal';

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
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f17] text-white">
      {/* Top Bar Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenSetup={() => setIsSetupOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Content Views */}
      <main className="flex-1 flex flex-col w-full">
        {currentView === 'scoreboard' && (
          <CourtScoreboard
            state={matchState}
            onStateChange={setMatchState}
            onOpenSetup={() => setIsSetupOpen(true)}
            onOpenDiagnostic={() => setCurrentView('diagnostic')}
          />
        )}

        {currentView === 'diagnostic' && (
          <DiagnosticScreen
            onBackToScoreboard={() => setCurrentView('scoreboard')}
          />
        )}

        {currentView === 'flutter' && (
          <FlutterExportView />
        )}
      </main>

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
