import {
  MatchConfig,
  MatchState,
  PointHistorySnapshot,
  SetScore,
  SportType,
} from '../types/sports';

const TENNIS_POINTS = ['0', '15', '30', '40'];

export function createInitialMatchState(config: MatchConfig): MatchState {
  return {
    config,
    status: 'in_progress',
    currentSetIndex: 0,
    sets: [
      {
        setNumber: 1,
        gamesP1: 0,
        gamesP2: 0,
      },
    ],
    pointsP1: 0,
    pointsP2: 0,
    displayScoreP1: '0',
    displayScoreP2: '0',
    isTiebreak: false,
    isSuperTiebreak: false,
    currentServer: config.initialServer,
    serverSide: 'deuce',
    serveNumberInTurn: 1,
    isGoldenPoint: false,
    isBreakPoint: false,
    isSetPoint: false,
    isMatchPoint: false,
    history: [],
    startTime: Date.now(),
  };
}

export interface PointResult {
  nextState: MatchState;
  announcement: string;
}

export function addPoint(state: MatchState, scorer: 1 | 2): PointResult {
  if (state.status === 'completed') {
    return {
      nextState: state,
      announcement: `El partido ya finalizó. Ganador: ${getWinnerName(state)}`,
    };
  }

  // Create snapshot for undo
  const currentSnapshot: PointHistorySnapshot = {
    pointsP1: state.pointsP1,
    pointsP2: state.pointsP2,
    displayScoreP1: state.displayScoreP1,
    displayScoreP2: state.displayScoreP2,
    currentSetIndex: state.currentSetIndex,
    sets: JSON.parse(JSON.stringify(state.sets)),
    isTiebreak: state.isTiebreak,
    currentServer: state.currentServer,
    serverSide: state.serverSide,
    serveNumberInTurn: state.serveNumberInTurn,
    status: state.status,
    winner: state.winner,
    lastAnnouncement: '',
    timestamp: Date.now(),
  };

  const nextState: MatchState = {
    ...state,
    sets: JSON.parse(JSON.stringify(state.sets)),
    history: [...state.history, currentSnapshot],
  };

  if (state.config.sport === 'pingpong') {
    return handlePingPongPoint(nextState, scorer);
  } else {
    return handleRacketPoint(nextState, scorer);
  }
}

export function undoLastPoint(state: MatchState): { state: MatchState; announcement: string } {
  if (state.history.length === 0) {
    return {
      state,
      announcement: 'No hay más puntos para deshacer.',
    };
  }

  const previousSnapshot = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  const restoredState: MatchState = {
    ...state,
    pointsP1: previousSnapshot.pointsP1,
    pointsP2: previousSnapshot.pointsP2,
    displayScoreP1: previousSnapshot.displayScoreP1,
    displayScoreP2: previousSnapshot.displayScoreP2,
    currentSetIndex: previousSnapshot.currentSetIndex,
    sets: JSON.parse(JSON.stringify(previousSnapshot.sets)),
    isTiebreak: previousSnapshot.isTiebreak,
    currentServer: previousSnapshot.currentServer,
    serverSide: previousSnapshot.serverSide,
    serveNumberInTurn: previousSnapshot.serveNumberInTurn,
    status: previousSnapshot.status,
    winner: previousSnapshot.winner,
    history: newHistory,
  };

  updateSituationFlags(restoredState);

  const scoreText = formatScoreAnnouncement(restoredState);
  return {
    state: restoredState,
    announcement: `Punto corregido. ${scoreText}`,
  };
}

/**
 * Handle Ping-Pong / Table Tennis Point
 */
function handlePingPongPoint(state: MatchState, scorer: 1 | 2): PointResult {
  if (scorer === 1) {
    state.pointsP1 += 1;
  } else {
    state.pointsP2 += 1;
  }

  state.displayScoreP1 = state.pointsP1.toString();
  state.displayScoreP2 = state.pointsP2.toString();

  const p1 = state.pointsP1;
  const p2 = state.pointsP2;
  const target = state.config.pingPongPointsToWin; // 11
  const isDeuce = p1 >= target - 1 && p2 >= target - 1; // 10-10 or more

  // Check if set is won
  if ((p1 >= target || p2 >= target) && Math.abs(p1 - p2) >= 2) {
    const setWinner = p1 > p2 ? 1 : 2;
    const currentSet = state.sets[state.currentSetIndex];
    if (setWinner === 1) {
      currentSet.gamesP1 += 1;
    } else {
      currentSet.gamesP2 += 1;
    }
    currentSet.winner = setWinner;

    const winnerName = getPlayerDisplayName(state.config, setWinner);
    const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
    const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;

    // Check if match won
    if (setsWonP1 === state.config.setsToWin || setsWonP2 === state.config.setsToWin) {
      state.status = 'completed';
      state.winner = setsWonP1 === state.config.setsToWin ? 1 : 2;
      state.endTime = Date.now();
      const matchWinnerName = getPlayerDisplayName(state.config, state.winner);
      const announcement = `¡Set y partido para ${matchWinnerName}! Marcador final en sets: ${setsWonP1} a ${setsWonP2}.`;
      return { nextState: state, announcement };
    }

    // Advance to next set
    state.currentSetIndex += 1;
    state.sets.push({
      setNumber: state.currentSetIndex + 1,
      gamesP1: 0,
      gamesP2: 0,
    });
    state.pointsP1 = 0;
    state.pointsP2 = 0;
    state.displayScoreP1 = '0';
    state.displayScoreP2 = '0';
    // Switch server for next set
    state.currentServer = state.currentServer === 1 ? 2 : 1;
    state.serveNumberInTurn = 1;

    updateSituationFlags(state);
    const serverName = getPlayerDisplayName(state.config, state.currentServer);
    const announcement = `Set para ${winnerName}, ${p1} a ${p2}. Sets: ${setsWonP1} a ${setsWonP2}. Comienza el siguiente set. Saca ${serverName}.`;
    return { nextState: state, announcement };
  }

  // Update server in Ping-Pong
  // If at least 10-10: serve changes every 1 point.
  // Otherwise: serve changes every 2 points.
  const totalPoints = p1 + p2;
  if (isDeuce) {
    state.currentServer = (state.currentServer === 1 ? 2 : 1);
  } else {
    // Every 2 points, switch
    const totalServesDone = totalPoints;
    const initial = state.config.initialServer;
    const isFirstServer = Math.floor(totalServesDone / 2) % 2 === 0;
    state.currentServer = isFirstServer ? initial : (initial === 1 ? 2 : 1);
  }

  updateSituationFlags(state);

  // Build announcement
  let announcement = '';
  const serverName = getPlayerDisplayName(state.config, state.currentServer);

  if (p1 === p2) {
    if (p1 >= 10) {
      announcement = `Diez iguales. Saque de ${serverName}.`;
    } else {
      announcement = `${p1} iguales. Saca ${serverName}.`;
    }
  } else {
    const leaderScore = state.currentServer === 1 ? `${p1} a ${p2}` : `${p2} a ${p1}`;
    announcement = `${leaderScore}. Saca ${serverName}.`;
  }

  if (state.isMatchPoint) {
    announcement += ' ¡Punto de partido!';
  } else if (state.isSetPoint) {
    announcement += ' Punto de set.';
  }

  return { nextState: state, announcement };
}

/**
 * Handle Padel / Tennis Point
 */
function handleRacketPoint(state: MatchState, scorer: 1 | 2): PointResult {
  const currentSet = state.sets[state.currentSetIndex];

  // If currently playing a Tie-break
  if (state.isTiebreak) {
    return handleTiebreakPoint(state, scorer);
  }

  // Normal game logic
  const p1 = state.pointsP1;
  const p2 = state.pointsP2;
  const isPadel = state.config.sport === 'padel';
  const useGoldenPoint = isPadel ? state.config.padelDeuceRule === 'golden_point' : state.config.tennisDeuceRule === 'no_ad';

  // Check game-winning conditions
  if (useGoldenPoint) {
    // 40-40 Golden Point rule
    if (p1 === 3 && p2 === 3) {
      // Golden point in progress! Next scorer wins game!
      return winGame(state, scorer);
    }

    if (scorer === 1) {
      if (p1 === 3) {
        return winGame(state, 1);
      }
      state.pointsP1 += 1;
    } else {
      if (p2 === 3) {
        return winGame(state, 2);
      }
      state.pointsP2 += 1;
    }
  } else {
    // Traditional Advantage rule (Deuce / Ad)
    if (scorer === 1) {
      if (p1 === 3 && p2 < 3) {
        return winGame(state, 1);
      } else if (p1 === 3 && p2 === 3) {
        state.pointsP1 = 4; // Advantage P1
      } else if (p1 === 4 && p2 === 3) {
        return winGame(state, 1);
      } else if (p1 === 3 && p2 === 4) {
        state.pointsP2 = 3; // Back to Deuce
      } else {
        state.pointsP1 += 1;
      }
    } else {
      if (p2 === 3 && p1 < 3) {
        return winGame(state, 2);
      } else if (p2 === 3 && p1 === 3) {
        state.pointsP2 = 4; // Advantage P2
      } else if (p2 === 4 && p1 === 3) {
        return winGame(state, 2);
      } else if (p2 === 3 && p1 === 4) {
        state.pointsP1 = 3; // Back to Deuce
      } else {
        state.pointsP2 += 1;
      }
    }
  }

  // Map display scores
  state.displayScoreP1 = formatRacketDisplayScore(state.pointsP1);
  state.displayScoreP2 = formatRacketDisplayScore(state.pointsP2);

  // Alternate server side: Point 1 starts at Deuce (right), each point flips
  state.serverSide = state.serverSide === 'deuce' ? 'ad' : 'deuce';

  updateSituationFlags(state);

  const announcement = buildRacketPointAnnouncement(state, scorer);
  return { nextState: state, announcement };
}

function handleTiebreakPoint(state: MatchState, scorer: 1 | 2): PointResult {
  const currentSet = state.sets[state.currentSetIndex];
  if (!currentSet.tiebreakP1) currentSet.tiebreakP1 = 0;
  if (!currentSet.tiebreakP2) currentSet.tiebreakP2 = 0;

  if (scorer === 1) {
    currentSet.tiebreakP1 += 1;
  } else {
    currentSet.tiebreakP2 += 1;
  }

  const tb1 = currentSet.tiebreakP1;
  const tb2 = currentSet.tiebreakP2;
  state.displayScoreP1 = tb1.toString();
  state.displayScoreP2 = tb2.toString();

  const target = state.isSuperTiebreak ? 10 : state.config.tiebreakPoints; // 7 or 10

  // Check if tiebreak won
  if ((tb1 >= target || tb2 >= target) && Math.abs(tb1 - tb2) >= 2) {
    const tbWinner = tb1 > tb2 ? 1 : 2;
    if (tbWinner === 1) {
      currentSet.gamesP1 += 1;
    } else {
      currentSet.gamesP2 += 1;
    }
    currentSet.winner = tbWinner;
    return checkSetWinOrNext(state, tbWinner, true);
  }

  // Server alternation in Tie-break:
  // Point 1: Player A serves 1 point.
  // Then Player B serves 2 points, Player A serves 2 points, etc.
  const totalTbPoints = tb1 + tb2;
  const initialTbServer = state.currentServer;
  if (totalTbPoints % 2 === 1) {
    state.currentServer = state.currentServer === 1 ? 2 : 1;
  }
  // Change side every 6 points
  const changeSides = totalTbPoints % 6 === 0;

  updateSituationFlags(state);

  let announcement = `${tb1} a ${tb2}`;
  if (tb1 === tb2) {
    announcement = `${tb1} iguales`;
  }
  if (changeSides) {
    announcement += '. Cambio de lado';
  }
  if (state.isMatchPoint) {
    announcement += '. ¡Punto de partido!';
  } else if (state.isSetPoint) {
    announcement += '. Punto de set.';
  }

  return { nextState: state, announcement };
}

function winGame(state: MatchState, gameWinner: 1 | 2): PointResult {
  const currentSet = state.sets[state.currentSetIndex];
  if (gameWinner === 1) {
    currentSet.gamesP1 += 1;
  } else {
    currentSet.gamesP2 += 1;
  }

  // Reset game points
  state.pointsP1 = 0;
  state.pointsP2 = 0;
  state.displayScoreP1 = '0';
  state.displayScoreP2 = '0';
  state.serverSide = 'deuce';

  // Switch server for next game
  state.currentServer = state.currentServer === 1 ? 2 : 1;

  const g1 = currentSet.gamesP1;
  const g2 = currentSet.gamesP2;
  const winnerName = getPlayerDisplayName(state.config, gameWinner);

  // Check Tie-break condition (6-6)
  if (g1 === 6 && g2 === 6) {
    state.isTiebreak = true;
    currentSet.tiebreakP1 = 0;
    currentSet.tiebreakP2 = 0;
    state.displayScoreP1 = '0';
    state.displayScoreP2 = '0';
    updateSituationFlags(state);

    const announcement = `Juego para ${winnerName}. Seis iguales. ¡Comienza el Tie-break! Saca ${getPlayerDisplayName(state.config, state.currentServer)}.`;
    return { nextState: state, announcement };
  }

  // Check Set Win condition: 6 or more games, and at least 2 games difference (e.g. 6-4, 7-5)
  if ((g1 >= 6 || g2 >= 6) && Math.abs(g1 - g2) >= 2) {
    currentSet.winner = g1 > g2 ? 1 : 2;
    return checkSetWinOrNext(state, currentSet.winner, false);
  }

  updateSituationFlags(state);

  const serverName = getPlayerDisplayName(state.config, state.currentServer);
  let announcement = `Juego para ${winnerName}. Marcador del set: ${g1} a ${g2}. Saque para ${serverName}.`;

  if (state.isMatchPoint) {
    announcement += ' ¡Punto de partido!';
  } else if (state.isSetPoint) {
    announcement += ' Punto de set.';
  }

  return { nextState: state, announcement };
}

function checkSetWinOrNext(state: MatchState, setWinner: 1 | 2, wasTiebreak: boolean): PointResult {
  state.isTiebreak = false;
  state.pointsP1 = 0;
  state.pointsP2 = 0;
  state.displayScoreP1 = '0';
  state.displayScoreP2 = '0';
  state.serverSide = 'deuce';

  const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
  const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;
  const winnerName = getPlayerDisplayName(state.config, setWinner);

  // Match won?
  if (setsWonP1 === state.config.setsToWin || setsWonP2 === state.config.setsToWin) {
    state.status = 'completed';
    state.winner = setsWonP1 === state.config.setsToWin ? 1 : 2;
    state.endTime = Date.now();
    const matchWinnerName = getPlayerDisplayName(state.config, state.winner);
    const setsSummary = state.sets.map((s) => `${s.gamesP1}-${s.gamesP2}`).join(', ');
    const announcement = `¡Juego, set y partido para ${matchWinnerName}! Resultado final: ${setsSummary}.`;
    return { nextState: state, announcement };
  }

  // Next set starts
  state.currentSetIndex += 1;
  state.sets.push({
    setNumber: state.currentSetIndex + 1,
    gamesP1: 0,
    gamesP2: 0,
  });

  // Decide if super tie-break for deciding set
  if (
    state.config.sport === 'tennis' &&
    state.config.superTiebreak &&
    state.currentSetIndex === (state.config.setsToWin * 2 - 2) // deciding set in best of 3
  ) {
    state.isTiebreak = true;
    state.isSuperTiebreak = true;
    state.sets[state.currentSetIndex].tiebreakP1 = 0;
    state.sets[state.currentSetIndex].tiebreakP2 = 0;
  }

  updateSituationFlags(state);

  const prevSet = state.sets[state.currentSetIndex - 1];
  const nextServer = getPlayerDisplayName(state.config, state.currentServer);
  const announcement = `Set para ${winnerName}, ${prevSet.gamesP1} a ${prevSet.gamesP2}${wasTiebreak ? ' en desempate' : ''}. Sets: ${setsWonP1} a ${setsWonP2}. Comienza el siguiente set. Saque para ${nextServer}.`;

  return { nextState: state, announcement };
}

function formatRacketDisplayScore(points: number): string {
  if (points <= 3) {
    return TENNIS_POINTS[points];
  }
  if (points === 4) {
    return 'AD';
  }
  return '0';
}

function buildRacketPointAnnouncement(state: MatchState, _scorer: 1 | 2): string {
  const p1 = state.pointsP1;
  const p2 = state.pointsP2;
  const isPadel = state.config.sport === 'padel';
  const goldenPoint = isPadel && state.config.padelDeuceRule === 'golden_point';

  // 40-40 Deuce situation
  if (p1 === 3 && p2 === 3) {
    if (goldenPoint) {
      return 'Cuarenta iguales. ¡Punto de oro! La pareja receptora elige el lado de saque.';
    }
    return 'Cuarenta iguales. Iguales.';
  }

  // Advantage
  if (p1 === 4) {
    const p1Name = getPlayerDisplayName(state.config, 1);
    return `Ventaja para ${p1Name}.`;
  }
  if (p2 === 4) {
    const p2Name = getPlayerDisplayName(state.config, 2);
    return `Ventaja para ${p2Name}.`;
  }

  // Standard point score:
  // Server score is always announced first in official referee rules
  const serverIsP1 = state.currentServer === 1;
  const serverPts = serverIsP1 ? p1 : p2;
  const receiverPts = serverIsP1 ? p2 : p1;

  let scoreText = '';
  if (serverPts === receiverPts) {
    if (serverPts === 1) scoreText = 'Quince iguales';
    else if (serverPts === 2) scoreText = 'Treinta iguales';
    else scoreText = 'Cero iguales';
  } else {
    const sName = formatPointsToWord(serverPts);
    const rName = formatPointsToWord(receiverPts);
    scoreText = `${sName} - ${rName}`;
  }

  // Situational additions
  if (state.isMatchPoint) {
    scoreText += '. ¡Punto de partido!';
  } else if (state.isSetPoint) {
    scoreText += '. Punto de set.';
  } else if (state.isBreakPoint) {
    scoreText += '. Punto de quiebre.';
  }

  return scoreText;
}

function formatPointsToWord(points: number): string {
  switch (points) {
    case 0:
      return 'Cero';
    case 1:
      return 'Quince';
    case 2:
      return 'Treinta';
    case 3:
      return 'Cuarenta';
    case 4:
      return 'Ventaja';
    default:
      return points.toString();
  }
}

function formatScoreAnnouncement(state: MatchState): string {
  if (state.config.sport === 'pingpong') {
    return `${state.pointsP1} a ${state.pointsP2}`;
  }
  if (state.isTiebreak) {
    const s = state.sets[state.currentSetIndex];
    return `Desempate ${s.tiebreakP1 || 0} a ${s.tiebreakP2 || 0}`;
  }
  return `${state.displayScoreP1} a ${state.displayScoreP2}`;
}

export function updateSituationFlags(state: MatchState) {
  state.isGoldenPoint = false;
  state.isBreakPoint = false;
  state.isSetPoint = false;
  state.isMatchPoint = false;

  if (state.status === 'completed') return;

  const currentSet = state.sets[state.currentSetIndex];
  if (!currentSet) return;

  if (state.config.sport === 'pingpong') {
    const p1 = state.pointsP1;
    const p2 = state.pointsP2;
    const target = state.config.pingPongPointsToWin;

    const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
    const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;

    // Check set point / match point
    if (p1 >= target - 1 && p1 > p2) {
      if (setsWonP1 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    } else if (p2 >= target - 1 && p2 > p1) {
      if (setsWonP2 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    }
    return;
  }

  // Padel / Tennis
  if (state.isTiebreak) {
    const tb1 = currentSet.tiebreakP1 || 0;
    const tb2 = currentSet.tiebreakP2 || 0;
    const target = state.isSuperTiebreak ? 10 : state.config.tiebreakPoints;

    const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
    const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;

    if (tb1 >= target - 1 && tb1 > tb2) {
      if (setsWonP1 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    } else if (tb2 >= target - 1 && tb2 > tb1) {
      if (setsWonP2 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    }
    return;
  }

  const p1 = state.pointsP1;
  const p2 = state.pointsP2;
  const isPadel = state.config.sport === 'padel';
  const goldenPoint = isPadel && state.config.padelDeuceRule === 'golden_point';

  if (p1 === 3 && p2 === 3 && goldenPoint) {
    state.isGoldenPoint = true;
  }

  // Break point check (when receiver has game point)
  const server = state.currentServer;
  const receiver = server === 1 ? 2 : 1;
  const receiverPoints = receiver === 1 ? p1 : p2;
  const serverPoints = server === 1 ? p1 : p2;

  const receiverHasGamePoint =
    (receiverPoints === 3 && serverPoints < 3) ||
    (receiverPoints === 4) ||
    (goldenPoint && receiverPoints === 3 && serverPoints === 3);

  if (receiverHasGamePoint) {
    state.isBreakPoint = true;
  }

  // Check Set point / Match point in current game
  const g1 = currentSet.gamesP1;
  const g2 = currentSet.gamesP2;
  const setsWonP1 = state.sets.filter((s) => s.winner === 1).length;
  const setsWonP2 = state.sets.filter((s) => s.winner === 2).length;

  const p1HasGamePoint = (p1 === 3 && p2 < 3) || p1 === 4 || (goldenPoint && p1 === 3 && p2 === 3);
  const p2HasGamePoint = (p2 === 3 && p1 < 3) || p2 === 4 || (goldenPoint && p1 === 3 && p2 === 3);

  if (p1HasGamePoint) {
    // If winning this game wins the set:
    if (g1 >= 5 && g1 + 1 - g2 >= 2) {
      if (setsWonP1 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    }
  } else if (p2HasGamePoint) {
    if (g2 >= 5 && g2 + 1 - g1 >= 2) {
      if (setsWonP2 === state.config.setsToWin - 1) {
        state.isMatchPoint = true;
      } else {
        state.isSetPoint = true;
      }
    }
  }
}

export function getPlayerDisplayName(config: MatchConfig, playerNumber: 1 | 2): string {
  const p = playerNumber === 1 ? config.player1 : config.player2;
  if (config.mode === 'doubles' && p.partnerName) {
    return `${p.name} y ${p.partnerName}`;
  }
  return p.name;
}

export function getWinnerName(state: MatchState): string {
  if (!state.winner) return '';
  return getPlayerDisplayName(state.config, state.winner);
}
