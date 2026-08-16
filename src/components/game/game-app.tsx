"use client";

import { Clapperboard } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/game/app-header";
import {
  GameOverScreen,
  HandoffScreen,
  PlayingScreen,
  TurnSummaryScreen,
} from "@/components/game/game-screens";
import { SetupScreen } from "@/components/game/setup-screen";
import {
  continueGame,
  createGame,
  currentMovie,
  finishTurn,
  isGameState,
  scoreCard,
  startTurn,
  type GameSettings,
  type GameState,
} from "@/lib/game";
import type { Movie } from "@/lib/types";

const STORAGE_KEY = "adivinalapeli:game:v1";

function LoadingScreen() {
  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="grid min-h-[70svh] place-items-center px-4 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border-2 border-foreground bg-secondary shadow-[4px_4px_0_var(--foreground)]">
            <Clapperboard className="size-6 motion-safe:animate-pulse" aria-hidden="true" />
          </span>
          <p className="mt-5 font-heading text-lg font-black">Preparando la sala…</p>
        </div>
      </main>
    </div>
  );
}

export function GameApp({ movies }: { movies: Movie[] }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const commitGame = useCallback((update: (current: GameState | null) => GameState | null) => {
    setGame((current) => {
      const next = update(current);
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isGameState(parsed)) setGame(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const movie = useMemo(() => (game ? currentMovie(game, movies) : null), [game, movies]);

  const endTurn = useCallback(() => {
    commitGame((current) => (current ? finishTurn(current) : current));
  }, [commitGame]);

  function beginGame(settings: GameSettings) {
    commitGame(() => createGame(settings, movies));
  }

  function resetGame() {
    commitGame(() => null);
  }

  function rematch() {
    commitGame((current) => (current ? createGame(current.settings, movies) : current));
  }

  if (!hydrated) return <LoadingScreen />;
  if (!game) return <SetupScreen movies={movies} onStart={beginGame} />;

  return (
    <div className="min-h-svh">
      <AppHeader game={game} onReset={resetGame} />
      {game.phase === "handoff" ? (
        <HandoffScreen
          game={game}
          onStart={() => commitGame((current) => (current ? startTurn(current) : current))}
        />
      ) : null}
      {game.phase === "playing" && movie ? (
        <PlayingScreen
          game={game}
          movie={movie}
          onCorrect={() =>
            commitGame((current) => (current ? scoreCard(current, "correct") : current))
          }
          onPass={() => commitGame((current) => (current ? scoreCard(current, "pass") : current))}
          onTimeUp={endTurn}
        />
      ) : null}
      {game.phase === "summary" ? (
        <TurnSummaryScreen
          game={game}
          onContinue={() => commitGame((current) => (current ? continueGame(current) : current))}
        />
      ) : null}
      {game.phase === "finished" ? (
        <GameOverScreen game={game} onRematch={rematch} onReset={resetGame} />
      ) : null}
    </div>
  );
}
