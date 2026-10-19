# Marcador Deportivo Bluetooth (Pádel, Tenis, Ping-Pong) & Proyecto Flutter

Aplicación de marcador deportivo electrónico de alta visibilidad para canchas con soporte para disparadores Bluetooth económicos (tipo selfie), anuncios de voz mediante altavoz Bluetooth en español latinoamericano (tono árbitro oficial), reglas oficiales completas, pantalla de diagnóstico de señales y generador/exportador de código fuente Flutter completo para compilar APKs en Android e iOS.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> 1. **Idioma y Voz:** Español latinoamericano con entonación de árbitro deportivo oficial (*"Quince iguales"*, *"Punto de oro para la pareja receptora"*, *"Cambio de saque"*, *"Juego, set y partido"*).
> 2. **Despliegue y Pruebas:** Doble vía: Aplicación Web PWA interactiva inmediata (instalable en cualquier teléfono Android o iPhone hoy mismo para jugar en cancha con el control selfie) + Suite de exportación de código fuente nativo Flutter (`lib/`, `pubspec.yaml`, `AndroidManifest.xml` y guía de compilación `flutter build apk`).
> 3. **Regla de Pádel en 40-40:** **Punto de oro** (Golden Point sin ventajas sucesivas, con elección de lado de recepción anunciada por voz).

---

### 1. Overview & Core Concept

- **Qué hace:** Convierte cualquier teléfono inteligente en un marcador de pista gigante, legible a más de 10-15 metros, operable a distancia con un botón Bluetooth económico (disparador selfie de 1-2 euros). 
  - **1 pulsación:** Suma punto al Jugador/Equipo 1.
  - **2 pulsaciones rápidas:** Suma punto al Jugador/Equipo 2.
  - **Pulsación larga o botón secundario:** Deshacer último punto (*Undo*).
  - **Altavoz Bluetooth:** Conectado al móvil, anuncia automáticamente cada tanto, cambios de saque, puntos de quiebre (*break point*), puntos de set, puntos de partido y ganadores.
  - **Pantalla encendida permanente (Screen WakeLock):** Evita que el móvil se apague durante el partido.
  - **100% Offline:** Funciona sin internet en cualquier pista o club.
- **Deportes soportados:**
  1. **Pádel:** Juegos a 15, 30, 40, Punto de Oro (*Golden Point*), Sets a 6 con Tie-break a 7 puntos, opción de 1, 3 o 5 sets. Modo Individual y Parejas (Dobles) con seguimiento de sacador/restador.
  2. **Tenis:** Puntuación clásica (15, 30, 40, Ventaja / Deuce o Sin Ventaja), Tie-break a 7, Super Tie-break a 10 puntos en set decisivo, individuales y dobles.
  3. **Ping-Pong (Tenis de Mesa):** Sets a 11 puntos, diferencia obligatoria de 2 puntos, alternancia de servicio cada 2 puntos (o cada 1 punto a partir del 10-10), partidos al mejor de 3, 5 o 7 sets.
- **Público objetivo:** Jugadores aficionados y semiprofesionales de pádel, tenis y ping-pong que juegan sin árbitro y desean tener el tanteo claro, anunciado por voz y sin detener el juego para ir al teléfono.

---

### 2. User Experience & Visual Design

#### Modos de Visualización
1. **Modo Marcador en Cancha (Live Court Scoreboard):**
   - **Contraste Extremo:** Fondo negro puro o azul pista oscuro (`#0B0F17`), con tipografía deportiva condensada masiva en amarillo neón (`#E2F952`) y cian pista (`#38BDF8`), legible bajo sol o iluminación artificial de club.
   - **Táctil Gigante:** Toda la mitad izquierda es la zona táctil del Jugador 1; la mitad derecha es la del Jugador 2. Permite sumar puntos tocando la pantalla si no se usa el botón Bluetooth.
   - **Indicadores de Saque:** Pelota iluminada e icono de servicio animado que indica a qué jugador/pareja le corresponde sacar y desde qué lado.
   - **Barra de Sets & Juegos:** Desglose claro de sets anteriores (ej. `6-4 | 3-6 | 2-1`).
   - **Controles Rápidos Ergonómicos:** Botón "Deshacer" flotante grande, botón de repetición de voz ("Repetir tanteo"), botón de cambio de lado y pausa.

2. **Herramienta de Diagnóstico Bluetooth HID:**
   - Visualizador en tiempo real de eventos de teclado y teclas multimedia (`event.key`, `event.code`, `keyCode`, `gamepad`).
   - Medidor de latencia entre pulsaciones para calibrar el umbral del doble clic (por defecto 380ms - 450ms).
   - Detección automática del modelo de disparador selfie (AB Shutter 3, Xiaomi Selfie, disparadores genéricos iOS/Android que envían `VolumeUp`, `Enter`, o `MediaKey`).
   - Probador de comandos con simulación sonora y visual antes de entrar a la cancha.

3. **Panel de Configuración de Partido y Voz:**
   - Selección de deporte, modalidad (Individual / Dobles), nombres de jugadores/parejas.
   - Selector de voces del sistema (SpeechSynthesis), prueba de audio con altavoz, velocidad y tono de locución.
   - Selector de reglas (Punto de oro vs Ventajas, sets a disputar, número de puntos de tie-break).

4. **Historial de Partidos y Estadísticas:**
   - Registro local (LocalStorage / SQLite) de resultados de partidos, duración, puntos totales por set y fecha.
   - Exportación de resumen de partido para compartir en WhatsApp o redes.

5. **Centro de Exportación de Código Flutter Nativo:**
   - Visualizador y descargador del proyecto Flutter completo estructurado con código Dart limpio, listo para compilar con `flutter build apk` o abrir en Android Studio / VS Code.

---

### 3. Key Product Decisions & Trade-Offs

- **Manejo de Controles Remotos Selfie Económicos:**
  - *Problema técnico:* Los disparadores selfie Bluetooth no son mandos propietarios; son teclados HID Bluetooth estándar que envían una pulsación de tecla (`VolumeUp`, `VolumeDown`, `Enter` o `MediaPlayPause`).
  - *Solución:* Motor de captura global de eventos con debounce y discriminador temporal:
    - 1 pulsación aislada (espera ventana de 400ms): asigna punto a Jugador 1.
    - 2 pulsaciones dentro de la ventana de 400ms: asigna punto a Jugador 2.
    - 3 pulsaciones o pulsación sostenida: Deshacer (*Undo*).
  - *Calibración interactiva:* En la pantalla de diagnóstico el usuario puede probar su control y ajustar la ventana de 250ms a 600ms según el rebote de su botón.
- **Síntesis de Voz Sin Conexión (Offline Audio):**
  - La Web Speech API (`window.speechSynthesis`) en Android (usando el motor Google TTS instalado en el teléfono) y en iOS (Siri TTS) opera **100% sin internet**.
  - No requiere llamadas a APIs de nube durante el partido. El audio sale directamente por el altavoz Bluetooth enlazado al teléfono.
- **Pantalla Siempre Activa:**
  - Integración con la API nativa de navegadores `navigator.wakeLock.request('screen')` para evitar el bloqueo automático de pantalla durante el juego.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Marcador Deportivo Bluetooth                          │
└───────┬───────────────────────────────────┬─────────────────────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────────────────┐    ┌─────────────────────────────────────────┐
│     Entradas de Control      │    │           Motor de Puntuación           │
├──────────────────────────────┤    ├─────────────────────────────────────────┤
│ • Pulsaciones Táctiles       │───►│ • Reglas Pádel (Punto de oro / Sets)    │
│ • Control Remoto Bluetooth   │    │ • Reglas Tenis (Deuce, Adv, Tiebreaks)  │
│   (HID Listener: 1 tap /     │    │ • Reglas Ping-Pong (11 pts, dif 2,      │
│    2 taps / long tap)        │    │   cambio de servicio cada 2 pts)        │
│ • Diagnóstico y Calibración  │    │ • Historial de estados (Undo / Redo)    │
└──────────────────────────────┘    └────────────────────┬────────────────────┘
                                                         │
                         ┌───────────────────────────────┴────────────────────┐
                         ▼                                                    ▼
        ┌───────────────────────────────────┐        ┌──────────────────────────────┐
        │        Salida Visual PWA          │        │       Salida de Audio        │
        ├───────────────────────────────────┤        ├──────────────────────────────┤
        │ • Marcador gigante alta pista     │        │ • Sintetizador de voz TTS    │
        │ • Indicador visual de saque       │        │   (Español latino árbitro)   │
        │ • Modo pantalla completa          │        │ • Salida por Parlante        │
        │ • WakeLock (Pantalla encendida)   │        │   Bluetooth enlazado         │
        └───────────────────────────────────┘        └──────────────────────────────┘
                         │
                         ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │        Exportador de Código Fuente Flutter (Nativo APK)           │
        ├───────────────────────────────────────────────────────────────────┤
        │ • Archivos Dart completos: main.dart, score_engine.dart,          │
        │   bluetooth_key_listener.dart, tts_service.dart, court_view.dart  │
        │ • pubspec.yaml & AndroidManifest.xml listos para compilar         │
        └───────────────────────────────────────────────────────────────────┘
```

#### Estructura de Componentes y Estado
- **`ScoreEngine`:** Máquina de estados desacoplada que calcula puntos, juegos, sets, cambio de saque, desempates y genera las frases fonéticas de arbitraje.
- **`BluetoothShutterListener`:** Controlador de eventos de teclado (`keydown`) y Gamepad con lógica de temporización para 1 vs 2 pulsaciones y cancelación de scroll/volumen nativo del navegador.
- **`AudioAnnouncer`:** Módulo de síntesis de voz (`SpeechSynthesis`) con cola de locuciones prioritarias (ej. Anuncio de punto -> Cambio de saque -> Punto de quiebre).
- **`DiagnosticConsole`:** Monitor visual de pulsaciones recibidas, milisegundos transcurridos, tipo de tecla y prueba de disparo.
- **`FlutterCodeBundle`:** Generador dinámico y descargable en ZIP o visor de código con la implementación Flutter equivalente lista para `flutter run` o `flutter build apk`.

---

### 5. Implementation Steps

1. **Configuración de PWA y Metadatos:** Actualizar `metadata.json`, `index.html` con soporte de pantalla completa, meta tags PWA, iconos y prevención de zoom.
2. **Motor de Reglas Deportivas (`src/logic/scoreEngine.ts`):** Modelado completo y testeado de reglas para Pádel, Tenis y Tenis de Mesa con gestión de saques, puntos de oro y tie-breaks.
3. **Controlador de Pulsaciones Bluetooth (`src/logic/bluetoothListener.ts`):** Escucha de teclas HID de disparadores selfie con buffer temporal de detección de 1 vs 2 pulsaciones y calibración de latencia.
4. **Locutor de Voz (`src/services/voiceAnnouncer.ts`):** Generador de locuciones en español latinoamericano estilo árbitro con integración Web Speech API.
5. **Interfaz de Marcador de Pista (`src/components/CourtScoreboard.tsx`):** Tablero de alto impacto visual, modo táctil a dos bandas, selector de sets y visualizador de sacador.
6. **Pantalla de Diagnóstico Bluetooth (`src/components/DiagnosticScreen.tsx`):** Registro de teclas en tiempo real, calibrador de tiempo de doble pulsación y simulador de control.
7. **Suite de Código Fuente Flutter (`src/components/FlutterExportView.tsx`):** Generador de archivos `.dart` del proyecto completo para Android (APK) e iOS con instrucciones paso a paso.
8. **Pruebas y Verificación de Compilación:** Compilación sin errores (`compile_applet`), pruebas funcionales y reporte al usuario.
