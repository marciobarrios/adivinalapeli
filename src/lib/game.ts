import type { Movie, ThemeId } from "@/lib/types";

export type GameMode = "teams" | "people";
export type GamePhase = "handoff" | "playing" | "summary" | "finished";

export interface GameSettings {
  mode: GameMode;
  participantNames: string[];
  themeId: ThemeId;
  rounds: number;
  secondsPerTurn: number;
}

export interface GameState {
  version: 1;
  phase: GamePhase;
  settings: GameSettings;
  scores: number[];
  round: number;
  activeParticipantIndex: number;
  deck: number[];
  deckCursor: number;
  turnScore: number;
  turnPasses: number;
  turnEndsAt: number | null;
}

function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function createGame(settings: GameSettings, movies: Movie[]): GameState {
  const eligibleIds = movies
    .filter((movie) => movie.themes.includes(settings.themeId))
    .map((movie) => movie.id);

  if (eligibleIds.length === 0) {
    throw new Error("No hay películas disponibles para esta temática.");
  }

  return {
    version: 1,
    phase: "handoff",
    settings,
    scores: settings.participantNames.map(() => 0),
    round: 1,
    activeParticipantIndex: 0,
    deck: shuffle(eligibleIds),
    deckCursor: 0,
    turnScore: 0,
    turnPasses: 0,
    turnEndsAt: null,
  };
}

export function startTurn(game: GameState): GameState {
  if (game.phase !== "handoff") return game;
  return {
    ...game,
    phase: "playing",
    turnEndsAt: Date.now() + game.settings.secondsPerTurn * 1_000,
  };
}

function advanceDeck(game: GameState): Pick<GameState, "deck" | "deckCursor"> {
  if (game.deckCursor + 1 < game.deck.length) {
    return { deck: game.deck, deckCursor: game.deckCursor + 1 };
  }

  const nextDeck = shuffle(game.deck);
  if (nextDeck.length > 1 && nextDeck[0] === game.deck[game.deckCursor]) {
    [nextDeck[0], nextDeck[1]] = [nextDeck[1], nextDeck[0]];
  }
  return { deck: nextDeck, deckCursor: 0 };
}

export function scoreCard(game: GameState, result: "correct" | "pass"): GameState {
  if (game.phase !== "playing") return game;

  const nextScores = [...game.scores];
  if (result === "correct") nextScores[game.activeParticipantIndex] += 1;

  return {
    ...game,
    ...advanceDeck(game),
    scores: nextScores,
    turnScore: game.turnScore + (result === "correct" ? 1 : 0),
    turnPasses: game.turnPasses + (result === "pass" ? 1 : 0),
  };
}

export function finishTurn(game: GameState): GameState {
  if (game.phase !== "playing") return game;
  return { ...game, phase: "summary", turnEndsAt: null };
}

export function continueGame(game: GameState): GameState {
  if (game.phase !== "summary") return game;

  const isLastParticipant =
    game.activeParticipantIndex === game.settings.participantNames.length - 1;
  const isLastRound = game.round === game.settings.rounds;

  if (isLastParticipant && isLastRound) {
    return { ...game, phase: "finished" };
  }

  return {
    ...game,
    phase: "handoff",
    round: isLastParticipant ? game.round + 1 : game.round,
    activeParticipantIndex: isLastParticipant ? 0 : game.activeParticipantIndex + 1,
    turnScore: 0,
    turnPasses: 0,
    turnEndsAt: null,
  };
}

export function currentMovie(game: GameState, movies: Movie[]): Movie | null {
  const movieId = game.deck[game.deckCursor];
  return movies.find((movie) => movie.id === movieId) ?? null;
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  return (
    candidate.version === 1 &&
    ["handoff", "playing", "summary", "finished"].includes(candidate.phase ?? "") &&
    Array.isArray(candidate.scores) &&
    Array.isArray(candidate.deck) &&
    typeof candidate.round === "number" &&
    typeof candidate.activeParticipantIndex === "number" &&
    Boolean(candidate.settings) &&
    Array.isArray(candidate.settings?.participantNames)
  );
}

export function sortedStandings(game: GameState) {
  return game.settings.participantNames
    .map((name, index) => ({ name, score: game.scores[index], originalIndex: index }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}
