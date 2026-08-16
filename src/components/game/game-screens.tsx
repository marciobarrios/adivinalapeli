"use client";

import {
  ArrowRight,
  Check,
  Clock3,
  Eye,
  FastForward,
  Flag,
  Hand,
  PartyPopper,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { THEMES } from "@/data/themes";
import type { GameState } from "@/lib/game";
import { sortedStandings } from "@/lib/game";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

function ScoreStrip({ game }: { game: GameState }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Marcador">
      {game.settings.participantNames.map((name, index) => (
        <div
          key={`${name}-${index}`}
          className={cn(
            "flex min-w-36 flex-1 items-center justify-between gap-3 rounded-xl border px-3 py-2",
            index === game.activeParticipantIndex
              ? "border-primary bg-primary/8"
              : "border-foreground/10 bg-card",
          )}
        >
          <span className="truncate text-xs font-bold">{name}</span>
          <span className="font-heading text-xl font-black tabular-nums">{game.scores[index]}</span>
        </div>
      ))}
    </div>
  );
}

function GameMeta({ game }: { game: GameState }) {
  const theme = THEMES.find((item) => item.id === game.settings.themeId);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge className="h-7 bg-secondary text-secondary-foreground">
        {theme?.emoji} {theme?.name}
      </Badge>
      <Badge variant="outline" className="h-7 bg-card">
        Ronda {game.round} de {game.settings.rounds}
      </Badge>
    </div>
  );
}

export function HandoffScreen({ game, onStart }: { game: GameState; onStart: () => void }) {
  const activeName = game.settings.participantNames[game.activeParticipantIndex];
  const currentTurn =
    (game.round - 1) * game.settings.participantNames.length + game.activeParticipantIndex + 1;
  const totalTurns = game.settings.rounds * game.settings.participantNames.length;

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-5 px-4 pt-4 pb-12 sm:px-6 sm:pt-8">
      <GameMeta game={game} />
      <ScoreStrip game={game} />

      <Card className="mt-2 border-2 border-foreground bg-card py-0 shadow-[7px_7px_0_var(--foreground)]">
        <CardContent className="grid min-h-[28rem] place-items-center px-6 py-10 text-center sm:px-10">
          <div className="max-w-xl">
            <span
              className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-3xl"
              aria-hidden="true"
            >
              🙈
            </span>
            <p className="mt-6 text-sm font-black tracking-[0.18em] text-primary uppercase">
              Turno {currentTurn} de {totalTurns}
            </p>
            <h1 className="mt-3 font-heading text-4xl leading-tight font-black tracking-tight text-balance sm:text-6xl">
              Pasa el móvil a {activeName}
            </h1>
            <p className="mx-auto mt-4 max-w-md leading-7 text-pretty text-muted-foreground">
              Que nadie más mire la pantalla. La primera película aparecerá cuando confirme que está
              listo.
            </p>

            <div className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-2 text-xs font-bold">
              <span className="rounded-xl bg-muted p-3">
                <X className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" />
                Sin palabras
              </span>
              <span className="rounded-xl bg-muted p-3">
                <Hand className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" />
                Solo gestos
              </span>
              <span className="rounded-xl bg-muted p-3">
                <Clock3 className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" />
                {game.settings.secondsPerTurn} segundos
              </span>
            </div>

            <Button
              className="mt-8 h-14 w-full text-base font-black sm:w-auto sm:min-w-64"
              size="lg"
              onClick={onStart}
            >
              <Eye aria-hidden="true" />
              Estoy listo
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function secondsUntil(timestamp: number | null) {
  if (!timestamp) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1_000));
}

export function PlayingScreen({
  game,
  movie,
  onCorrect,
  onPass,
  onTimeUp,
}: {
  game: GameState;
  movie: Movie;
  onCorrect: () => void;
  onPass: () => void;
  onTimeUp: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(game.turnEndsAt));

  useEffect(() => {
    const updateTimer = () => {
      const next = secondsUntil(game.turnEndsAt);
      setSecondsLeft(next);
      if (next === 0) onTimeUp();
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timer);
  }, [game.turnEndsAt, onTimeUp]);

  function vibrate(pattern: number | number[]) {
    navigator.vibrate?.(pattern);
  }

  const timerPercentage = (secondsLeft / game.settings.secondsPerTurn) * 100;
  const urgent = secondsLeft <= 10;

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-4 px-4 pt-2 pb-8 sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Turno de
          </p>
          <p className="font-heading text-xl font-black">
            {game.settings.participantNames[game.activeParticipantIndex]}
          </p>
        </div>
        <div
          className={cn(
            "flex min-w-24 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2 font-heading text-3xl font-black tabular-nums",
            urgent
              ? "border-primary bg-primary text-primary-foreground"
              : "border-foreground bg-card",
          )}
          aria-label={`${secondsLeft} segundos restantes`}
          aria-live={urgent ? "polite" : "off"}
          role="timer"
        >
          <Clock3 className="size-5" aria-hidden="true" />
          {secondsLeft}
        </div>
      </div>

      <Progress
        value={timerPercentage}
        aria-label="Tiempo restante"
        className={cn(
          "[&_[data-slot=progress-track]]:h-2",
          urgent && "[&_[data-slot=progress-indicator]]:bg-secondary",
        )}
      />

      <Card className="relative flex-1 overflow-visible border-2 border-foreground bg-card py-0 shadow-[7px_7px_0_var(--foreground)]">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-foreground bg-secondary px-4 py-1 text-xs font-black tracking-wider whitespace-nowrap uppercase">
          Haz esta película
        </span>
        <CardContent className="grid min-h-[23rem] place-items-center px-6 py-12 text-center sm:min-h-[28rem] sm:px-12">
          <div className="max-w-2xl">
            <p className="text-5xl leading-none tracking-[0.2em] sm:text-7xl" aria-hidden="true">
              {movie.emoji}
            </p>
            <span className="sr-only">Pista emoji: {movie.emoji}</span>
            <h1 className="mt-8 font-heading text-4xl leading-[1.04] font-black tracking-[-0.04em] text-balance sm:text-6xl">
              {movie.title}
            </h1>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="bg-background">
                {movie.year}
              </Badge>
              {movie.genres.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="outline" className="bg-background">
                  {genre}
                </Badge>
              ))}
              {movie.source === "fallback" ? (
                <Badge variant="secondary">Pista offline</Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 pt-2">
        <Button
          variant="outline"
          className="h-16 border-2 text-base font-black"
          onClick={() => {
            vibrate(30);
            onPass();
          }}
        >
          <FastForward aria-hidden="true" />
          Pasar
        </Button>
        <Button
          className="h-16 bg-emerald-700 text-base font-black text-white hover:bg-emerald-800"
          onClick={() => {
            vibrate([30, 30, 60]);
            onCorrect();
          }}
        >
          <Check aria-hidden="true" />
          ¡Acertada!
        </Button>
      </div>
      <Button variant="ghost" className="mx-auto" onClick={onTimeUp}>
        <Flag aria-hidden="true" />
        Terminar turno antes
      </Button>
    </main>
  );
}

export function TurnSummaryScreen({
  game,
  onContinue,
}: {
  game: GameState;
  onContinue: () => void;
}) {
  const names = game.settings.participantNames;
  const isLastParticipant = game.activeParticipantIndex === names.length - 1;
  const gameEnds = isLastParticipant && game.round === game.settings.rounds;
  const nextName = isLastParticipant ? names[0] : names[game.activeParticipantIndex + 1];

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 pt-4 pb-12 sm:px-6 sm:pt-10">
      <GameMeta game={game} />
      <Card className="border-2 border-foreground bg-card py-0 shadow-[7px_7px_0_var(--foreground)]">
        <CardContent className="px-6 py-9 text-center sm:px-10 sm:py-12">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
            <PartyPopper className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-bold tracking-wider text-primary uppercase">
            Fin del turno
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight sm:text-5xl">
            {game.settings.participantNames[game.activeParticipantIndex]}
          </h1>

          <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-100 p-5 text-emerald-950">
              <p className="font-heading text-4xl font-black tabular-nums">+{game.turnScore}</p>
              <p className="mt-1 text-xs font-bold uppercase">Aciertos</p>
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <p className="font-heading text-4xl font-black tabular-nums">{game.turnPasses}</p>
              <p className="mt-1 text-xs font-bold uppercase">Pasadas</p>
            </div>
          </div>

          <Separator className="my-7" />
          <ScoreStrip game={game} />

          <p className="mt-7 text-sm text-muted-foreground">
            {gameEnds ? "La partida ha terminado." : `Ahora le toca a ${nextName}.`}
          </p>
          <Button
            className="mt-4 h-13 w-full text-base font-black sm:w-auto sm:min-w-64"
            onClick={onContinue}
          >
            {gameEnds ? <Trophy aria-hidden="true" /> : <Play aria-hidden="true" />}
            {gameEnds ? "Ver resultado" : "Siguiente turno"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export function GameOverScreen({
  game,
  onRematch,
  onReset,
}: {
  game: GameState;
  onRematch: () => void;
  onReset: () => void;
}) {
  const standings = sortedStandings(game);
  const bestScore = standings[0]?.score ?? 0;
  const winners = standings.filter((participant) => participant.score === bestScore);
  const winnerText =
    winners.length > 1
      ? `Empate entre ${winners.map((winner) => winner.name).join(" y ")}`
      : `${winners[0]?.name} gana`;

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 pt-4 pb-12 sm:px-6 sm:pt-10">
      <GameMeta game={game} />
      <Card className="relative overflow-visible border-2 border-foreground bg-card py-0 shadow-[8px_8px_0_var(--foreground)]">
        <span
          className="absolute -top-4 left-5 text-3xl motion-safe:animate-bounce"
          aria-hidden="true"
        >
          🎉
        </span>
        <span
          className="absolute -top-5 right-7 text-3xl [animation-delay:180ms] motion-safe:animate-bounce"
          aria-hidden="true"
        >
          🍿
        </span>
        <CardContent className="px-6 py-10 text-center sm:px-12 sm:py-14">
          <span className="mx-auto grid size-20 place-items-center rounded-full border-2 border-foreground bg-secondary shadow-[4px_4px_0_var(--foreground)]">
            <Trophy className="size-9" aria-hidden="true" />
          </span>
          <Badge className="mt-7 bg-primary text-primary-foreground">Fin de la película</Badge>
          <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-balance sm:text-6xl">
            {winnerText}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {bestScore} {bestScore === 1 ? "película acertada" : "películas acertadas"}
          </p>

          <div className="mx-auto mt-8 grid max-w-lg gap-2 text-start">
            {standings.map((participant, index) => (
              <div
                key={`${participant.name}-${participant.originalIndex}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3",
                  index === 0
                    ? "border-secondary bg-secondary/25"
                    : "border-foreground/10 bg-background",
                )}
              >
                <span className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-black text-background">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{participant.name}</span>
                <span className="font-heading text-2xl font-black tabular-nums">
                  {participant.score}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-13 border-2 font-black" onClick={onReset}>
              <Sparkles aria-hidden="true" />
              Cambiar ajustes
            </Button>
            <Button className="h-13 font-black" onClick={onRematch}>
              <RotateCcw aria-hidden="true" />
              Revancha
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
