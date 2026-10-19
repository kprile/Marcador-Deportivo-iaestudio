import React, { useState } from 'react';
import JSZip from 'jszip';
import { FLUTTER_PROJECT_FILES, FlutterFile } from '../data/flutterProjectFiles';
import {
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Smartphone,
  AlertCircle,
  FileCode,
  FolderGit2,
  Package,
  Layers,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const FlutterExportView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(FLUTTER_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZipBundle = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file to its exact relative path inside the zip
      FLUTTER_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Generate the zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'marcador_deportivo_bluetooth_flutter.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 3000);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Descarga y Compilación del APK (Flutter Nativo)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Descarga el proyecto completo en ZIP o instálalo inmediatamente en tu teléfono Android.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar Archivo'}
          </button>

          <button
            onClick={handleDownloadZipBundle}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 rounded-lg shadow-lg shadow-yellow-500/20 transition active:scale-95"
          >
            <Package className="w-4 h-4 fill-current" />
            {isZipping ? 'Empaquetando...' : zipDownloaded ? '¡ZIP Descargado!' : 'Descargar Proyecto Completo (.ZIP)'}
          </button>
        </div>
      </div>

      {/* Guide Cards: 3 Ways to Run / Build APK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Option 1: Instant PWA Install on Android (No compilation needed) */}
        <div className="p-4 bg-emerald-950/40 border border-emerald-600/40 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Opción 1: Instalar en 3 Segundos
          </div>
          <h3 className="text-sm font-black text-white">Instalación Directa en Android (WebAPK)</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Abre la app en <strong>Google Chrome en tu móvil Android</strong> y pulsa en los 3 puntos superiores ➔ <strong>&quot;Instalar aplicación&quot;</strong>.
          </p>
          <p className="text-[11px] text-emerald-300/80">
            Se instala como app independiente con icono en tu escritorio, pantalla completa, WakeLock y detección de disparador Bluetooth sin compilar nada.
          </p>
        </div>

        {/* Option 2: Cloud APK via GitHub Actions */}
        <div className="p-4 bg-sky-950/40 border border-sky-600/40 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            Opción 2: Compilar APK en la Nube
          </div>
          <h3 className="text-sm font-black text-white">Compilar APK Gratis en GitHub</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Descarga el <strong>.ZIP</strong> y súbelo a un repositorio de GitHub. El archivo <code>.github/workflows/build_apk.yml</code> incluido compilará automáticamente el archivo <code>app-release.apk</code> en los servidores de GitHub.
          </p>
          <p className="text-[11px] text-sky-300/80">
            Listo para descargar el APK compilado directamente en tu móvil desde la pestaña &quot;Actions&quot;.
          </p>
        </div>

        {/* Option 3: Local Flutter SDK */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            Opción 3: Compilar en tu PC
          </div>
          <h3 className="text-sm font-black text-white">Con Flutter SDK en tu PC</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Descomprime el ZIP en tu carpeta de proyectos y ejecuta en la terminal:
          </p>
          <div className="p-2 bg-slate-950 rounded text-emerald-400 font-mono text-[11px]">
            flutter build apk --release
          </div>
          <p className="text-[11px] text-slate-400">
            Encontrarás el APK en <code>build/app/outputs/flutter-apk/app-release.apk</code>.
          </p>
        </div>
      </div>

      {/* Main Code Workspace: File Explorer + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: File List */}
        <div className="lg:col-span-1 p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
          <div className="px-3 py-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
              Archivos ({FLUTTER_PROJECT_FILES.length})
            </span>
          </div>

          {FLUTTER_PROJECT_FILES.map((file) => {
            const isSelected = selectedFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">{file.language}</span>
              </button>
            );
          })}

          <div className="pt-2">
            <button
              onClick={handleDownloadZipBundle}
              disabled={isZipping}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Todo en ZIP
            </button>
          </div>
        </div>

        {/* Code Content Box */}
        <div className="lg:col-span-3 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* File Tab Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 font-mono text-slate-300">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span className="text-slate-500">ruta:</span>
              <span className="font-bold text-white">{selectedFile.path}</span>
            </div>
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1 text-slate-400 hover:text-sky-300 text-[11px] transition"
            >
              <Download className="w-3 h-3" />
              Descargar este archivo
            </button>
          </div>

          {/* Code Viewer */}
          <div className="p-4 bg-[#070b12] overflow-x-auto max-h-[560px]">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
