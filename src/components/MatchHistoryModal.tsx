import React, { useEffect, useState } from 'react';
import { SavedMatchRecord } from '../types/sports';
import { getSavedMatches, deleteMatchRecord, clearAllMatches } from '../services/matchStorage';
import {
  X,
  History,
  Trophy,
  Trash2,
  Calendar,
  Clock,
  Share2,
} from 'lucide-react';

interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({ isOpen, onClose }) => {
  const [matches, setMatches] = useState<SavedMatchRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMatches(getSavedMatches());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    deleteMatchRecord(id);
    setMatches(getSavedMatches());
  };

  const handleClear = () => {
    if (window.confirm('¿Seguro que deseas borrar todo el historial de partidos?')) {
      clearAllMatches();
      setMatches([]);
    }
  };

  const handleShare = (match: SavedMatchRecord) => {
    const text = `🎾 Resultado del partido (${match.sport.toUpperCase()}):\n${match.player1} vs ${match.player2}\nResultado: ${match.setsSummary}\nGanador: ${match.winnerName} 🏆`;
    navigator.clipboard.writeText(text);
    setCopiedId(match.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black text-white">Historial de Partidos</h2>
          </div>
          <div className="flex items-center gap-2">
            {matches.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/40 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vaciar historial
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Matches list */}
        {matches.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Aún no hay partidos registrados</p>
            <p className="text-xs text-slate-500">
              Al finalizar un partido en el marcador, su resultado y sets se guardarán automáticamente aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {matches.map((match) => (
              <div
                key={match.id}
                className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-yellow-400 uppercase tracking-wider text-[11px]">
                      {match.sport}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {match.date}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {match.durationMinutes} min
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShare(match)}
                      className="p-1.5 text-slate-400 hover:text-sky-400 rounded-md hover:bg-slate-800 transition"
                      title="Copiar resumen para WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md hover:bg-slate-800 transition"
                      title="Eliminar partido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className={`text-sm font-bold ${match.winner === 1 ? 'text-yellow-400' : 'text-slate-300'}`}>
                      {match.player1} {match.winner === 1 && '🏆'}
                    </p>
                    <p className={`text-sm font-bold ${match.winner === 2 ? 'text-sky-400' : 'text-slate-300'}`}>
                      {match.player2} {match.winner === 2 && '🏆'}
                    </p>
                  </div>

                  <div className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Sets</p>
                    <p className="text-sm font-black font-mono text-white tracking-wider">
                      {match.setsSummary}
                    </p>
                  </div>
                </div>

                {copiedId === match.id && (
                  <p className="text-[11px] text-emerald-400 font-mono text-center bg-emerald-950/60 py-1 rounded">
                    ¡Copiado al portapapeles listo para compartir!
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
