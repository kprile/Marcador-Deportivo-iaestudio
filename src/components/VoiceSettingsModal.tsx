import React, { useEffect, useState } from 'react';
import { VoiceSettings } from '../types/sports';
import { voiceAnnouncer } from '../services/voiceAnnouncer';
import {
  X,
  Volume2,
  Sparkles,
  Play,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Check,
  Award,
} from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<VoiceSettings>(voiceAnnouncer.getSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(voiceAnnouncer.getSettings());
      setAvailableVoices(voiceAnnouncer.getSpanishVoices());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof VoiceSettings, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    voiceAnnouncer.saveSettings({ [key]: value });
  };

  const handleApplyPreset = (preset: 'referee' | 'tv' | 'calm') => {
    voiceAnnouncer.applyPreset(preset);
    setSettings(voiceAnnouncer.getSettings());
    voiceAnnouncer.testVoice();
  };

  const handleTestVoice = () => {
    voiceAnnouncer.testVoice();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black text-white">Configuración de Voz y Parlante</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Enable Voice Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div>
              <p className="text-sm font-bold text-white">Anuncios por Altavoz Bluetooth</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Emite por voz cada punto, juego, set y cambio de saque
              </p>
            </div>
            <button
              onClick={() => handleChange('enabled', !settings.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Quick Presets for Human Referee Tone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Estilo de Entonación
              </label>
              <span className="text-[11px] text-amber-400 font-medium">Calibrado para sonar natural</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('referee')}
                className="p-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/20 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-300">
                  <Award className="w-3.5 h-3.5" />
                  Árbitro Pro
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Firme, enérgico y seguro</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('tv')}
                className="p-3 rounded-xl border border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Locutor TV
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Dinámico y fluido</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('calm')}
                className="p-3 rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-left transition"
              >
                <div className="text-xs font-bold text-slate-300">
                  Pausado
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Ideal para canchas con eco</p>
              </button>
            </div>
          </div>

          {/* Voice Selector with Natural / Neural Badges */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Voz Sintética del Dispositivo
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">
                {availableVoices.filter((v) => voiceAnnouncer.isHighQualityVoice(v)).length} voces naturales detectadas
              </span>
            </div>

            <select
              value={settings.voiceURI || ''}
              onChange={(e) => handleChange('voiceURI', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="">(Automática) Mejor voz natural disponible</option>
              {availableVoices.map((v) => {
                const isHQ = voiceAnnouncer.isHighQualityVoice(v);
                return (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {isHQ ? '⭐ [Natural / Neuronal] ' : ''}
                    {v.name} ({v.lang})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Speed & Pitch Fine-Tuning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">Velocidad:</span>
                <span className="font-mono font-bold text-yellow-400">{settings.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.02"
                value={settings.rate}
                onChange={(e) => handleChange('rate', parseFloat(e.target.value))}
                className="w-full accent-yellow-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">Tono (Grave / Agudo):</span>
                <span className="font-mono font-bold text-sky-400">{settings.pitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.15"
                step="0.02"
                value={settings.pitch}
                onChange={(e) => handleChange('pitch', parseFloat(e.target.value))}
                className="w-full accent-sky-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Expandable Android / iPhone Natural Voice Activation Guide */}
          <div className="p-4 bg-sky-950/30 border border-sky-800/40 rounded-2xl space-y-2">
            <button
              type="button"
              onClick={() => setShowAndroidGuide(!showAndroidGuide)}
              className="w-full flex items-center justify-between text-left text-xs font-bold text-sky-300 hover:text-sky-200 transition"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-400" />
                ¿Cómo activar voces ultra-realistas gratuitas en Android?
              </span>
              {showAndroidGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAndroidGuide && (
              <div className="pt-2 text-[11px] text-slate-300 space-y-2 border-t border-sky-800/30">
                <p>
                  Por defecto, algunos teléfonos Android tienen instalada la voz comprimida de 2MB (que suena más robótica). Puedes activar la voz neuronal gratuita de Google en 3 pasos:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Ve a <strong>Ajustes de tu teléfono ➔ Accesibilidad ➔ Salida de texto a voz</strong>.</li>
                  <li>Toca el engranaje de configuración junto a <strong>Motor de Servicios de voz de Google</strong>.</li>
                  <li>Selecciona <strong>Instalar datos de voz ➔ Español</strong> y descarga el paquete <strong>Voz ampliada / Calidad alta</strong>.</li>
                </ol>
                <p className="text-emerald-400 text-[10px] mt-1">
                  Al volver a abrir la app, la voz sonará con entonación humana de alta fidelidad.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTestVoice}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              <Play className="w-4 h-4 text-yellow-400 fill-current" />
              Probar Voz en Altavoz
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition"
            >
              Guardar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
