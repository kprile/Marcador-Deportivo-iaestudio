export interface FlutterFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const FLUTTER_PROJECT_FILES: FlutterFile[] = [
  {
    name: 'pubspec.yaml',
    path: 'pubspec.yaml',
    language: 'yaml',
    description: 'Configuración del proyecto Flutter con dependencias de audio TTS, WakeLock y persistencia.',
    content: `name: marcador_deportivo_bt
description: Marcador deportivo Bluetooth para Pádel, Tenis y Ping-Pong con disparador selfie y voz.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_tts: ^4.0.2
  wakelock_plus: ^1.2.8
  shared_preferences: ^2.2.3
  google_fonts: ^6.2.1
  audioplayers: ^6.0.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    name: 'AndroidManifest.xml',
    path: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Manifiesto Android con permisos de pantalla encendida, audio y Bluetooth.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.marcador_deportivo_bt">

    <!-- Permisos para mantener pantalla encendida durante el partido -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <!-- Permiso para salida de audio por altavoces Bluetooth -->
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <application
        android:label="Marcador BT"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`,
  },
  {
    name: 'main.dart',
    path: 'lib/main.dart',
    language: 'dart',
    description: 'Punto de entrada de la app Flutter con inicialización de WakeLock y tema oscuro de cancha.',
    content: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'views/scoreboard_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Mantener la pantalla encendida de forma permanente
  await WakelockPlus.enable();
  
  // Forzar orientación horizontal recomendada para cancha
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
    DeviceOrientation.portraitUp,
  ]);

  runApp(const MarcadorApp());
}

class MarcadorApp extends StatelessWidget {
  const MarcadorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Marcador Deportivo BT',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0B0F17),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFE2F952), // Amarillo neón pista
          secondary: Color(0xFF38BDF8), // Azul cian
          surface: Color(0xFF131B2A),
        ),
      ),
      home: const ScoreboardPage(),
    );
  }
}
`,
  },
  {
    name: 'bluetooth_hid_listener.dart',
    path: 'lib/services/bluetooth_hid_listener.dart',
    language: 'dart',
    description: 'Detector de pulsaciones para controles Bluetooth selfie (1 tap = Jugador 1, 2 taps = Jugador 2, 3 taps = Deshacer).',
    content: `import 'dart:async';
import 'package:flutter/services.dart';

enum ScoreAction { pointP1, pointP2, undo }

class BluetoothHidListener {
  final Function(ScoreAction action) onAction;
  final Function(String keyName, int deltaMs)? onDiagnosticSignal;
  
  int doubleClickWindowMs = 420;
  int _clickCount = 0;
  Timer? _debounceTimer;
  DateTime? _lastPressTime;

  BluetoothHidListener({required this.onAction, this.onDiagnosticSignal});

  void startListening() {
    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

  void stopListening() {
    HardwareKeyboard.instance.removeHandler(_handleKeyEvent);
    _debounceTimer?.cancel();
  }

  bool _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return false;

    final key = event.logicalKey;
    final now = DateTime.now();
    final delta = _lastPressTime != null ? now.difference(_lastPressTime!).inMilliseconds : 0;
    _lastPressTime = now;

    // Detectar si la tecla corresponde a un disparador selfie común
    final isShutterKey = key == LogicalKeyboardKey.audioVolumeUp ||
        key == LogicalKeyboardKey.audioVolumeDown ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space ||
        key == LogicalKeyboardKey.gameButtonA;

    if (!isShutterKey) {
      if (key == LogicalKeyboardKey.keyU || key == LogicalKeyboardKey.backspace) {
        onAction(ScoreAction.undo);
        return true;
      }
      onDiagnosticSignal?.call(key.keyLabel, delta);
      return false;
    }

    onDiagnosticSignal?.call(key.keyLabel, delta);
    _clickCount++;
    _debounceTimer?.cancel();

    // 3 pulsaciones rápidas = Deshacer
    if (_clickCount >= 3) {
      _clickCount = 0;
      onAction(ScoreAction.undo);
      return true;
    }

    // Ventana temporal para discriminar 1 vs 2 pulsaciones
    _debounceTimer = Timer(Duration(milliseconds: doubleClickWindowMs), () {
      final count = _clickCount;
      _clickCount = 0;

      if (count == 1) {
        onAction(ScoreAction.pointP1);
      } else if (count == 2) {
        onAction(ScoreAction.pointP2);
      }
    });

    return true; // Evitar que el sistema cambie el volumen nativo
  }
}
`,
  },
  {
    name: 'tts_service.dart',
    path: 'lib/services/tts_service.dart',
    language: 'dart',
    description: 'Servicio de síntesis de voz en español latinoamericano estilo árbitro oficial.',
    content: `import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  final FlutterTts _tts = FlutterTts();
  bool isEnabled = true;

  TtsService() {
    _initTts();
  }

  Future<void> _initTts() async {
    await _tts.setLanguage("es-419"); // Español Latinoamericano
    await _tts.setSpeechRate(0.52); // Velocidad natural de árbitro
    await _tts.setVolume(1.0);
    await _tts.setPitch(0.98); // Tono ligeramente más grave para sonar humano

    // Intentar seleccionar voz neuronal de alta calidad (Google Network Voice)
    try {
      final List<dynamic>? voices = await _tts.getVoices;
      if (voices != null) {
        for (var voice in voices) {
          final Map<dynamic, dynamic> v = voice as Map<dynamic, dynamic>;
          final String name = (v['name'] ?? '').toString().toLowerCase();
          final String locale = (v['locale'] ?? '').toString().toLowerCase();

          if (locale.startsWith('es') && (name.contains('network') || name.contains('natural') || name.contains('neural'))) {
            await _tts.setVoice({"name": v['name'], "locale": v['locale']});
            break;
          }
        }
      }
    } catch (_) {
      // Usar voz predeterminada del sistema
    }
  }

  Future<void> speak(String text) async {
    if (!isEnabled || text.isEmpty) return;
    await _tts.stop();
    await _tts.speak(text);
  }

  Future<void> testSpeaker() async {
    await speak("Prueba de altavoz Bluetooth. Treinta iguales. Punto de oro para la pareja receptora.");
  }
}
`,
  },
  {
    name: 'score_engine.dart',
    path: 'lib/services/score_engine.dart',
    language: 'dart',
    description: 'Motor de puntuación completo para Pádel (Punto de oro), Tenis y Ping-Pong con historial de deshecho.',
    content: `enum SportType { padel, tennis, pingpong }
enum PadelDeuceRule { goldenPoint, advantage }

class ScoreEngine {
  SportType sport = SportType.padel;
  PadelDeuceRule padelDeuce = PadelDeuceRule.goldenPoint;
  
  int pointsP1 = 0;
  int pointsP2 = 0;
  int gamesP1 = 0;
  int gamesP2 = 0;
  int setsP1 = 0;
  int setsP2 = 0;
  
  int currentServer = 1; // 1 o 2
  bool isTiebreak = false;
  bool isMatchWon = false;
  
  final List<Map<String, dynamic>> _history = [];

  String addPoint(int player) {
    if (isMatchWon) return "Partido finalizado";
    _saveSnapshot();

    if (sport == SportType.pingpong) {
      return _handlePingPongPoint(player);
    } else {
      return _handleRacketPoint(player);
    }
  }

  String _handleRacketPoint(int player) {
    final isP1 = player == 1;
    if (isP1) pointsP1++; else pointsP2++;

    // Lógica Punto de Oro en Pádel
    if (padelDeuce == PadelDeuceRule.goldenPoint && pointsP1 >= 4 && pointsP2 >= 3) {
      return _winGame(player);
    }
    if (padelDeuce == PadelDeuceRule.goldenPoint && pointsP2 >= 4 && pointsP1 >= 3) {
      return _winGame(player);
    }

    // Puntos normales 0, 15, 30, 40
    if (pointsP1 >= 4 && pointsP1 - pointsP2 >= 2) return _winGame(1);
    if (pointsP2 >= 4 && pointsP2 - pointsP1 >= 2) return _winGame(2);

    if (pointsP1 == 3 && pointsP2 == 3 && padelDeuce == PadelDeuceRule.goldenPoint) {
      return "Cuarenta iguales. ¡Punto de oro!";
    }

    return "\${_formatRacketPoint(pointsP1)} a \${_formatRacketPoint(pointsP2)}";
  }

  String _handlePingPongPoint(int player) {
    if (player == 1) pointsP1++; else pointsP2++;
    
    // Cambio de saque cada 2 puntos
    if ((pointsP1 + pointsP2) % 2 == 0) {
      currentServer = currentServer == 1 ? 2 : 1;
    }

    if ((pointsP1 >= 11 || pointsP2 >= 11) && (pointsP1 - pointsP2).abs() >= 2) {
      final winner = pointsP1 > pointsP2 ? 1 : 2;
      pointsP1 = 0; pointsP2 = 0;
      if (winner == 1) setsP1++; else setsP2++;
      return "Set para Jugador \$winner. Sets: \$setsP1 a \$setsP2";
    }

    return "\$pointsP1 a \$pointsP2. Saca Jugador \$currentServer";
  }

  String _winGame(int player) {
    pointsP1 = 0;
    pointsP2 = 0;
    if (player == 1) gamesP1++; else gamesP2++;
    currentServer = currentServer == 1 ? 2 : 1;

    if (gamesP1 >= 6 && gamesP1 - gamesP2 >= 2) {
      setsP1++; gamesP1 = 0; gamesP2 = 0;
      return "Set para Jugador 1. Sets: \$setsP1 a \$setsP2";
    }
    if (gamesP2 >= 6 && gamesP2 - gamesP1 >= 2) {
      setsP2++; gamesP1 = 0; gamesP2 = 0;
      return "Set para Jugador 2. Sets: \$setsP1 a \$setsP2";
    }

    return "Juego para Jugador \$player. Juegos: \$gamesP1 a \$gamesP2. Saca Jugador \$currentServer";
  }

  String _formatRacketPoint(int pts) {
    if (pts == 0) return "Cero";
    if (pts == 1) return "15";
    if (pts == 2) return "30";
    if (pts == 3) return "40";
    return "AD";
  }

  void _saveSnapshot() {
    _history.add({
      'p1': pointsP1, 'p2': pointsP2,
      'g1': gamesP1, 'g2': gamesP2,
      's1': setsP1, 's2': setsP2,
      'srv': currentServer,
    });
  }

  String undo() {
    if (_history.isEmpty) return "No hay puntos para deshacer";
    final last = _history.removeLast();
    pointsP1 = last['p1']; pointsP2 = last['p2'];
    gamesP1 = last['g1']; gamesP2 = last['g2'];
    setsP1 = last['s1']; setsP2 = last['s2'];
    currentServer = last['srv'];
    return "Punto corregido: \${_formatRacketPoint(pointsP1)} a \${_formatRacketPoint(pointsP2)}";
  }
}
`,
  },
  {
    name: 'scoreboard_page.dart',
    path: 'lib/views/scoreboard_page.dart',
    language: 'dart',
    description: 'Vista principal del marcador gigante para pista con soporte táctil y botón de deshacer.',
    content: `import 'package:flutter/material.dart';
import '../services/score_engine.dart';
import '../services/tts_service.dart';
import '../services/bluetooth_hid_listener.dart';

class ScoreboardPage extends StatefulWidget {
  const ScoreboardPage({super.key});

  @override
  State<ScoreboardPage> createState() => _ScoreboardPageState();
}

class _ScoreboardPageState extends State<ScoreboardPage> {
  final ScoreEngine _engine = ScoreEngine();
  final TtsService _tts = TtsService();
  late BluetoothHidListener _btListener;

  @override
  void initState() {
    super.initState();
    _btListener = BluetoothHidListener(
      onAction: (action) {
        if (action == ScoreAction.pointP1) {
          _scorePoint(1);
        } else if (action == ScoreAction.pointP2) {
          _scorePoint(2);
        } else if (action == ScoreAction.undo) {
          _undoPoint();
        }
      },
    );
    _btListener.startListening();
  }

  @override
  void dispose() {
    _btListener.stopListening();
    super.dispose();
  }

  void _scorePoint(int player) {
    final speech = _engine.addPoint(player);
    setState(() {});
    _tts.speak(speech);
  }

  void _undoPoint() {
    final speech = _engine.undo();
    setState(() {});
    _tts.speak(speech);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Barra superior de Sets y Juegos
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: const Color(0xFF131B2A),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("PÁDEL · PUNTO DE ORO", style: TextStyle(color: Colors.grey[400], fontWeight: FontWeight.bold)),
                  Text("SETS: \${_engine.setsP1} - \${_engine.setsP2}  |  JUEGOS: \${_engine.gamesP1} - \${_engine.gamesP2}",
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.undo, color: Colors.orangeAccent),
                    onPressed: _undoPoint,
                    tooltip: "Deshacer punto",
                  ),
                ],
              ),
            ),
            
            // División vertical: Jugador 1 a la izquierda y Jugador 2 a la derecha
            Expanded(
              child: Row(
                children: [
                  // Lado izquierdo: Jugador 1
                  Expanded(
                    child: InkWell(
                      onTap: () => _scorePoint(1),
                      child: Container(
                        color: const Color(0xFF0F172A),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                children: [
                                  Text("JUGADOR 1", style: TextStyle(color: Colors.grey[400], fontSize: 16, fontWeight: FontWeight.w600)),
                                  if (_engine.currentServer == 1)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: Chip(avatar: Icon(Icons.sports_tennis, size: 14), label: Text("SAQUE", style: TextStyle(fontSize: 10))),
                                    ),
                                ],
                              ),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text("\${_engine.pointsP1}", style: const TextStyle(fontSize: 120, fontWeight: FontWeight.w900, color: Color(0xFFE2F952))),
                              ),
                              Text("SETS: \${_engine.setsP1} | JUEGOS: \${_engine.gamesP1}",
                                  style: TextStyle(color: Colors.grey[400], fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Línea vertical divisoria en el centro
                  Container(
                    width: 3,
                    color: Colors.grey[700],
                    child: const Center(
                      child: Text("VS", style: TextStyle(fontSize: 9, color: Colors.white70, fontWeight: FontWeight.bold)),
                    ),
                  ),

                  // Lado derecho: Jugador 2
                  Expanded(
                    child: InkWell(
                      onTap: () => _scorePoint(2),
                      child: Container(
                        color: const Color(0xFF090D14),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                children: [
                                  Text("JUGADOR 2", style: TextStyle(color: Colors.grey[400], fontSize: 16, fontWeight: FontWeight.w600)),
                                  if (_engine.currentServer == 2)
                                    const Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: Chip(avatar: Icon(Icons.sports_tennis, size: 14), label: Text("SAQUE", style: TextStyle(fontSize: 10))),
                                    ),
                                ],
                              ),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text("\${_engine.pointsP2}", style: const TextStyle(fontSize: 120, fontWeight: FontWeight.w900, color: Color(0xFF38BDF8))),
                              ),
                              Text("SETS: \${_engine.setsP2} | JUEGOS: \${_engine.gamesP2}",
                                  style: TextStyle(color: Colors.grey[400], fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`,
  },
  {
    name: 'README_BUILD_APK.md',
    path: 'README_BUILD_APK.md',
    language: 'markdown',
    description: 'Guía paso a paso para compilar e instalar el archivo APK en teléfonos Android físicos.',
    content: `# Instrucciones para compilar el APK de Marcador Deportivo Bluetooth

## Requisitos previos
1. Tener instalado Flutter SDK (\`flutter --version\` >= 3.0.0).
2. Tener instalado Android Studio con el Android SDK y Command-line Tools.

## Pasos para generar el APK:

\`\`\`bash
# 1. Crear el proyecto Flutter
flutter create marcador_deportivo_bt
cd marcador_deportivo_bt

# 2. Reemplazar los archivos con el código proporcionado
# (pubspec.yaml, lib/main.dart, lib/services/..., AndroidManifest.xml)

# 3. Descargar las dependencias
flutter pub get

# 4. Compilar el APK en modo Release
flutter build apk --release

# El APK generado se encontrará en:
# build/app/outputs/flutter-apk/app-release.apk
\`\`\`

## Instalación directa en tu teléfono Android:
1. Conecta el teléfono a tu ordenador mediante cable USB.
2. Activa la **Depuración por USB** en las opciones de desarrollador de tu teléfono.
3. Ejecuta en la terminal:
\`\`\`bash
flutter install
\`\`\`
¡Listo! La aplicación se instalará en tu teléfono y podrás usarla inmediatamente con tu control Bluetooth selfie y tu parlante.
`,
  },
  {
    name: 'build_apk.yml',
    path: '.github/workflows/build_apk.yml',
    language: 'yaml',
    description: 'Flujo de GitHub Actions para compilar el APK automáticamente en la nube sin instalar nada en tu PC.',
    content: `name: Compilar APK Flutter en la nube

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configurar Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          
      - name: Configurar Flutter SDK
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.x'
          channel: 'stable'
          
      - name: Descargar dependencias
        run: flutter pub get
        
      - name: Compilar APK Release
        run: flutter build apk --release
        
      - name: Subir APK compilado para descarga
        uses: actions/upload-artifact@v4
        with:
          name: marcador-deportivo-apk
          path: build/app/outputs/flutter-apk/app-release.apk
`,
  },
];
