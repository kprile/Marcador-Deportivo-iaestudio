import React, { useState } from 'react';
import {
  MatchConfig,
  SportType,
  MatchMode,
  PadelDeuceRule,
} from '../types/sports';
import { voiceAnnouncer } from '../services/voiceAnnouncer';
import {
  X,
  Trophy,
  Users,
  User,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react';

interface MatchSetupModalProps {
  currentConfig: MatchConfig;
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (newConfig: MatchConfig) => void;
}

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  currentConfig,
  isOpen,
  onClose,
  onStartMatch,
}) => {
  const [sport, setSport] = useState<SportType>(currentConfig.sport);
  const [mode, setMode] = useState<MatchMode>(currentConfig.mode);
  const [p1Name, setP1Name] = useState(currentConfig.player1.name);
  const [p1Partner, setP1Partner] = useState(currentConfig.player1.partnerName || '');
  const [p2Name, setP2Name] = useState(currentConfig.player2.name);
  const [p2Partner, setP2Partner] = useState(currentConfig.player2.partnerName || '');
  const [setsToWin, setSetsToWin] = useState(currentConfig.setsToWin);
  const [padelDeuceRule, setPadelDeuceRule] = useState<PadelDeuceRule>(currentConfig.padelDeuceRule);
  const [initialServer, setInitialServer] = useState<1 | 2>(currentConfig.initialServer);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newConfig: MatchConfig = {
      sport,
      mode,
      player1: {
        name: p1Name.trim() || 'Jugador 1',
        partnerName: mode === 'doubles' ? p1Partner.trim() || 'Compañero 1' : undefined,
      },
      player2: {
        name: p2Name.trim() || 'Jugador 2',
        partnerName: mode === 'doubles' ? p2Partner.trim() || 'Compañero 2' : undefined,
      },
      setsToWin,
      gamesPerSet: 6,
      tiebreakPoints: 7,
      superTiebreak: false,
      padelDeuceRule,
      tennisDeuceRule: 'advantage',
      pingPongPointsToWin: 11,
      pingPongServeChangePoints: 2,
      initialServer,
    };

    onStartMatch(newConfig);
    onClose();

    // Voice announcement for match start
    const serverName = initialServer === 1 ? newConfig.player1.name : newConfig.player2.name;
    const sportName = sport === 'padel' ? 'Pádel' : sport === 'tennis' ? 'Tenis' : 'Ping-pong';
    voiceAnnouncer.speak(`Comienza el partido de ${sportName}. Al saque: ${serverName}. ¡A jugar!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black text-white">Configurar Nuevo Partido</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sport Selector */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
              Deporte
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'padel', label: 'Pádel', desc: 'Punto de oro / Sets a 6' },
                  { id: 'tennis', label: 'Tenis', desc: 'Ventajas / Sets a 6' },
                  { id: 'pingpong', label: 'Ping-Pong', desc: 'Sets a 11 puntos' },
                ] as const
              ).map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSport(s.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    sport === s.id
                      ? 'bg-yellow-400/15 border-yellow-400/80 text-white shadow-sm shadow-yellow-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-sm font-bold text-white">{s.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mode: Singles vs Doubles */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
              Modalidad
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('singles')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition ${
                  mode === 'singles'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Individuales (1 vs 1)
              </button>
              <button
                type="button"
                onClick={() => setMode('doubles')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition ${
                  mode === 'doubles'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Dobles / Parejas (2 vs 2)
              </button>
            </div>
          </div>

          {/* Player Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player/Team 1 */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-yellow-400/30 space-y-2">
              <label className="block text-xs font-bold text-yellow-400">
                Lado 1 (Amarillo - 1 Clic BT)
              </label>
              <input
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Nombre Jugador 1"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-yellow-400"
              />
              {mode === 'doubles' && (
                <input
                  type="text"
                  value={p1Partner}
                  onChange={(e) => setP1Partner(e.target.value)}
                  placeholder="Nombre Pareja 1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              )}
            </div>

            {/* Player/Team 2 */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-sky-400/30 space-y-2">
              <label className="block text-xs font-bold text-sky-400">
                Lado 2 (Azul - 2 Clics BT)
              </label>
              <input
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Nombre Jugador 2"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-400"
              />
              {mode === 'doubles' && (
                <input
                  type="text"
                  value={p2Partner}
                  onChange={(e) => setP2Partner(e.target.value)}
                  placeholder="Nombre Pareja 2"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-400"
                />
              )}
            </div>
          </div>

          {/* Rules: Sets & Golden Point */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
                Duración del Partido
              </label>
              <select
                value={setsToWin}
                onChange={(e) => setSetsToWin(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value={1}>1 Solo Set (Rápido)</option>
                <option value={2}>Al mejor de 3 Sets (Gana 2 sets)</option>
                <option value={3}>Al mejor de 5 Sets (Gana 3 sets)</option>
              </select>
            </div>

            {sport === 'padel' && (
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
                  Regla en 40-40 (Pádel)
                </label>
                <select
                  value={padelDeuceRule}
                  onChange={(e) => setPadelDeuceRule(e.target.value as PadelDeuceRule)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="golden_point">Punto de Oro (Golden Point)</option>
                  <option value="advantage">Ventajas Tradicionales (Ad)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 uppercase mb-2">
                Primer Saque
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInitialServer(1)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    initialServer === 1
                      ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Saca Lado 1
                </button>
                <button
                  type="button"
                  onClick={() => setInitialServer(2)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    initialServer === 2
                      ? 'bg-sky-400/20 border-sky-400 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Saca Lado 2
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-sm text-slate-950 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-500/20 transition-all active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              Comenzar Partido en Pista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
