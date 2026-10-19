import React, { useEffect, useState } from 'react';
import { BluetoothSignal } from '../types/sports';
import { bluetoothListener } from '../logic/bluetoothListener';
import { voiceAnnouncer } from '../services/voiceAnnouncer';
import {
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Trash2,
  Keyboard,
  Radio,
  Sparkles,
} from 'lucide-react';

interface DiagnosticScreenProps {
  onBackToScoreboard: () => void;
}

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({ onBackToScoreboard }) => {
  const [signals, setSignals] = useState<BluetoothSignal[]>([]);
  const [doubleClickWindow, setDoubleClickWindow] = useState(bluetoothListener.getConfig().doubleClickWindowMs);
  const [lastActionDetected, setLastActionDetected] = useState<{ text: string; time: number } | null>(null);
  const [testStats, setTestStats] = useState({ p1Count: 0, p2Count: 0, undoCount: 0 });

  useEffect(() => {
    // Subscribe to live bluetooth signals
    const unsubscribe = bluetoothListener.addDiagnosticListener((signal) => {
      setSignals((prev) => [signal, ...prev.slice(0, 35)]);

      if (signal.action === 'p1_point') {
        setTestStats((s) => ({ ...s, p1Count: s.p1Count + 1 }));
        setLastActionDetected({ text: '1 Clic: Punto Jugador 1', time: Date.now() });
        voiceAnnouncer.playCourtBeep(880, 70);
      } else if (signal.action === 'p2_point') {
        setTestStats((s) => ({ ...s, p2Count: s.p2Count + 1 }));
        setLastActionDetected({ text: '2 Clics: Punto Jugador 2', time: Date.now() });
        voiceAnnouncer.playCourtBeep(1100, 100);
      } else if (signal.action === 'undo') {
        setTestStats((s) => ({ ...s, undoCount: s.undoCount + 1 }));
        setLastActionDetected({ text: '3 Clics o Tecla: Deshacer', time: Date.now() });
        voiceAnnouncer.playCourtBeep(440, 120);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setDoubleClickWindow(val);
    bluetoothListener.setDoubleTapWindow(val);
  };

  const handleSimulate = (action: 'p1_point' | 'p2_point' | 'undo') => {
    bluetoothListener.simulateAction(action);
  };

  const clearLogs = () => {
    setSignals([]);
    setTestStats({ p1Count: 0, p2Count: 0, undoCount: 0 });
    setLastActionDetected(null);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Diagnóstico de Control Remoto Bluetooth
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Comprueba las pulsaciones de tu disparador selfie económico o control Bluetooth en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => voiceAnnouncer.testVoice()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
            Probar Altavoz
          </button>
          <button
            onClick={onBackToScoreboard}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-300 rounded-lg shadow-sm transition"
          >
            Volver al Marcador
          </button>
        </div>
      </div>

      {/* Grid: Calibration & Interactive Live Tester */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Interactive Shutter Live Tester */}
        <div className="md:col-span-2 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Probador de Señal en Cancha
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Escuchando señales HID
            </span>
          </div>

          {/* Big Visual Detection Target */}
          <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
            {lastActionDetected && (
              <div className="text-xs font-mono text-slate-400 mb-1">
                Última acción recibida:
              </div>
            )}
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              {lastActionDetected ? lastActionDetected.text : 'Pulsa el botón de tu disparador Bluetooth'}
            </div>
            <p className="text-xs text-slate-500 mt-2 max-w-md">
              (1 pulsación = Jugador 1 | 2 pulsaciones rápidas = Jugador 2 | 3 pulsaciones = Deshacer)
            </p>

            {/* Test statistics counter */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-4 pt-4 border-t border-slate-800/60">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">1 Clic (J1)</p>
                <p className="text-lg font-bold text-yellow-400 tabular-nums">{testStats.p1Count}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">2 Clics (J2)</p>
                <p className="text-lg font-bold text-sky-400 tabular-nums">{testStats.p2Count}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-mono">Deshacer</p>
                <p className="text-lg font-bold text-orange-400 tabular-nums">{testStats.undoCount}</p>
              </div>
            </div>
          </div>

          {/* Quick Simulation Buttons */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Simulador para pruebas sin control físico:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSimulate('p1_point')}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 rounded-lg transition"
              >
                Simular 1 Clic (P1)
              </button>
              <button
                onClick={() => handleSimulate('p2_point')}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-sky-400/10 hover:bg-sky-400/20 text-sky-300 border border-sky-400/30 rounded-lg transition"
              >
                Simular 2 Clics (P2)
              </button>
              <button
                onClick={() => handleSimulate('undo')}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-orange-400/10 hover:bg-orange-400/20 text-orange-300 border border-orange-400/30 rounded-lg transition"
              >
                Simular Deshacer
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Latency Calibration & Remote Notes */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Calibración de Doble Clic
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300">Ventana temporal:</span>
              <span className="font-mono font-bold text-amber-400">{doubleClickWindow} ms</span>
            </div>
            <input
              type="range"
              min="240"
              max="700"
              step="20"
              value={doubleClickWindow}
              onChange={handleSliderChange}
              className="w-full accent-amber-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Más rápido (240ms)</span>
              <span>Más tolerante (700ms)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Compatibilidad probada:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Disparadores selfie tipo AB Shutter 3</li>
              <li>Controles Bluetooth de palo selfie Xiaomi</li>
              <li>Botones de volumen de auriculares Bluetooth</li>
              <li>Mandos Bluetooth estándar (Enter / Espacio)</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-300/90 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Recomendación de pista:
            </p>
            <p className="text-[11px] leading-relaxed">
              Enlaza primero el control remoto selfie al Bluetooth de tu teléfono y luego el parlante. Ambos funcionan en paralelo sin interferencias.
            </p>
          </div>
        </div>
      </div>

      {/* Raw Signal Telemetry Log Table */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Registro de Señales Raw (Captura en Vivo)
            </h2>
          </div>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-750 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar registro
          </button>
        </div>

        {signals.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No se han registrado señales todavía. Presiona un botón en tu control o en el teclado para verlo aquí.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Hora</th>
                  <th className="py-2 px-3">Tecla (key)</th>
                  <th className="py-2 px-3">Código (code)</th>
                  <th className="py-2 px-3">Delta (ms)</th>
                  <th className="py-2 px-3">Acción Reconocida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {signals.map((sig) => (
                  <tr key={sig.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(sig.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-bold text-white">
                      {sig.key === ' ' ? 'Space' : sig.key}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{sig.code}</td>
                    <td className="py-2 px-3 text-slate-400">{sig.deltaMs} ms</td>
                    <td className="py-2 px-3">
                      {sig.action === 'p1_point' && (
                        <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded">
                          +1 Punto Jugador 1
                        </span>
                      )}
                      {sig.action === 'p2_point' && (
                        <span className="text-sky-400 font-bold bg-sky-400/10 px-2 py-0.5 rounded">
                          +1 Punto Jugador 2
                        </span>
                      )}
                      {sig.action === 'undo' && (
                        <span className="text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded">
                          Deshacer Punto
                        </span>
                      )}
                      {sig.action === 'ignored' && (
                        <span className="text-slate-500">Tecla no asignada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
