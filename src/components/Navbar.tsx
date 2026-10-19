import React from 'react';
import { Radio } from 'lucide-react';

interface NavbarProps {
  currentView: 'scoreboard' | 'diagnostic' | 'flutter';
  onSelectView: (view: 'scoreboard' | 'diagnostic' | 'flutter') => void;
  onOpenSetup: () => void;
  onOpenVoiceSettings: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenSetup,
  onOpenVoiceSettings,
  onOpenHistory,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 bg-[#0b0f17] border-b border-slate-800 shrink-0 z-30 select-none">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onSelectView('scoreboard')}
        className="text-base sm:text-lg font-black tracking-tight text-white hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0 text-left"
      >
        <span className="text-yellow-400">SCORE</span>BT
      </button>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-400 overflow-x-auto py-1">
        <button
          onClick={() => onSelectView('scoreboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'scoreboard' ? 'text-yellow-400 font-bold' : ''
          }`}
        >
          Marcador
        </button>

        <button
          onClick={() => onSelectView('diagnostic')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'diagnostic' ? 'text-yellow-400 font-bold' : ''
          }`}
        >
          Diagnóstico BT
        </button>

        <button
          onClick={() => onSelectView('flutter')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'flutter' ? 'text-yellow-400 font-bold' : ''
          }`}
        >
          Proyecto Flutter
        </button>

        <button
          onClick={onOpenVoiceSettings}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Voz y Parlante
        </button>

        <button
          onClick={onOpenHistory}
          className="hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          Historial
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSetup}
          className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          Nuevo Partido
        </button>
      </div>
    </header>
  );
};
