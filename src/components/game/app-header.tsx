"use client";

import { Clapperboard, Info, RotateCcw } from "lucide-react";
import Image from "next/image";

import { OfflineStatus } from "@/components/game/offline-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GameState } from "@/lib/game";

interface AppHeaderProps {
  game?: GameState | null;
  onReset?: () => void;
}

function CreditsDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-9 px-2.5" />}>
        <Info aria-hidden="true" />
        <span className="hidden sm:inline">Créditos</span>
        <span className="sr-only sm:hidden">Créditos</span>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-foreground/10 bg-card p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Créditos y datos</DialogTitle>
          <DialogDescription className="leading-6 text-balance">
            Los títulos se enriquecen durante el build y se guardan dentro de la app. Durante la
            partida no se envía ninguna petición externa.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-background p-4">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image src="/tmdb.svg" alt="TMDB" width={108} height={14} />
          </a>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ onReset }: { onReset: () => void }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-9 px-2.5" />}>
        <RotateCcw aria-hidden="true" />
        <span className="hidden sm:inline">Nueva</span>
        <span className="sr-only sm:hidden">Nueva partida</span>
      </DialogTrigger>
      <DialogContent className="max-w-sm border border-foreground/10 bg-card p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">¿Empezar otra partida?</DialogTitle>
          <DialogDescription className="leading-6">
            Se borrarán el turno actual y el marcador de esta partida.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-6 -mb-6 px-6">
          <DialogClose render={<Button variant="outline" />}>Seguir jugando</DialogClose>
          <DialogClose render={<Button variant="destructive" onClick={onReset} />}>
            Empezar de cero
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppHeader({ game, onReset }: AppHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-foreground bg-secondary shadow-[3px_3px_0_var(--foreground)]">
          <Clapperboard className="size-5" strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-base leading-none font-black tracking-tight sm:text-lg">
            Adivina la peli
          </p>
          {game ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Ronda {game.round} de {game.settings.rounds}
            </p>
          ) : (
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">Mímica de cine</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden md:block">
          <OfflineStatus />
        </div>
        {game && onReset ? <ResetDialog onReset={onReset} /> : null}
        <CreditsDialog />
      </div>
    </header>
  );
}
