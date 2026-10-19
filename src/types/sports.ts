export type SportType = 'padel' | 'tennis' | 'pingpong';
export type MatchMode = 'singles' | 'doubles';
export type PadelDeuceRule = 'golden_point' | 'advantage';
export type TennisDeuceRule = 'advantage' | 'no_ad';

export interface PlayerInfo {
  name: string;
  partnerName?: string;
}

export interface MatchConfig {
  sport: SportType;
  mode: MatchMode;
  player1: PlayerInfo;
  player2: PlayerInfo;
  setsToWin: number; // e.g. 2 (best of 3), 1 (single set), 3 (best of 5)
  gamesPerSet: number; // usually 6 for tennis/padel
  tiebreakPoints: number; // 7
  superTiebreak: boolean; // 10 pts for final set in tennis
  padelDeuceRule: PadelDeuceRule;
  tennisDeuceRule: TennisDeuceRule;
  pingPongPointsToWin: number; // 11
  pingPongServeChangePoints: number; // 2 (or 1 at 10-10)
  initialServer: 1 | 2;
}

export type TennisScorePoint = '0' | '15' | '30' | '40' | 'AD';

export interface SetScore {
  setNumber: number;
  gamesP1: number;
  gamesP2: number;
  tiebreakP1?: number;
  tiebreakP2?: number;
  winner?: 1 | 2;
}

export interface PointEvent {
  scorer: 1 | 2;
  timestamp: number;
  description: string;
  spokenText: string;
}

export interface MatchState {
  config: MatchConfig;
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  currentSetIndex: number;
  sets: SetScore[];
  // Current game score:
  pointsP1: number; // For ping-pong: actual points. For tennis/padel: 0, 1, 2, 3, 4 (AD)
  pointsP2: number;
  displayScoreP1: string; // '0', '15', '30', '40', 'AD', or ping-pong integer
  displayScoreP2: string;
  isTiebreak: boolean;
  isSuperTiebreak: boolean;
  currentServer: 1 | 2;
  serverSide: 'deuce' | 'ad'; // Right (deuce) or Left (ad) side
  serveNumberInTurn: number; // Ping-pong 1st or 2nd serve of current block
  isGoldenPoint: boolean;
  isBreakPoint: boolean;
  isSetPoint: boolean;
  isMatchPoint: boolean;
  winner?: 1 | 2;
  history: PointHistorySnapshot[];
  startTime: number;
  endTime?: number;
}

export interface PointHistorySnapshot {
  pointsP1: number;
  pointsP2: number;
  displayScoreP1: string;
  displayScoreP2: string;
  currentSetIndex: number;
  sets: SetScore[];
  isTiebreak: boolean;
  currentServer: 1 | 2;
  serverSide: 'deuce' | 'ad';
  serveNumberInTurn: number;
  status: MatchState['status'];
  winner?: 1 | 2;
  lastAnnouncement: string;
  timestamp: number;
}

export interface BluetoothSignal {
  id: string;
  key: string;
  code: string;
  timestamp: number;
  deltaMs: number;
  action: 'p1_point' | 'p2_point' | 'undo' | 'ignored';
  source: 'keyboard' | 'gamepad' | 'touch';
}

export interface VoiceSettings {
  enabled: boolean;
  rate: number; // 0.8 - 1.2
  pitch: number; // 0.8 - 1.2
  volume: number; // 0.0 - 1.0
  voiceURI: string | null;
  announcePoints: boolean;
  announceServerChange: boolean;
  announceGameAndSet: boolean;
  announceSituations: boolean; // "Punto de oro", "Punto de quiebre", "Punto de set"
}

export interface SavedMatchRecord {
  id: string;
  date: string;
  sport: SportType;
  mode: MatchMode;
  player1: string;
  player2: string;
  durationMinutes: number;
  setsSummary: string; // e.g. "6-4, 3-6, 7-6"
  winner: 1 | 2;
  winnerName: string;
  totalPointsP1: number;
  totalPointsP2: number;
}
