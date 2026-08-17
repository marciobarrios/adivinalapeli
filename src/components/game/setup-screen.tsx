"use client";

import { ArrowRight, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/game/app-header";
import { OfflineStatus } from "@/components/game/offline-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { THEMES } from "@/data/themes";
import type { GameSettings } from "@/lib/game";
import type { Movie, ThemeId } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_NAMES = ["Equipo Claqueta", "Equipo Palomitas"];

interface SetupScreenProps {
  movies: Movie[];
  onStart: (settings: GameSettings) => void;
}

function SegmentedChoice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1.5">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "ghost"}
            className={cn("h-10", value === option.value && "shadow-sm")}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export function SetupScreen({ movies, onStart }: SetupScreenProps) {
  const [participantNames, setParticipantNames] = useState(DEFAULT_NAMES);
  const [themeId, setThemeId] = useState<ThemeId>("mix");
  const [rounds, setRounds] = useState(3);
  const [secondsPerTurn, setSecondsPerTurn] = useState(60);

  const themeCounts = useMemo(
    () =>
      Object.fromEntries(
        THEMES.map((theme) => [
          theme.id,
          movies.filter((movie) => movie.themes.includes(theme.id)).length,
        ]),
      ) as Record<ThemeId, number>,
    [movies],
  );

  function updateName(index: number, value: string) {
    setParticipantNames((current) =>
      current.map((name, itemIndex) => (itemIndex === index ? value : name)),
    );
  }

  function addParticipant() {
    setParticipantNames((current) => [...current, `Equipo ${current.length + 1}`]);
  }

  function removeParticipant(index: number) {
    setParticipantNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function submitGame() {
    const cleanNames = participantNames.map((name, index) => name.trim() || `Equipo ${index + 1}`);
    onStart({ participantNames: cleanNames, themeId, rounds, secondsPerTurn });
  }

  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mb-5 md:hidden">
          <OfflineStatus />
        </div>

        <section className="grid items-end gap-8 border-b-2 border-foreground/15 pt-4 pb-9 lg:grid-cols-[1.2fr_0.8fr] lg:pt-10">
          <div>
            <Badge className="mb-5 h-7 gap-1.5 bg-secondary text-secondary-foreground">
              <Sparkles aria-hidden="true" />
              De 2 a 4 equipos
            </Badge>
            <h1 className="max-w-3xl font-heading text-5xl leading-[0.95] font-black tracking-[-0.055em] text-balance sm:text-7xl">
              La peli está en tus manos.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-7 text-pretty text-muted-foreground sm:text-xl">
              Elige una temática, pasa el móvil y consigue que tu gente adivine cada película usando
              solo mímica.
            </p>
          </div>
          <ol className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["1", "Una temática para toda la partida"],
              ["2", "Un turno por equipo y ronda"],
              ["3", "Cada acierto suma un punto"],
            ].map(([number, text]) => (
              <li
                key={number}
                className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                  {number}
                </span>
                <span className="leading-5 font-medium">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 pt-7 lg:grid-cols-[0.78fr_1.22fr] lg:grid-rows-[auto_auto] lg:items-start">
          <Card className="order-1 border border-foreground/10 bg-card shadow-[0_14px_40px_-30px_var(--foreground)] lg:col-start-1 lg:row-start-1">
            <CardHeader>
              <CardTitle className="text-xl font-black">1. Crea los equipos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Escribe un nombre para cada equipo. Si jugáis individualmente, cada persona cuenta
                como un equipo.
              </p>

              <div className="grid gap-3">
                {participantNames.map((name, index) => (
                  <div key={index} className="grid gap-2">
                    <Label htmlFor={`participant-${index}`}>Equipo {index + 1}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`participant-${index}`}
                        value={name}
                        maxLength={28}
                        className="h-11 bg-background px-3"
                        onChange={(event) => updateName(index, event.target.value)}
                      />
                      {participantNames.length > 2 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-11 shrink-0"
                          onClick={() => removeParticipant(index)}
                        >
                          <Trash2 aria-hidden="true" />
                          <span className="sr-only">Eliminar {name}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {participantNames.length < 4 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-dashed"
                  onClick={addParticipant}
                >
                  <Plus aria-hidden="true" />
                  Añadir equipo
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="order-3 border border-foreground/10 bg-card shadow-[0_14px_40px_-30px_var(--foreground)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <CardHeader>
              <CardTitle className="text-xl font-black">3. Elige una temática</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {THEMES.map((theme) => {
                  const selected = themeId === theme.id;
                  return (
                    <Button
                      key={theme.id}
                      type="button"
                      variant="outline"
                      aria-pressed={selected}
                      onClick={() => setThemeId(theme.id)}
                      className={cn(
                        "group h-auto min-h-28 justify-start gap-3 whitespace-normal border-2 p-4 text-start transition-transform",
                        selected
                          ? "-translate-y-0.5 border-primary bg-primary/7 shadow-[4px_4px_0_var(--primary)] hover:bg-primary/10"
                          : "border-border bg-background hover:-translate-y-0.5 hover:border-foreground/30",
                      )}
                    >
                      <span className="text-3xl" aria-hidden="true">
                        {theme.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 font-heading text-base font-black">
                          {theme.name}
                          {selected ? (
                            <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                          {theme.description}
                        </span>
                        <span className="mt-2 block text-[0.7rem] font-bold tracking-wide text-primary uppercase">
                          {themeCounts[theme.id]} películas
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border-2 border-foreground bg-secondary p-4 shadow-[4px_4px_0_var(--foreground)] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                <div>
                  <p className="font-heading text-lg font-black">Todo preparado</p>
                  <p className="mt-1 text-sm leading-5 text-secondary-foreground/75">
                    {rounds} rondas · {secondsPerTurn} segundos · {participantNames.length} equipos
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="mt-4 h-12 w-full bg-foreground px-5 text-background hover:bg-foreground/85 sm:mt-0 sm:w-auto"
                  onClick={submitGame}
                >
                  Empezar partida
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="order-2 border border-foreground/10 bg-card lg:col-start-1 lg:row-start-2">
            <CardHeader>
              <CardTitle className="text-xl font-black">2. Ritmo de partida</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <SegmentedChoice
                label="Rondas"
                value={rounds}
                options={[
                  { value: 1, label: "1" },
                  { value: 3, label: "3" },
                  { value: 5, label: "5" },
                ]}
                onChange={setRounds}
              />
              <SegmentedChoice
                label="Tiempo por turno"
                value={secondsPerTurn}
                options={[
                  { value: 30, label: "30 s" },
                  { value: 60, label: "60 s" },
                  { value: 90, label: "90 s" },
                ]}
                onChange={setSecondsPerTurn}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
