import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MOVIE_SEEDS, type MovieSeed } from "../src/data/movie-seeds";
import type { Movie, MovieCatalog, ThemeId } from "../src/lib/types";

const OUTPUT_PATH = path.join(process.cwd(), "src/data/movies.generated.json");
const REFRESH_AFTER_DAYS = 150;
const CONCURRENCY = 6;

interface TmdbMovieResponse {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
}

function decadeTheme(year: number): ThemeId {
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "90s";
  return "80s";
}

function fallbackMovie(seed: MovieSeed): Movie {
  return {
    id: seed.tmdbId,
    title: seed.fallbackTitle,
    originalTitle: seed.fallbackTitle,
    year: seed.fallbackYear,
    runtime: null,
    genres: [],
    emoji: seed.emoji,
    themes: ["mix", decadeTheme(seed.fallbackYear), ...seed.tags],
    tmdbUrl: `https://www.themoviedb.org/movie/${seed.tmdbId}`,
    source: "fallback",
  };
}

async function fetchMovie(seed: MovieSeed, apiKey: string): Promise<Movie> {
  const endpoint = new URL(`https://api.themoviedb.org/3/movie/${seed.tmdbId}`);
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("language", "es-ES");

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`TMDB respondió con ${response.status}`);
  }

  const data = (await response.json()) as TmdbMovieResponse;
  const year = Number.parseInt(data.release_date?.slice(0, 4) ?? "", 10) || seed.fallbackYear;

  return {
    id: seed.tmdbId,
    title: data.title?.trim() || seed.fallbackTitle,
    originalTitle: data.original_title?.trim() || seed.fallbackTitle,
    year,
    runtime: typeof data.runtime === "number" ? data.runtime : null,
    genres: data.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
    emoji: seed.emoji,
    themes: ["mix", decadeTheme(year), ...seed.tags],
    tmdbUrl: `https://www.themoviedb.org/movie/${seed.tmdbId}`,
    source: "tmdb",
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const result: R[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return result;
}

async function readExistingCatalog(): Promise<MovieCatalog | null> {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as MovieCatalog;
  } catch {
    return null;
  }
}

function isFresh(catalog: MovieCatalog): boolean {
  if (!catalog.generatedAt) return false;
  const age = Date.now() - new Date(catalog.generatedAt).getTime();
  return age < REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1_000;
}

async function main() {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const force = process.argv.includes("--force");
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const existing = await readExistingCatalog();

  if (existing && !force && (isFresh(existing) || !apiKey)) {
    const freshness = isFresh(existing) ? "vigente" : "sin clave para renovarlo";
    console.log(`Catálogo local ${freshness}: ${existing.movies.length} películas.`);
    return;
  }

  let movies: Movie[];
  let generatedAt: string | null = null;

  if (apiKey) {
    console.log(`Actualizando ${MOVIE_SEEDS.length} películas desde TMDB…`);
    movies = await mapConcurrent(MOVIE_SEEDS, CONCURRENCY, async (seed) => {
      try {
        return await fetchMovie(seed, apiKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "error desconocido";
        console.warn(`TMDB ${seed.tmdbId}: ${message}. Se usa el título de respaldo.`);
        return fallbackMovie(seed);
      }
    });
    generatedAt = new Date().toISOString();
  } else {
    console.warn("TMDB_API_KEY no está definida. Generando el catálogo de respaldo con emojis.");
    movies = MOVIE_SEEDS.map(fallbackMovie);
  }

  const tmdbCount = movies.filter((movie) => movie.source === "tmdb").length;
  const source: MovieCatalog["source"] =
    tmdbCount === movies.length ? "tmdb" : tmdbCount === 0 ? "fallback" : "mixed";
  const refreshAfter = generatedAt
    ? new Date(
        new Date(generatedAt).getTime() + REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1_000,
      ).toISOString()
    : null;

  const catalog: MovieCatalog = {
    version: 1,
    generatedAt,
    refreshAfter,
    source,
    movies,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Catálogo guardado: ${movies.length} películas (${source}).`);
}

await main();
