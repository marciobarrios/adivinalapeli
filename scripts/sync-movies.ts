import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { MOVIE_SEEDS, type MovieSeed } from "../src/data/movie-seeds";
import type { Movie, MovieCatalog, ThemeId } from "../src/lib/types";

const OUTPUT_PATH = path.join(process.cwd(), "src/data/movies.generated.json");
const POSTER_DIRECTORY = path.join(process.cwd(), "public/posters");
const CATALOG_VERSION = 2;
const REFRESH_AFTER_DAYS = 150;
const CONCURRENCY = 6;
const PREFERRED_POSTER_SIZE = "w342";
const DEFAULT_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

interface TmdbMovieResponse {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;
}

interface TmdbConfigurationResponse {
  images?: {
    secure_base_url?: string;
    poster_sizes?: string[];
  };
}

interface ImageConfiguration {
  baseUrl: string;
  posterSize: string;
}

type StoredMovie = Omit<Movie, "posterPath"> & { posterPath?: string | null };

type StoredCatalog = Omit<MovieCatalog, "version" | "movies"> & {
  version?: number;
  movies: StoredMovie[];
};

function normalizeMovie(movie: StoredMovie): Movie {
  return { ...movie, posterPath: movie.posterPath ?? null };
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
    posterPath: null,
    emoji: seed.emoji,
    themes: ["mix", decadeTheme(seed.fallbackYear), ...seed.tags],
    tmdbUrl: `https://www.themoviedb.org/movie/${seed.tmdbId}`,
    source: "fallback",
  };
}

async function fetchImageConfiguration(apiKey: string): Promise<ImageConfiguration> {
  const endpoint = new URL("https://api.themoviedb.org/3/configuration");
  endpoint.searchParams.set("api_key", apiKey);

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`TMDB configuración respondió con ${response.status}`);

  const data = (await response.json()) as TmdbConfigurationResponse;
  const baseUrl = data.images?.secure_base_url;
  const sizes = data.images?.poster_sizes ?? [];
  if (!baseUrl) throw new Error("TMDB no devolvió una URL base para imágenes");

  const posterSize = sizes.includes(PREFERRED_POSTER_SIZE)
    ? PREFERRED_POSTER_SIZE
    : sizes.includes("w500")
      ? "w500"
      : "original";

  return { baseUrl, posterSize };
}

function posterFileDetails(movieId: number, remotePath: string) {
  const remoteExtension = path.extname(remotePath).toLowerCase();
  const extension = [".jpg", ".jpeg", ".png", ".webp"].includes(remoteExtension)
    ? remoteExtension
    : ".jpg";
  const filename = `${movieId}${extension}`;
  return {
    absolutePath: path.join(POSTER_DIRECTORY, filename),
    publicPath: `/posters/${filename}`,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadPoster(
  movieId: number,
  remotePath: string,
  configuration: ImageConfiguration,
): Promise<string> {
  const { absolutePath, publicPath } = posterFileDetails(movieId, remotePath);
  const imageUrl = new URL(
    `${configuration.posterSize}/${remotePath.replace(/^\/+/, "")}`,
    configuration.baseUrl,
  );
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });

  if (!response.ok) throw new Error(`imagen respondió con ${response.status}`);
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("la respuesta de la portada no es una imagen");
  }

  await mkdir(POSTER_DIRECTORY, { recursive: true });
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
  await rename(temporaryPath, absolutePath);
  return publicPath;
}

async function fetchMovie(
  seed: MovieSeed,
  apiKey: string,
  imageConfiguration: ImageConfiguration,
  existingMovie?: StoredMovie,
): Promise<Movie> {
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
  let posterPath: string | null = null;

  if (data.poster_path) {
    try {
      posterPath = await downloadPoster(seed.tmdbId, data.poster_path, imageConfiguration);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      const previousPosterPath = existingMovie?.posterPath;
      const previousAbsolutePath = previousPosterPath
        ? path.join(process.cwd(), "public", previousPosterPath.replace(/^\/+/, ""))
        : null;
      if (previousPosterPath && previousAbsolutePath && (await fileExists(previousAbsolutePath))) {
        posterPath = previousPosterPath;
        console.warn(`Portada TMDB ${seed.tmdbId}: ${message}. Se conserva la copia local.`);
      } else {
        console.warn(`Portada TMDB ${seed.tmdbId}: ${message}. Se usará la pista emoji.`);
      }
    }
  }

  return {
    id: seed.tmdbId,
    title: data.title?.trim() || seed.fallbackTitle,
    originalTitle: data.original_title?.trim() || seed.fallbackTitle,
    year,
    runtime: typeof data.runtime === "number" ? data.runtime : null,
    genres: data.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
    posterPath,
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

async function readExistingCatalog(): Promise<StoredCatalog | null> {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as StoredCatalog;
  } catch {
    return null;
  }
}

function isFresh(catalog: StoredCatalog): boolean {
  if (!catalog.generatedAt) return false;
  const age = Date.now() - new Date(catalog.generatedAt).getTime();
  return age < REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1_000;
}

async function hasCurrentPosterCatalog(catalog: StoredCatalog): Promise<boolean> {
  if (catalog.version !== CATALOG_VERSION) return false;
  if (catalog.source === "fallback") return false;
  if (catalog.movies.some((movie) => !("posterPath" in movie))) return false;

  const posterChecks = catalog.movies
    .map((movie) => movie.posterPath)
    .filter((posterPath): posterPath is string => Boolean(posterPath))
    .map((posterPath) =>
      fileExists(path.join(process.cwd(), "public", posterPath.replace(/^\/+/, ""))),
    );
  return (await Promise.all(posterChecks)).every(Boolean);
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
  const currentPosterCatalog = existing ? await hasCurrentPosterCatalog(existing) : false;

  if (existing && !force && currentPosterCatalog && isFresh(existing)) {
    console.log(`Catálogo local vigente: ${existing.movies.length} películas.`);
    return;
  }

  if (existing && !apiKey) {
    console.warn(
      `TMDB_API_KEY no está definida. Se conserva el catálogo local de ${existing.movies.length} películas y se usarán emojis donde falte una portada.`,
    );
    return;
  }

  let movies: Movie[];
  let generatedAt: string | null = null;

  if (apiKey) {
    let imageConfiguration: ImageConfiguration;
    try {
      imageConfiguration = await fetchImageConfiguration(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      console.warn(`Configuración de imágenes TMDB: ${message}. Se usa la ruta CDN estándar.`);
      imageConfiguration = {
        baseUrl: DEFAULT_IMAGE_BASE_URL,
        posterSize: PREFERRED_POSTER_SIZE,
      };
    }

    const existingById = new Map(existing?.movies.map((movie) => [movie.id, movie]));
    console.log(`Actualizando ${MOVIE_SEEDS.length} películas desde TMDB…`);
    movies = await mapConcurrent(MOVIE_SEEDS, CONCURRENCY, async (seed) => {
      try {
        return await fetchMovie(seed, apiKey, imageConfiguration, existingById.get(seed.tmdbId));
      } catch (error) {
        const message = error instanceof Error ? error.message : "error desconocido";
        const existingMovie = existingById.get(seed.tmdbId);
        console.warn(
          `TMDB ${seed.tmdbId}: ${message}. ${
            existingMovie ? "Se conserva la copia local." : "Se usa el respaldo con emoji."
          }`,
        );
        return existingMovie ? normalizeMovie(existingMovie) : fallbackMovie(seed);
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
    version: CATALOG_VERSION,
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
